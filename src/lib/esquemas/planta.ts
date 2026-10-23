// Planta esquemática de un piso: la huella (vista desde arriba) de cada Unidad_* del modelo.
// glTF es Y arriba y Blender exporta su +Y como -Z, así que mirando desde arriba con el norte hacia arriba
// la pantalla es (x, z) tal cual.

import type { Escena, FormaEscena } from '../escena/tipos'
import { caja2D, cascoConvexo, centroide, contraer, type Punto } from './geometria'
import { codigoUnidad, type ObjetoModelo, pisoDe } from './modelo'

export const ANCHO_ESQUEMA = 1000
const MARGEN = 70

export const esUnidad = (o: ObjetoModelo) => o.extras.tipo === 'unidad' || /^Unidad_/.test(o.nombre)
const esLosa = (o: ObjetoModelo) => o.extras.tipo === 'piso' || o.extras.tipo === 'planta_baja' || /^(Piso_|PlantaBaja)/.test(o.nombre)

const huella = (o: ObjetoModelo): Punto[] => cascoConvexo(o.esquinas.map(([x, , z]) => [x, z] as Punto))

/** pisos con unidades en el modelo */
export function pisosDelModelo(objetos: ObjetoModelo[]): number[] {
  return [...new Set(objetos.filter(esUnidad).map(pisoDe).filter((p): p is number => p != null))].sort((a, b) => a - b)
}

/**
 * @param escala metros por unidad del modelo (config3D.escala del edificio)
 * @param piso nivel a dibujar; si no tiene unidades (p. ej. planta baja) se dibuja sólo la losa
 */
export function esquemaPlanta(objetos: ObjetoModelo[], piso: number, escala = 1): Escena {
  const unidades = objetos.filter((o) => esUnidad(o) && pisoDe(o) === piso)
  const losa = objetos.find((o) => esLosa(o) && (pisoDe(o) ?? (o.extras.tipo === 'planta_baja' ? 0 : null)) === piso)

  // el encuadre es el de toda la torre (misma escala en todos los pisos, así no "salta" al cambiar de piso)
  const todas = objetos.filter((o) => esUnidad(o) || esLosa(o)).flatMap(huella)
  const c = caja2D(todas.length ? todas : [[0, 0], [1, 1]])
  const ancho = c.maxX - c.minX || 1
  const alto = c.maxY - c.minY || 1
  const k = (ANCHO_ESQUEMA - MARGEN * 2) / Math.max(ancho, alto)
  const altoPx = Math.round(alto * k + MARGEN * 2)
  const offX = (ANCHO_ESQUEMA - ancho * k) / 2
  const aPx = ([x, y]: Punto): Punto => [(x - c.minX) * k + offX, (y - c.minY) * k + MARGEN]

  const formas: FormaEscena[] = unidades
    .map((o) => {
      const codigo = codigoUnidad(o)
      if (!codigo) return null
      const puntos = contraer(huella(o).map(aPx), 5)
      return { clave: codigo, tipo: 'unidad' as const, puntos, centro: centroide(puntos), etiqueta: codigo }
    })
    .filter((f): f is NonNullable<typeof f> => !!f)
    .sort((a, b) => a.clave.localeCompare(b.clave))

  // un nivel sin losa ni unidades propias (rooftop, amenities) se dibuja con la huella de la torre
  const base = losa || unidades.length ? [...(losa ? huella(losa) : []), ...unidades.flatMap(huella)] : todas
  const contorno = cascoConvexo(base.map(aPx))

  return {
    ancho: ANCHO_ESQUEMA,
    alto: altoPx,
    formas,
    esquema: {
      contornos: contorno.length ? [contorno] : [],
      norte: 0,
      escala: { px: 5 * (k / escala), metros: 5 },
    },
  }
}
