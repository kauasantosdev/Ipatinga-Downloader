"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { CircleAlert, ClipboardPaste } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import MusicPreview from '@/app/components/MusicPreview'
import { motion } from "framer-motion";
import axios from "axios";
import qs from "qs";

export function MusicDownloader() {
  const [alert, setAlert] = useState<"incorrectLink" | "emptyLink" | null>(null);
  const [url, setUrl] = useState<string>("");
  const [state, setState] = useState<'Form' | 'Preview'>('Form');
  const [playlist, setPlaylist] = useState<any>(null);

  const clientId = "3b205ff9bd3c497283c62b7be5309ce4";
  const clientSecret = "828571890b7743048051b61e0afdcc84";

  const getToken = async (): Promise<string> => {
    const data = qs.stringify({ grant_type: "client_credentials" });

    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      data,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64"),
        },
      }
    );

    return response.data.access_token;
  };

  const searchPlaylist = async (url: string) => {
    // Extrai o ID da playlist
    const extractPlaylistId = (link: string) => {
      const match = link.match(/playlist\/([a-zA-Z0-9]+)(\?|$)/);
      return match ? match[1] : null;
    };

    const playlistId = extractPlaylistId(url);

    if (!playlistId) {
      throw new Error("⚠️ Link inválido, não foi possível extrair o ID da playlist.");
    }

    const token = await getToken();

    const { data } = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setPlaylist(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url) {
      setAlert("emptyLink");
      return;
    }

    if (!url.toLowerCase().includes("spotify")) {
      setAlert("incorrectLink");
      return;
    }

    setAlert(null);

    try {
      await searchPlaylist(url);
      setState('Preview');
    } catch (err: any) {
      setAlert("incorrectLink");
      console.error(err);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(29,78,216,0.2),transparent_70%)] animate-pulse" />

      {alert === "incorrectLink" && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-[2.5rem] left-1/2 -translate-x-1/2 w-96 z-50"
        >
          <Alert variant="destructive">
            <AlertTitle className="flex items-center justify-center gap-1">
              <CircleAlert size={17} /> Error!
            </AlertTitle>
            <AlertDescription className="flex justify-center mt-1">
              Por favor, forneça um link válido.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {alert === "emptyLink" && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-[2.5rem] left-1/2 -translate-x-1/2 w-96 z-50"
        >
          <Alert variant="destructive">
            <AlertTitle className="flex items-center justify-center gap-1">
              <CircleAlert size={17} /> Error!
            </AlertTitle>
            <AlertDescription className="flex justify-center mt-1">
              Por favor, preencha o campo.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {state === 'Form' && (
        <div className="relative z-10 max-w-2xl w-full text-center space-y-10">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold text-white leading-tight">
              Baixe suas <span className="text-primary">playlists</span>
            </h1>
            <h2 className="text-4xl font-bold text-gray-300">
              favoritas em segundos
            </h2>
            <p className="text-lg text-gray-400 mt-4">
              Cole o link de qualquer playlist pública do{" "}
              <span className="text-green-400 font-semibold">Spotify</span>.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-xl p-8 space-y-6">
              <div className="text-left space-y-2">
                <label className="text-md font-medium text-gray-200" htmlFor="urlInput">
                  Link da playlist
                </label>
                <div className="relative">
                  <ClipboardPaste className="absolute cursor-pointer left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    autoComplete="off"
                    id="urlInput"
                    placeholder="Cole aqui o link da playlist..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-12 mt-2 h-14 text-base bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500 focus:border-primary focus:ring-2 focus:ring-primary/30 rounded-xl"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full cursor-pointer h-14 text-base font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-lg transition-all duration-200"
              >
                Baixar Agora
              </Button>
            </div>
          </form>
        </div>
      )}

      {state === 'Preview' && <MusicPreview playlist={playlist} />}
    </div>
  );
}
