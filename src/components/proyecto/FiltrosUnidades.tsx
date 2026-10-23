'use client'

import { type FiltroDormitorios, useProyecto } from '@/lib/store-proyecto'
import type { Textos } from '@/textos'

import { useTextos } from '../ui/ProveedorIdioma'

/** opciones del filtro de dormitorios (también las usa el panel del modo 3D) */
export const opcionesDormitorios = (t: Textos): { v: FiltroDormitorios; label: string }[] => [
  { v: null, label: t.filtros.todos },
  { v: 1, label: t.comun.dormCorto(1) },
  { v: 2, label: t.comun.dormCorto(2) },
  { v: 3, label: t.filtros.masDe(3) },
]

/** filtros de dormitorios y "sólo disponibles"; sólo ofrece las cantidades que existen en el proyecto */
export function FiltrosUnidades({ dormitoriosPosibles }: { dormitoriosPosibles: number[] }) {
  const { dormitorios, soloDisponibles, set } = useProyecto()
  const t = useTextos()
  const opciones = opcionesDormitorios(t).filter((o) => o.v == null || dormitoriosPosibles.some((d) => (o.v === 3 ? d >= 3 : d === o.v)))
  return (
    <div className="filtros-unidades">
      {opciones.length > 2 && (
        <div className="chips" role="group" aria-label={t.filtros.dormitorios}>
          {opciones.map((o) => (
            <button
              key={String(o.v)}
              className={`chip${dormitorios === o.v ? ' activo' : ''}`}
              aria-pressed={dormitorios === o.v}
              onClick={() => set({ dormitorios: o.v })}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <label className="interruptor">
        <input type="checkbox" checked={soloDisponibles} onChange={(e) => set({ soloDisponibles: e.target.checked })} />
        {t.filtros.soloDisponibles}
      </label>
    </div>
  )
}

export function LeyendaEstados({ className = 'leyenda-estados' }: { className?: string }) {
  const t = useTextos().estados
  return (
    <div className={className}>
      {(['disponible', 'reservada', 'vendida'] as const).map((e) => (
        <span key={e}>
          <i className={`punto ${e}`} />
          {t[e]}
        </span>
      ))}
    </div>
  )
}
