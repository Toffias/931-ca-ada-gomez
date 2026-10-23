// Lee una máscara SVG exportada desde Blender: un <path>/<polygon>/<rect> por unidad, torre o POI,
// identificado con data-unidad="5B", data-torre="torre-a" o data-poi="piscina". El viewBox es el del render.

import { centroide, type Punto } from '../esquemas/geometria'
import type { FormaEscena, TipoForma } from './tipos'

const ATRIBUTO: Record<string, TipoForma> = { unidad: 'unidad', torre: 'torre', poi: 'poi' }

const attr = (tag: string, nombre: string) => new RegExp(`\\s${nombre}\\s*=\\s*"([^"]*)"`, 'i').exec(tag)?.[1]

function puntosDePolygon(s: string): Punto[] {
  const n = s.trim().split(/[\s,]+/).map(Number)
  const r: Punto[] = []
  for (let i = 0; i + 1 < n.length; i += 2) r.push([n[i], n[i + 1]])
  return r
}

/** centro aproximado de un path: promedio de los pares de números (exacto para paths de M/L, como los que escribe el script) */
function centroDePath(d: string): Punto {
  const n = (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
  const pts: Punto[] = []
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]])
  return pts.length ? centroide(pts) : [0, 0]
}

export function leerMascara(svg: string): { ancho: number; alto: number; formas: FormaEscena[] } | null {
  const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number)
  const ancho = vb?.[2] ?? Number(attr(svg, 'width'))
  const alto = vb?.[3] ?? Number(attr(svg, 'height'))
  if (!ancho || !alto) return null

  const formas: FormaEscena[] = []
  for (const [tag, elemento] of svg.matchAll(/<(path|polygon|rect)\b[^>]*>/gi)) {
    // una unidad puede traer además data-torre (máscaras con varias torres); si no, la forma es de una torre o un POI
    const nombre = ['unidad', 'torre', 'poi'].find((k) => attr(tag, `data-${k}`))
    if (!nombre) continue
    const tipo = ATRIBUTO[nombre]
    const clave = attr(tag, `data-${nombre}`)!
    const torre = tipo === 'unidad' ? attr(tag, 'data-torre') : undefined
    const cx = Number(attr(tag, 'data-cx'))
    const cy = Number(attr(tag, 'data-cy'))
    const conCentro = (c: Punto): Punto => (Number.isFinite(cx) && Number.isFinite(cy) && attr(tag, 'data-cx') ? [cx, cy] : c)
    const el = elemento.toLowerCase()
    if (el === 'path') {
      const d = attr(tag, 'd')
      if (d) formas.push({ clave, tipo, torre, d, centro: conCentro(centroDePath(d)) })
    } else if (el === 'polygon') {
      const puntos = puntosDePolygon(attr(tag, 'points') ?? '')
      if (puntos.length > 2) formas.push({ clave, tipo, torre, puntos, centro: conCentro(centroide(puntos)) })
    } else {
      const x = Number(attr(tag, 'x') ?? 0), y = Number(attr(tag, 'y') ?? 0)
      const w = Number(attr(tag, 'width') ?? 0), h = Number(attr(tag, 'height') ?? 0)
      const puntos: Punto[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
      formas.push({ clave, tipo, torre, puntos, centro: conCentro([x + w / 2, y + h / 2]) })
    }
  }
  return { ancho, alto, formas }
}
