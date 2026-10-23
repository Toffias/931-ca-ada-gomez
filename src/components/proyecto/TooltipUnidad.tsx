'use client'

import type { Textos } from '@/textos'

import { useTextos } from '../ui/ProveedorIdioma'
import type { EstadoUnidad } from '../visor/tipos'
import type { UnidadEnPantalla } from './useUnidadesEnEscena'

/** etiqueta chica que sigue al mouse sobre una unidad (en táctil no aparece: el toque abre el popup) */
export function TooltipUnidad({ hover, estado }: { hover: UnidadEnPantalla | null; estado?: EstadoUnidad }) {
  const t = useTextos()
  if (!hover) return null
  const u = hover.unidad
  return (
    <div className="visor-tooltip" style={{ transform: `translate(${hover.x + 14}px, ${hover.y + 14}px)` }}>
      {textoTooltip(t, u, estado ?? u.estado)}
    </div>
  )
}

/** "Unidad 5B · 78 m² · 2 dorm. · Disponible" (también el tooltip del modo 3D) */
export const textoTooltip = (
  t: Textos,
  u: { codigo: string; superficieTotal?: number | null; dormitorios?: number | null },
  estado: EstadoUnidad,
) =>
  [t.comun.unidad(u.codigo), u.superficieTotal && `${u.superficieTotal} m²`, u.dormitorios != null && t.comun.dormCorto(u.dormitorios), t.estados[estado]]
    .filter(Boolean)
    .join(' · ')
