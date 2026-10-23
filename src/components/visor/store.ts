'use client'

import { create } from 'zustand'

// Estado compartido entre la escena 3D (dentro del <Canvas>) y la interfaz HTML.
export type FiltroDormitorios = null | 1 | 2 | 3

type EstadoVisor = {
  cargado: boolean
  /** hora del día de la barrita: 0 = día, 0,5 = atardecer, 1 = noche */
  hora: number
  verDisponibilidad: boolean
  soloDisponibles: boolean
  dormitorios: FiltroDormitorios
  pisoSeleccionado: number | null
  unidadHover: string | null
  unidadSeleccionada: string | null
  /** vista pedida por la UI; `n` cambia en cada pedido para poder repetir la misma */
  vista: { camara: string; n: number } | null
  camarasDelModelo: string[]

  set: (parcial: Partial<Omit<EstadoVisor, 'set' | 'irAVista'>>) => void
  irAVista: (camara: string) => void
}

export const useVisor = create<EstadoVisor>((set, get) => ({
  cargado: false,
  hora: 0,
  verDisponibilidad: false,
  soloDisponibles: false,
  dormitorios: null,
  pisoSeleccionado: null,
  unidadHover: null,
  unidadSeleccionada: null,
  vista: null,
  camarasDelModelo: [],

  set: (parcial) => set(parcial),
  irAVista: (camara) => set({ vista: { camara, n: (get().vista?.n ?? 0) + 1 } }),
}))
