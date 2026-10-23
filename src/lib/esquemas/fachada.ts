// Fachada esquemática: cada Unidad_* que toca una cara exterior de la torre, proyectada sobre esa cara.
// Sirve de "Disponibilidad en fachada" hasta que existan el render y la máscara SVG de esa vista.

import type { Escena, FormaEscena } from '../escena/tipos'
import { caja2D, cascoConvexo, centroide, contraer, type Punto, type Vec3 } from './geometria'
import { esUnidad } from './planta'
import { codigoUnidad, type ObjetoModelo, pisoDe } from './modelo'

export type Orientacion = 'norte' | 'este' | 'sur' | 'oeste'
export const ORIENTACIONES: Orientacion[] = ['norte', 'este', 'sur', 'oeste']

const ANCHO = 1000
const MARGEN = 60

// eje y sentido de cada cara (glTF: +X = este, -Z = norte) y cómo se ve "de frente" desde afuera
const CARA: Record<Orientacion, { eje: 0 | 2; signo: 1 | -1; horizontal: (p: Vec3) => number }> = {
  norte: { eje: 2, signo: -1, horizontal: (p) => -p[0] }, // mirando al sur, el este queda a la izquierda
  sur: { eje: 2, signo: 1, horizontal: (p) => p[0] },
  este: { eje: 0, signo: 1, horizontal: (p) => -p[2] }, // mirando al oeste, el norte queda a la derecha
  oeste: { eje: 0, signo: -1, horizontal: (p) => p[2] },
}

const esVolumen = (o: ObjetoModelo) =>
  esUnidad(o) || ['piso', 'planta_baja', 'techo'].includes(String(o.extras.tipo)) || /^(Piso_|PlantaBaja|Techo)/.test(o.nombre)

/** unidades que dan a esa cara (su borde está a menos del 12 % de la profundidad de la torre) */
function unidadesDeCara(objetos: ObjetoModelo[], o: Orientacion) {
  const { eje, signo } = CARA[o]
  const unidades = objetos.filter(esUnidad)
  if (!unidades.length) return []
  const borde = signo > 0 ? Math.max(...unidades.map((u) => u.max[eje])) : Math.min(...unidades.map((u) => u.min[eje]))
  const prof = Math.max(...unidades.map((u) => u.max[eje])) - Math.min(...unidades.map((u) => u.min[eje]))
  return unidades.filter((u) => Math.abs((signo > 0 ? u.max[eje] : u.min[eje]) - borde) <= prof * 0.12)
}

/**
 * Caras con unidades, sin las medianeras: en un edificio entre medianeras las unidades tocan los laterales pero
 * esas caras no se ven. Se marcan en cualquier objeto con la propiedad `medianeras = "este,oeste"`.
 */
export function carasConUnidades(objetos: ObjetoModelo[]): Orientacion[] {
  const medianeras = new Set(objetos.flatMap((o) => String(o.extras.medianeras ?? '').split(',').map((c) => c.trim())))
  return ORIENTACIONES.filter((o) => !medianeras.has(o) && unidadesDeCara(objetos, o).length > 0)
}

export function esquemaFachada(objetos: ObjetoModelo[], o: Orientacion, escala = 1): Escena {
  const { horizontal } = CARA[o]
  const proyectar = (p: Vec3): Punto => [horizontal(p), -p[1]]
  const volumenes = objetos.filter(esVolumen)
  const silueta = volumenes.flatMap((v) => v.esquinas.map(proyectar))
  const c = caja2D(silueta.length ? silueta : [[0, 0], [1, 1]])
  const ancho = c.maxX - c.minX || 1
  const alto = c.maxY - c.minY || 1
  const k = (ANCHO - MARGEN * 2) / Math.max(ancho, alto * 0.75)
  const altoPx = Math.round(alto * k + MARGEN * 2)
  const offX = (ANCHO - ancho * k) / 2
  const aPx = ([x, y]: Punto): Punto => [(x - c.minX) * k + offX, (y - c.minY) * k + MARGEN]

  const formas: FormaEscena[] = unidadesDeCara(objetos, o)
    .map((u) => {
      const codigo = codigoUnidad(u)
      if (!codigo) return null
      const puntos = contraer(cascoConvexo(u.esquinas.map(proyectar)).map(aPx), 3)
      return { clave: codigo, tipo: 'unidad' as const, puntos, centro: centroide(puntos), etiqueta: codigo }
    })
    .filter((f): f is NonNullable<typeof f> => !!f)

  // un contorno por volumen (losas, planta baja, techo) para que se lea la torre
  const contornos = volumenes.filter((v) => !esUnidad(v)).map((v) => cascoConvexo(v.esquinas.map(proyectar)).map(aPx))
  // entrepisos: base de cada piso con unidades
  const pisos = [...new Set(objetos.filter(esUnidad).map(pisoDe))]
  const lineas: [Punto, Punto][] = pisos.map((p) => {
    const us = objetos.filter((u) => esUnidad(u) && pisoDe(u) === p)
    const y = aPx([0, -Math.min(...us.map((u) => u.min[1]))])[1]
    return [[offX, y], [offX + ancho * k, y]]
  })

  return {
    ancho: ANCHO,
    alto: altoPx,
    formas,
    esquema: {
      contornos,
      lineas,
      suelo: aPx([0, c.maxY])[1],
      escala: { px: 5 * (k / escala), metros: 5 },
    },
  }
}
