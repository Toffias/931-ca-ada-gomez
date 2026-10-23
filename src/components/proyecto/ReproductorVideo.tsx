'use client'

import { useEffect, useRef } from 'react'

import { useTextos } from '../ui/ProveedorIdioma'

/** YouTube / Vimeo → iframe; .m3u8 → HLS (nativo en Safari, hls.js en el resto); cualquier otro → <video> */
export function ReproductorVideo({ url, poster, titulo }: { url: string; poster?: string | null; titulo: string }) {
  const t = useTextos()
  const ref = useRef<HTMLVideoElement>(null)
  const embed = aEmbed(url)
  const hls = /\.m3u8(\?|$)/i.test(url)

  useEffect(() => {
    const v = ref.current
    if (!v || !hls || v.canPlayType('application/vnd.apple.mpegurl')) return
    let destruir: (() => void) | undefined
    import('hls.js').then(({ default: Hls }) => {
      if (!Hls.isSupported()) return
      const h = new Hls()
      h.loadSource(url)
      h.attachMedia(v)
      destruir = () => h.destroy()
    })
    return () => destruir?.()
  }, [url, hls])

  if (embed)
    return <iframe className="reproductor" src={embed} title={titulo} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
  return (
    <video ref={ref} className="reproductor" controls playsInline poster={poster ?? undefined} src={hls ? undefined : url}>
      {t.video.sinSoporte}
    </video>
  )
}

function aEmbed(url: string): string | null {
  const yt = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i.exec(url)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?dnt=1`
  return null
}
