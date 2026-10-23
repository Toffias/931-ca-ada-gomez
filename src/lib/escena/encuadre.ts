// Encuadre de un render a pantalla completa: la imagen cubre todo (como object-fit: cover) pero el recorte se
// centra en las formas y, si no entran en el lugar libre (celular vertical), se aleja lo justo para mostrarlas.
// Lo que queda fuera de la imagen se rellena con la misma imagen desenfocada (VisorEscena).

import { caja2D, type Punto } from '../esquemas/geometria'
import type { Escena, FormaEscena } from './tipos'

/**
 * espacio que ocupa la interfaz encima del visor, en px de pantalla. Con `cubrir` la imagen llena siempre el
 * contenedor (nunca se aleja más que eso): las formas se centran en el lugar libre hasta donde da la imagen.
 */
export type Margenes = { arriba: number; derecha: number; abajo: number; izquierda: number; cubrir?: boolean }

const puntosDe = (f: FormaEscena): Punto[] => {
  if (f.puntos?.length) return f.puntos
  const n = (f.d?.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number)
  const r: Punto[] = []
  for (let i = 0; i + 1 < n.length; i += 2) r.push([n[i], n[i + 1]])
  return r
}

/**
 * viewBox [x, y, ancho, alto] en coordenadas de la escena para un contenedor de `w`×`h` px,
 * y la escala resultante (px de pantalla por unidad de la escena).
 */
export function encuadreCubrir(
  escena: Pick<Escena, 'ancho' | 'alto' | 'formas'>,
  w: number,
  h: number,
  m: Margenes,
): { vista: [number, number, number, number]; escala: number } {
  const { ancho, alto } = escena
  const cubrir = Math.max(w / ancho, h / alto)
  const pts = escena.formas.flatMap(puntosDe)
  if (!pts.length) {
    const vw = w / cubrir, vh = h / cubrir
    return { vista: [(ancho - vw) / 2, (alto - vh) / 2, vw, vh], escala: cubrir }
  }

  const c = caja2D(pts)
  const aire = Math.max(c.maxX - c.minX, c.maxY - c.minY) * 0.04
  const fw = c.maxX - c.minX + aire * 2
  const fh = c.maxY - c.minY + aire * 2
  const libreW = Math.max(w - m.izquierda - m.derecha, w * 0.4)
  const libreH = Math.max(h - m.arriba - m.abajo, h * 0.4)
  const escala = m.cubrir ? cubrir : Math.min(cubrir, libreW / fw, libreH / fh)

  const vw = w / escala, vh = h / escala
  // el centro de las formas cae en el centro del lugar libre...
  let x = (c.minX + c.maxX) / 2 - (m.izquierda + libreW / 2) / escala
  let y = (c.minY + c.maxY) / 2 - (m.arriba + libreH / 2) / escala
  // ...sin mostrar fuera de la imagen en los ejes donde la imagen alcanza a cubrir
  if (vw <= ancho) x = Math.min(Math.max(x, 0), ancho - vw)
  if (vh <= alto) y = Math.min(Math.max(y, 0), alto - vh)
  if (m.cubrir) return { vista: [x, y, vw, vh], escala }
  // si no, las formas mandan: si el render está encuadrado justo (la torre toca el borde de la imagen), antes que
  // dejar unidades debajo del título o de los filtros se muestra un poco del relleno desenfocado
  const dentro = (v: number, desde: number, hasta: number) => Math.min(Math.max(v, desde), Math.max(desde, hasta))
  x = dentro(x, c.maxX + aire - (w - m.derecha) / escala, c.minX - aire - m.izquierda / escala)
  y = dentro(y, c.maxY + aire - (h - m.abajo) / escala, c.minY - aire - m.arriba / escala)
  return { vista: [x, y, vw, vh], escala }
}
