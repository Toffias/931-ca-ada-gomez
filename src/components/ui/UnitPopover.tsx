'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { formatoPrecio } from '@/lib/formato'
import { useEstadoUnidad, useProyecto } from '@/lib/store-proyecto'
import type { Unidad } from '@/lib/tipos'

import { EnlaceProfundo } from './EnlaceProfundo'
import { Icono } from './Icono'
import { useIdioma, useRutas, useTextos } from './ProveedorIdioma'

type Props = {
  unidad: Unidad
  /** punto de la pantalla donde se eligió la unidad; el popup se acomoda al lado */
  x: number
  y: number
  onCerrar: () => void
  conTour?: boolean
  /** fijo abajo a la izquierda en vez de al lado del punto (modo 3D) */
  fijo?: boolean
}

// Popup de unidad (spec G): se usa igual en planta, fachada y modo 3D. En celular es una hoja inferior.
export function UnitPopover({ unidad: u, x, y, onCerrar, conTour = true, fijo = false }: Props) {
  const idioma = useIdioma()
  const rutas = useRutas()
  const t = useTextos()
  const estado = useEstadoUnidad(u.torre, u.codigo, u.estado)
  const precioVivo = useProyecto((s) => s.disponibilidad[u.torre]?.[u.codigo]?.precio)
  const set = useProyecto((s) => s.set)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || fijo) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const margen = 12
    const left = x + 18 + w < window.innerWidth - margen ? x + 18 : Math.max(margen, x - 18 - w)
    const top = Math.min(Math.max(70, y - h / 2), window.innerHeight - h - margen)
    setPos({ left, top })
  }, [x, y, u.codigo, fijo])

  // se cierra con Escape o tocando fuera (salvo otra unidad: esa abre la suya)
  useEffect(() => {
    const fuera = (e: PointerEvent) => {
      const t = e.target as Element
      if (!ref.current?.contains(t) && !t.closest('.forma, .modal, canvas, .panel')) onCerrar()
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('pointerdown', fuera)
    window.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      window.removeEventListener('keydown', tecla)
    }
  }, [onCerrar])

  const disponible = estado === 'disponible'
  const precio = disponible ? formatoPrecio(precioVivo ?? u.precio, u.moneda, idioma) : null
  const datos: [string, string | null][] = [
    [t.unidad.superficie, u.superficieTotal ? `${u.superficieTotal} m²` : null],
    [t.unidad.dormitorios, u.dormitorios != null ? String(u.dormitorios) : null],
    [t.unidad.banos, u.banos != null ? String(u.banos) : null],
    [t.unidad.orientacion, u.orientacion?.split('(')[0].trim() ?? null],
  ]

  return (
    <div
      ref={ref}
      className={`popover-unidad${fijo ? ' fijo' : ''}`}
      style={fijo ? undefined : pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
      role="dialog"
      aria-label={t.comun.unidad(u.codigo)}
    >
      <div className="popover-cabecera">
        <div>
          <span className="kicker-chico">
            {t.comun.piso(u.piso)}
            {u.tipologia ? ` · ${t.comun.tipologia(u.tipologia.codigo)}` : ''}
          </span>
          <h3>{t.comun.unidad(u.codigo)}</h3>
        </div>
        <span className={`badge ${estado}`}>{t.estados[estado]}</span>
        <button className="boton-icono chico" aria-label={t.comun.cerrar} onClick={onCerrar}>
          <Icono nombre="cerrar" tamano={16} />
        </button>
      </div>

      <dl className="datos-unidad">
        {datos
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>
      {precio && <p className="precio">{precio}</p>}
      {!disponible && <p className="aviso">{t.unidad.noDisponiblePopup(t.estadoEnFrase[estado])}</p>}

      <div className="acciones">
        {disponible && (
          <button
            className="boton"
            onClick={() => set({ consulta: { origen: 'precio', unidad: { id: u.id, codigo: u.codigo, torre: u.torre, torreId: u.torreId } } })}
          >
            {t.consulta.consultarPrecio}
          </button>
        )}
        {conTour && u.recorrido && (
          <EnlaceProfundo className="boton" href={rutas.recorridos(u.recorrido.slug)}>
            <Icono nombre="tour" tamano={16} /> {t.comun.tour360}
          </EnlaceProfundo>
        )}
        <EnlaceProfundo className="boton primario" href={rutas.unidad(u.torre, u.codigo)}>
          {t.comun.ingresar}
        </EnlaceProfundo>
      </div>
    </div>
  )
}
