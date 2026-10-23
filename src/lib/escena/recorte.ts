import { caja2D, type Punto } from '../esquemas/geometria'
import type { Escena } from './tipos'

/**
 * Escena con una sola unidad recortada y centrada (pestaña "Planta" de la ficha mientras no haya planta 3D).
 * Si la escena trae escala, agrega las medidas de frente y fondo.
 */
export function recortarUnidad(escena: Escena, clave: string): (Escena & { medidas?: [number, number] }) | null {
  const f = escena.formas.find((x) => x.clave.toUpperCase() === clave.toUpperCase())
  if (!f?.puntos?.length) return null
  const c = caja2D(f.puntos)
  const ancho = c.maxX - c.minX
  const alto = c.maxY - c.minY
  const margen = Math.max(ancho, alto) * 0.18
  const mover = ([x, y]: Punto): Punto => [x - c.minX + margen, y - c.minY + margen]
  const puntos = f.puntos.map(mover)
  const pxPorMetro = escena.esquema?.escala ? escena.esquema.escala.px / escena.esquema.escala.metros : null
  return {
    ancho: ancho + margen * 2,
    alto: alto + margen * 2,
    formas: [{ ...f, puntos, centro: mover(f.centro) }],
    esquema: { contornos: [], norte: escena.esquema?.norte },
    medidas: pxPorMetro ? [ancho / pxPorMetro, alto / pxPorMetro] : undefined,
  }
}
