"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { User } from "lucide-react";
import Image from "next/image";

export type Track = {
  name: string;
  artists: { name: string | null }[];
};

export type Playlist = {
  name: string;
  owner?: { display_name?: string };
  images?: { url: string }[];
  tracks?: {
    items: {
      track?: {
        name?: string;
        artists?: { name?: string }[];
      };
    }[];
  };
};

interface MusicPreviewProps {
  playlist: Playlist;
}

export default function MusicPreview({ playlist }: MusicPreviewProps) {
  const [progressPct, setProgressPct] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("Aguardando");
  const evtRef = useRef<EventSource | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [showProgressUi, setShowProgressUi] = useState<boolean>(false);

  const music = {
    title: playlist?.name ?? "Playlist",
    artist: playlist?.owner?.display_name ?? "",
    thumbnail: playlist?.images?.[0]?.url ?? "",
  };

  function buildTracks(): Track[] {
    return playlist?.tracks?.items.map((item) => {
      const t = item.track;
      return {
        name: t?.name ?? "Unknown",
        artists: (t?.artists ?? []).map((a) => ({ name: a.name ?? null })),
      };
    }) ?? [];
  }

  async function startJobAndListen() {
    const tracksToSend = buildTracks();
    if (!tracksToSend.length) {
      setStatusText("Playlist vazia");
      return;
    }

    setShowProgressUi(true);
    setTimeout(() => {
      setRunning(true);
      setStatusText("Iniciando job...");
      setProgressPct(0);
    }, 120);

    try {
      const resp = await axios.post(
        "https://ipatinga-downloader-server-production.up.railway.app/download/start",
        { tracks: tracksToSend },
        { headers: { "Content-Type": "application/json" } }
      );
      const id = resp.data?.jobId;
      if (!id) {
        setStatusText("Erro: jobId não retornado");
        setRunning(false);
        return;
      }
      listenEvents(id);
    } catch (err) {
      console.error("Erro ao iniciar job", err);
      setStatusText("Erro ao iniciar job");
      setRunning(false);
    }
  }

  function listenEvents(id: string) {
    evtRef.current?.close();
    evtRef.current = new EventSource(`https://ipatinga-downloader-server-production.up.railway.app/events/${id}`);

    evtRef.current.addEventListener("progress", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        if (typeof d.processed === "number" && typeof d.total === "number" && d.total > 0) {
          setProgressPct(Math.round((d.processed / d.total) * 100));
          setStatusText(`Processadas ${d.processed}/${d.total}`);
        } else if (d.type === "skip") {
          setStatusText(`Pulou: ${d.track}`);
        } else if (d.stage) {
          setStatusText(d.stage);
        }
      } catch (err) {
        console.warn("Erro parse progress", err);
      }
    });

    evtRef.current.addEventListener("status", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        setStatusText(d.status || "Processando...");
      } catch {}
    });

    evtRef.current.addEventListener("done", (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data);
        setProgressPct(100);
        setStatusText("Pronto — iniciando download...");
        evtRef.current?.close();
        evtRef.current = null;
        downloadZip(d.downloadUrl);
      } catch (err) {
        console.error("done parse error", err);
        setStatusText("Erro ao processar resposta do servidor");
        setRunning(false);
      }
    });

    evtRef.current.addEventListener("error", () => {
      setStatusText("Erro no processamento (SSE)");
      setRunning(false);
      evtRef.current?.close();
      evtRef.current = null;
    });
  }

  async function downloadZip(downloadUrl: string) {
    try {
      const fullUrl = downloadUrl.startsWith("http") ? downloadUrl : `https://ipatinga-downloader-server-production.up.railway.app${downloadUrl}`;
      const resp = await axios.get(fullUrl, { responseType: "blob" });
      const cd = resp.headers["content-disposition"] || "";
      let filename = "playlist.zip";
      const m = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(cd);
      if (m && m[1]) filename = decodeURIComponent(m[1]);

      const blob = new Blob([resp.data], { type: resp.headers["content-type"] || "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatusText("Download concluído");
    } catch (err) {
      console.error("Erro ao baixar ZIP", err);
      setStatusText("Erro ao baixar arquivo");
    } finally {
      setRunning(false);
      setTimeout(() => setShowProgressUi(false), 1200);
    }
  }

  function handleCancel() {
    evtRef.current?.close();
    evtRef.current = null;
    setRunning(false);
    setStatusText("Cancelado");
    setTimeout(() => setShowProgressUi(false), 400);
  }

  useEffect(() => () => { evtRef.current?.close(); evtRef.current = null; }, []);
console.log(playlist)
  return (
    <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-8">
      <Image
        src={music.thumbnail || "/placeholder.png"}
        alt={music.title}
        width={300}
        height={300}
        className="rounded-2xl shadow-2xl object-cover"
      />

      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold text-white leading-tight">{music.title}</h1>
        <p className="flex items-center justify-center gap-2 text-xl text-gray-300">
          <User className="w-5 h-5" /> {music.artist}
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={startJobAndListen} className="h-14 cursor-pointer px-8 text-[100%] shadow-md transform transition-transform duration-150 hover:-translate-y-0.5 active:scale-98" disabled={running}>
          {running ? "Processando..." : "Baixar playlist"}
        </Button>
        {showProgressUi && (
          <Button onClick={handleCancel} className={`h-14 px-6 text-lg transition-opacity duration-300 ${running ? "opacity-100" : "opacity-70"}`} disabled={!running}>
            Cancelar
          </Button>
        )}
      </div>

      <div className={`w-full max-w-lg mt-4 transition-all duration-400 ease-out overflow-hidden ${showProgressUi ? "opacity-100 max-h-40" : "opacity-0 max-h-0"}`} aria-hidden={!showProgressUi}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-muted-foreground">Progresso</div>
          <div className="text-sm">{progressPct}%</div>
        </div>
        <div className="overflow-hidden rounded-lg bg-muted">
          <Progress value={progressPct} className="h-3 transition-all duration-500" />
        </div>
        <div className="mt-2 text-sm text-gray-300">{statusText}</div>
      </div>
    </div>
  );
}
