'use client'

import { create } from 'zustand'

import type { Disponibilidad, EstadoUnidad, Unidad } from './tipos'

// Estado de la interfaz del sitio (fuera del visor 3D, que tiene su propio store en components/visor/store.ts).

export type FiltroDormitorios = null | 1 | 2 | 3
export type OrigenConsulta = 'precio' | 'ficha' | 'contacto'
export type PedidoConsulta = { origen: OrigenConsulta; unidad?: Pick<Unidad, 'id' | 'codigo' | 'torre' | 'torreId'> | null }

type EstadoProyecto = {
  disponibilidad: Disponibilidad
  dormitorios: FiltroDormitorios
  soloDisponibles: boolean
  /** unidad bajo el mouse/dedo en planta o fachada: `torre/codigo` */
  hover: string | null
  consulta: PedidoConsulta | null
  menuAbierto: boolean
  qrAbierto: boolean

  set: (p: Partial<Omit<EstadoProyecto, 'set'>>) => void
}

export const useProyecto = create<EstadoProyecto>((set) => ({
  disponibilidad: {},
  dormitorios: null,
  soloDisponibles: false,
  hover: null,
  consulta: null,
  menuAbierto: false,
  qrAbierto: false,

  set: (p) => set(p),
}))

/** estado vivo de una unidad (el del endpoint de disponibilidad si ya llegó, si no el que vino en la página) */
export function useEstadoUnidad(torre: string, codigo: string, inicial: EstadoUnidad): EstadoUnidad {
  return useProyecto((s) => s.disponibilidad[torre]?.[codigo]?.estado ?? inicial)
}

export function pasaFiltros(u: Pick<Unidad, 'dormitorios' | 'estado'>, dormitorios: FiltroDormitorios, soloDisponibles: boolean) {
  if (soloDisponibles && u.estado !== 'disponible') return false
  if (dormitorios == null) return true
  const d = u.dormitorios ?? 0
  return dormitorios === 3 ? d >= 3 : d === dormitorios
}
