'use client'

import { useEffect, useRef, useState } from 'react'

// Ancho al que se analiza la imagen para encontrar el cielo (alcanza y es instantáneo).
const ANCHO_ANALISIS = 320
// Diferencia máxima de color entre píxeles vecinos del cielo: el degradé es suave y los bordes del edificio no.
const TOLERANCIA = 14
// Con menos cielo que esto (interiores, tomas cerradas) no se ponen nubes.
const CIELO_MINIMO = 0.03

// Máscara del cielo: crece desde la franja de arriba mientras el color cambie poco y siga siendo azulado.
// Devuelve un PNG (blanco = cielo) con el mismo aspecto que la imagen, o null si casi no hay cielo.
function mascaraCielo(img: HTMLImageElement): string | null {
  const w = ANCHO_ANALISIS
  const h = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w))
  const lienzo = document.createElement('canvas')
  lienzo.width = w
  lienzo.height = h
  const ctx = lienzo.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, w, h)
  const px = ctx.getImageData(0, 0, w, h).data

  const azulado = (i: number) => px[i + 2] >= px[i] - 4
  const cielo = new Uint8Array(w * h)
  const cola: number[] = []
  for (let x = 0; x < w; x++) {
    if (px[x * 4 + 2] > px[x * 4] + 6) {
      cielo[x] = 1
      cola.push(x)
    }
  }
  while (cola.length) {
    const p = cola.pop()!
    const x = p % w
    const y = (p - x) / w
    const i = p * 4
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q < 0 || cielo[q]) continue
      const j = q * 4
      const dif = Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2])
      if (dif <= TOLERANCIA && azulado(j)) {
        cielo[q] = 1
        cola.push(q)
      }
    }
  }

  // Se achica un píxel para que las nubes no pisen el borde del edificio al difuminar.
  const salida = ctx.createImageData(w, h)
  let total = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      const dentro =
        cielo[p] && (x === 0 || cielo[p - 1]) && (x === w - 1 || cielo[p + 1]) && (y === 0 || cielo[p - w]) && (y === h - 1 || cielo[p + w])
      if (!dentro) continue
      total++
      salida.data.set([255, 255, 255, 255], p * 4)
    }
  }
  if (total / (w * h) < CIELO_MINIMO) return null
  ctx.putImageData(salida, 0, 0)

  const final = document.createElement('canvas')
  final.width = w * 2
  final.height = h * 2
  const fctx = final.getContext('2d')
  if (!fctx) return null
  fctx.filter = 'blur(1.5px)'
  fctx.drawImage(lienzo, 0, 0, final.width, final.height)
  return final.toDataURL('image/png')
}

// Fondo de la Intro sin video: la imagen con su zoom lento y, detrás del edificio, dos capas de nubes que pasan.
export function FondoConNubes({ src, nubes }: { src: string; nubes: boolean }) {
  const ref = useRef<HTMLImageElement>(null)
  const [mascara, setMascara] = useState<string | null>(null)

  useEffect(() => {
    const img = ref.current
    if (!nubes || !img) return
    let vigente = true
    const analizar = () => {
      try {
        const m = mascaraCielo(img)
        if (vigente) setMascara(m)
      } catch {
        // Imagen de otro origen sin CORS: se queda sin nubes.
      }
    }
    if (img.complete && img.naturalWidth) analizar()
    else img.addEventListener('load', analizar, { once: true })
    return () => {
      vigente = false
      img.removeEventListener('load', analizar)
    }
  }, [src, nubes])

  return (
    <div className="intro-fondo ken-burns">
      <img ref={ref} className="intro-imagen" src={src} alt="" />
      {mascara && (
        <div className="nubes" aria-hidden style={{ maskImage: `url(${mascara})`, WebkitMaskImage: `url(${mascara})` }}>
          <div className="nubes-capa nubes-lejanas" />
          <div className="nubes-capa nubes-cercanas" />
        </div>
      )}
    </div>
  )
}
