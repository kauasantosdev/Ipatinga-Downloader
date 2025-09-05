'use client'

import React, { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Button } from './ui/button'
import { Progress } from './ui/progress' // ajuste o caminho se necessário
import { User } from 'lucide-react'

type TrackPayload = { name: string; artists: { name: string | null }[] }

export default function MusicPreview(props: any) {
  const sound = props?.sound ?? props
  const [jobId, setJobId] = useState<string | null>(null)
  const [progressPct, setProgressPct] = useState<number>(0)
  const [statusText, setStatusText] = useState<string>('Aguardando')
  const evtRef = useRef<EventSource | null>(null)
  const [running, setRunning] = useState<boolean>(false)
  const [showProgressUi, setShowProgressUi] = useState<boolean>(false) // controls visibility

  const music = {
    title: sound?.playlist?.name ?? 'Playlist',
    artist: sound?.playlist?.owner?.display_name ?? '',
    thumbnail: sound?.playlist?.images?.[0]?.url ?? ''
  }

  function buildTracks(): TrackPayload[] {
    const items = sound?.playlist?.tracks?.items ?? []
    return items.map((item: any) => {
      const track = item.track ?? item
      return {
        name: track?.name ?? 'Unknown',
        artists: (track?.artists ?? []).map((a: any) => ({ name: a?.name ?? null }))
      }
    })
  }

  async function startJobAndListen() {
    const tracksToSend = buildTracks()
    if (!tracksToSend.length) {
      setStatusText('Playlist vazia')
      return
    }

    try {
      // show progress UI with slight delay for smoother UX
      setShowProgressUi(true)
      setTimeout(() => {
        setRunning(true)
        setStatusText('Iniciando job...')
        setProgressPct(0)
      }, 120) // tiny delay so the UI can animate in

      const resp = await axios.post(
        'http://localhost:3001/download/start',
        { tracks: tracksToSend },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const id = resp.data?.jobId
      if (!id) {
        setStatusText('Erro: jobId não retornado')
        setRunning(false)
        return
      }

      setJobId(id)
      listenEvents(id)
    } catch (err) {
      console.error('Erro ao iniciar job', err)
      setStatusText('Erro ao iniciar job')
      setRunning(false)
    }
  }

  function listenEvents(id: string) {
    if (evtRef.current) {
      try { evtRef.current.close() } catch {}
      evtRef.current = null
    }

    const ev = new EventSource(`http://localhost:3001/events/${id}`)
    evtRef.current = ev

    ev.addEventListener('progress', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        if (typeof d.processed === 'number' && typeof d.total === 'number' && d.total > 0) {
          const p = Math.round((d.processed / d.total) * 100)
          setProgressPct(p)
          setStatusText(`Processadas ${d.processed}/${d.total}`)
        } else if (d.type === 'skip') {
          setStatusText(`Pulou: ${d.track}`)
        } else if (d.stage) {
          setStatusText(d.stage)
        }
      } catch (err) {
        console.warn('Erro parse progress', err)
      }
    })

    ev.addEventListener('status', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        setStatusText(d.status || 'Processando...')
      } catch {}
    })

    ev.addEventListener('done', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        setProgressPct(100)
        setStatusText('Pronto — iniciando download...')
        ev.close()
        evtRef.current = null
        downloadZip(d.downloadUrl)
      } catch (err) {
        console.error('done parse error', err)
        setStatusText('Erro ao processar resposta do servidor')
        setRunning(false)
      }
    })

    ev.addEventListener('error', (evObj: any) => {
      console.error('SSE error', evObj)
      setStatusText('Erro no processamento (SSE)')
      setRunning(false)
      try { ev.close() } catch {}
      evtRef.current = null
    })
  }

  async function downloadZip(downloadUrl: string) {
    try {
      const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `http://localhost:3001${downloadUrl}`
      const resp = await axios.get(fullUrl, { responseType: 'blob' })

      const contentType = resp.headers['content-type'] || 'application/zip'
      const cd = resp.headers['content-disposition'] || ''
      let filename = 'playlist.zip'
      const m = /filename\*?=(?:UTF-8'')?["']?([^;"']+)/i.exec(cd)
      if (m && m[1]) filename = decodeURIComponent(m[1])

      const blob = new Blob([resp.data], { type: contentType })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setStatusText('Download concluído')
    } catch (err) {
      console.error('Erro ao baixar ZIP', err)
      setStatusText('Erro ao baixar arquivo')
    } finally {
      setRunning(false)
      // keep progress UI visible briefly after finish for feedback, then hide
      setTimeout(() => setShowProgressUi(false), 1200)
    }
  }

  // Cancel (stop listening and hide UI)
  function handleCancel() {
    if (evtRef.current) {
      try { evtRef.current.close() } catch {}
      evtRef.current = null
    }
    setRunning(false)
    setStatusText('Cancelado')
    // fade out UI
    setTimeout(() => setShowProgressUi(false), 400)
  }

  // cleanup
  useEffect(() => {
    return () => {
      if (evtRef.current) {
        try { evtRef.current.close() } catch {}
        evtRef.current = null
      }
    }
  }, [])

  return (
    <div>
      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center text-center space-y-8">
        <img
          src={music.thumbnail}
          alt={music.title}
          className="w-64 h-64 rounded-2xl shadow-2xl object-cover"
        />

        <div className="space-y-3">
          <h1 className="text-4xl font-extrabold text-white leading-tight">{music.title}</h1>
          <p className="flex items-center justify-center gap-2 text-xl text-gray-300">
            <User className="w-5 h-5" /> {music.artist}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={startJobAndListen}
            className="h-14 px-8 text-lg shadow-md transform transition-transform duration-150 hover:-translate-y-0.5 active:scale-98"
            disabled={running}
          >
            {running ? 'Processando...' : 'Baixar playlist'}
          </Button>

          {/* Cancel só aparece quando a UI de progresso estiver visível (após o usuário apertar) */}
          {showProgressUi && (
            <Button
              onClick={handleCancel}
              className={`h-14 px-6 text-lg transition-opacity duration-300 ${running ? 'opacity-100' : 'opacity-70'}`}
              disabled={!running}
            >
              Cancelar
            </Button>
          )}
        </div>

        {/* Barra de progresso: só renderiza quando showProgressUi === true */}
        <div
          className={`w-full max-w-lg mt-4 transition-all duration-400 ease-out overflow-hidden ${showProgressUi ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0'}`}
          aria-hidden={!showProgressUi}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Progresso</div>
            <div className="text-sm">{progressPct}%</div>
          </div>

          {/* Progress do shadcn (suave) */}
          <div className="overflow-hidden rounded-lg bg-muted">
            <Progress value={progressPct} className="h-3 transition-all duration-500" />
          </div>

          <div className="mt-2 text-sm text-gray-300">{statusText}</div>
        </div>
      </div>
    </div>
  )
}
