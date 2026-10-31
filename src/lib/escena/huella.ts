import 'server-only'

import sharp from 'sharp'

// Ancho al que se analiza el render: alcanza para ubicar el edificio y es rápido.
const ANCHO_ANALISIS = 640
// Alfa mínimo para contar un píxel como edificio (los bordes suavizados quedan afuera).
const ALFA_MINIMO = 40

const cacheHuellas = new Map<string, Promise<[number, number, number, number] | null>>()

/**
 * Caja que ocupa el edificio en un render de planta con fondo transparente, en unidades del viewBox de la escena.
 * Devuelve null si el render no es transparente ("realista": ya trae su entorno). Se cachea por archivo.
 */
export function huellaRender(clave: string, leer: () => Promise<Buffer | null>, ancho: number, alto: number) {
  const k = `${clave}:${ancho}x${alto}`
  if (!cacheHuellas.has(k)) cacheHuellas.set(k, medir(leer, ancho, alto).catch(() => null))
  return cacheHuellas.get(k)!
}

async function medir(leer: () => Promise<Buffer | null>, ancho: number, alto: number) {
  const buf = await leer()
  if (!buf) return null
  const { data, info } = await sharp(buf).ensureAlpha().resize({ width: ANCHO_ANALISIS }).extractChannel('alpha').raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  // una esquina opaca = render con fondo
  if (data[0] > ALFA_MINIMO) return null
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[y * w + x] > ALFA_MINIMO) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  if (x1 < 0) return null
  const kx = ancho / w
  const ky = alto / h
  return [x0 * kx, y0 * ky, (x1 + 1) * kx, (y1 + 1) * ky] as [number, number, number, number]
}
