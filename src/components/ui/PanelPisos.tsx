'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { LeyendaEstados, opcionesDormitorios } from '../proyecto/FiltrosUnidades'
import { useVisor } from '../visor/store'
import type { UnidadVisor } from '../visor/tipos'
import { Icono } from './Icono'
import { useRutas, useTextos } from './ProveedorIdioma'

export function PanelPisos({ unidades, torre }: { unidades: UnidadVisor[]; torre: string }) {
  const s = useVisor()
  const rutas = useRutas()
  const t = useTextos()
  // en celular el panel tapa medio edificio: arranca plegado y sólo muestra la cabecera (en escritorio no aplica)
  const [abierto, setAbierto] = useState(false)

  const pisos = useMemo(() => {
    const porPiso = new Map<number, UnidadVisor[]>()
    for (const u of unidades) porPiso.set(u.piso, [...(porPiso.get(u.piso) ?? []), u])
    return [...porPiso.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([piso, us]) => ({ piso, unidades: us.sort((a, b) => a.codigo.localeCompare(b.codigo)) }))
  }, [unidades])

  const disponibles = unidades.filter((u) => u.estado === 'disponible').length
  // sólo las cantidades que existen en el edificio
  const opcionesDorm = opcionesDormitorios(t).filter((o) => o.v == null || unidades.some((u) => (o.v === 3 ? (u.dormitorios ?? 0) >= 3 : u.dormitorios === o.v)))

  // punto en el botón para que no se olvide un filtro aplicado con el panel plegado
  const hayFiltro = s.dormitorios !== null || s.soloDisponibles

  return (
    <aside className={`panel${abierto ? '' : ' plegado'}`} aria-label={t.planta.pisosYUnidades}>
      <div className="panel-cabecera">
        <h2>{t.niveles.pisos}</h2>
        <span className="panel-resumen">{t.comun.disponibles(disponibles)}</span>
        <button
          className={`boton-icono chico panel-plegar${hayFiltro ? ' hay-filtro' : ''}`}
          aria-label={abierto ? t.filtros.ocultar : t.filtros.mostrar}
          aria-expanded={abierto}
          aria-controls="panel-pisos-contenido"
          onClick={() => setAbierto(!abierto)}
        >
          <Icono nombre={abierto ? 'abajo' : 'arriba'} tamano={18} />
        </button>
      </div>

      {/* en escritorio es transparente (display: contents); en celular se oculta con el panel plegado */}
      <div className="panel-contenido" id="panel-pisos-contenido">

        <div className="filtros">
          <div className="chips" role="group" aria-label={t.filtros.dormitorios}>
            {opcionesDorm.map((o) => (
              <button
                key={String(o.v)}
                className={`chip${s.dormitorios === o.v ? ' activo' : ''}`}
                onClick={() => s.set({ dormitorios: o.v })}
              >
                {o.label}
              </button>
            ))}
          </div>
          <label className="interruptor">
            <input type="checkbox" checked={s.soloDisponibles} onChange={(e) => s.set({ soloDisponibles: e.target.checked })} />
            {t.filtros.soloDisponibles}
          </label>
          <label className="interruptor">
            <input
              type="checkbox"
              checked={s.verDisponibilidad}
              onChange={(e) => s.set({ verDisponibilidad: e.target.checked })}
            />
            {t.filtros.colorear}
          </label>
        </div>

        <ul className="lista-pisos">
          {pisos.map(({ piso, unidades: us }) => {
            const libres = us.filter((u) => u.estado === 'disponible').length
            const activo = s.pisoSeleccionado === piso
            return (
              <li key={piso}>
                <button
                  className={`fila-piso${activo ? ' activo' : ''}`}
                  aria-pressed={activo}
                  onClick={() => s.set({ pisoSeleccionado: activo ? null : piso })}
                >
                  <span>
                    {t.comun.piso(piso)} <small>· {t.planta.librePiso(libres)}</small>
                  </span>
                  <span className="puntos">
                    {us.map((u) => (
                      <i key={u.codigo} className={`punto ${u.estado}`} title={`${u.codigo} · ${t.estados[u.estado]}`} />
                    ))}
                  </span>
                </button>
                {activo && (
                  <div className="unidades-piso">
                    {us.map((u) => (
                      <button
                        key={u.codigo}
                        className={`chip unidad ${u.estado}${s.unidadSeleccionada === u.codigo ? ' activo' : ''}`}
                        onMouseEnter={() => s.set({ unidadHover: u.codigo })}
                        onMouseLeave={() => s.set({ unidadHover: null })}
                        onClick={() => s.set({ unidadSeleccionada: u.codigo })}
                      >
                        {u.codigo}
                      </button>
                    ))}
                    <Link className="chip ver-planta" href={rutas.planta(torre, piso)}>
                      {t.planta.verPlanta}
                    </Link>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        <LeyendaEstados className="leyenda" />
      </div>
    </aside>
  )
}
