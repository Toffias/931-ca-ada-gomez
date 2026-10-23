'use client'

import { useCallback, useMemo, useState } from 'react'

import type { FormaEscena } from '@/lib/escena/tipos'
import { pasaFiltros, useProyecto } from '@/lib/store-proyecto'
import type { Unidad } from '@/lib/tipos'

import type { EventoForma } from '../escena/VisorEscena'
import { COLOR_ESTADO } from '../visor/tipos'

export type UnidadEnPantalla = { unidad: Unidad; x: number; y: number }

/** cruza las formas de una escena con las unidades (por código) y resuelve color, filtros, hover y selección */
export function useUnidadesEnEscena(unidades: Unidad[], torre?: string) {
  const disponibilidad = useProyecto((s) => s.disponibilidad)
  const dormitorios = useProyecto((s) => s.dormitorios)
  const soloDisponibles = useProyecto((s) => s.soloDisponibles)
  const [elegida, setElegida] = useState<UnidadEnPantalla | null>(null)
  const [hover, setHover] = useState<UnidadEnPantalla | null>(null)

  const mapa = useMemo(() => new Map(unidades.map((u) => [`${u.torre}/${u.codigo.toUpperCase()}`, u])), [unidades])
  const unidadDe = useCallback(
    (f: FormaEscena) => (f.tipo === 'unidad' ? mapa.get(`${f.torre ?? torre}/${f.clave.toUpperCase()}`) : undefined),
    [mapa, torre],
  )
  const estadoDe = useCallback((u: Unidad) => disponibilidad[u.torre]?.[u.codigo]?.estado ?? u.estado, [disponibilidad])

  const colorDe = useCallback(
    (f: FormaEscena) => {
      const u = unidadDe(f)
      return u ? COLOR_ESTADO[estadoDe(u)] : null
    },
    [unidadDe, estadoDe],
  )
  const apagada = useCallback(
    (f: FormaEscena) => {
      const u = unidadDe(f)
      return !u || !pasaFiltros({ dormitorios: u.dormitorios, estado: estadoDe(u) }, dormitorios, soloDisponibles)
    },
    [unidadDe, estadoDe, dormitorios, soloDisponibles],
  )

  const aPantalla = (e: EventoForma | null): UnidadEnPantalla | null => {
    const u = e && unidadDe(e.forma)
    return u ? { unidad: u, x: e.x, y: e.y } : null
  }

  /** misma clave que usa VisorEscena para resaltar */
  const clave = (u: Unidad | undefined | null, conTorre: boolean) => (u ? (conTorre ? `${u.torre}/${u.codigo}` : u.codigo) : null)

  return {
    unidadDe,
    estadoDe,
    colorDe,
    apagada,
    elegida,
    hover,
    setElegida,
    onHover: (e: EventoForma | null) => setHover(aPantalla(e)),
    onElegir: (e: EventoForma) => {
      setHover(null)
      setElegida(aPantalla(e))
    },
    clave,
  }
}
