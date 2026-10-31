'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import type { Escena } from '@/lib/escena/tipos'
import { nombreNivel } from '@/lib/etiquetas'
import type { Nivel, PuntoDeInteres, Torre, Unidad } from '@/lib/tipos'

import { VisorEscena } from '../escena/VisorEscena'
import { EnlaceProfundo } from '../ui/EnlaceProfundo'
import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'
import { UnitPopover } from '../ui/UnitPopover'
import { BarraNiveles } from './BarraNiveles'
import { FiltrosUnidades, LeyendaEstados } from './FiltrosUnidades'
import { TooltipUnidad } from './TooltipUnidad'
import { useUnidadesEnEscena } from './useUnidadesEnEscena'

type Props = {
  torre: Pick<Torre, 'slug' | 'nombre'>
  torres: Pick<Torre, 'slug' | 'nombre'>[]
  nivel: Nivel
  niveles: Nivel[]
  unidades: Unidad[]
  escena: Escena | null
  foto?: string | null
  pois: PuntoDeInteres[]
  amenities: Record<string, string>
  resaltar?: string | null
  conTour: boolean
  dormitoriosPosibles: number[]
}

// Planta de un piso (spec E) o nivel especial con puntos de interés (spec F).
export function PantallaPlanta({ torre, torres, nivel, niveles, unidades, escena, foto, pois, amenities, resaltar, conTour, dormitoriosPosibles }: Props) {
  const router = useRouter()
  const rutas = useRutas()
  const t = useTextos()
  const s = useUnidadesEnEscena(unidades, torre.slug)
  const { setElegida } = s
  const [poi, setPoi] = useState<{ p: PuntoDeInteres; x: number; y: number } | null>(null)
  const [mouse, setMouse] = useState<[number, number] | null>(null)

  // ?u=5B: abre el popup de esa unidad sobre su forma
  useEffect(() => {
    setElegida(null)
    if (!resaltar) return
    const u = unidades.find((x) => x.codigo.toUpperCase() === resaltar.toUpperCase())
    if (!u) return
    // se espera a que el visor (y su zoom) terminen de ubicar el SVG
    let intentos = 0
    let id = 0
    const buscar = () => {
      const el = document.querySelector(`.escena [data-clave="${CSS.escape(u.codigo)}"]`)
      const r = el?.getBoundingClientRect()
      if (r && r.width > 0) setElegida({ unidad: u, x: r.left + r.width / 2, y: r.top + r.height / 2 })
      else if (intentos++ < 20) id = window.setTimeout(buscar, 50)
      else setElegida({ unidad: u, x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }
    id = window.setTimeout(buscar, 0)
    return () => clearTimeout(id)
  }, [resaltar, unidades, setElegida])

  // flechas ↑ ↓ para cambiar de piso
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select, dialog')) return
      const i = niveles.findIndex((n) => n.piso === nivel.piso)
      const destino = e.key === 'ArrowUp' ? niveles[i - 1] : e.key === 'ArrowDown' ? niveles[i + 1] : null
      if (destino) router.push(rutas.planta(torre.slug, destino.piso))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [niveles, nivel.piso, router, torre.slug, rutas])

  const cerrar = useCallback(() => setElegida(null), [setElegida])
  const libres = unidades.filter((u) => s.estadoDe(u) === 'disponible').length

  return (
    <div className="pantalla pantalla-planta" onPointerMove={(e) => s.hover && setMouse([e.clientX, e.clientY])}>
      {/* foto del frente, muy desenfocada y lavada hacia el fondo del tema, detrás de la manzana */}
      {foto && <div className="planta-ambiente" style={{ '--foto': `url("${foto}")` } as React.CSSProperties} aria-hidden />}
      <div className={`planta-lienzo${escena?.fondo ? ' con-render' : ''}`}>
        {escena ? (
          <VisorEscena
            escena={escena}
            ajuste={escena.fondo ? 'cubrir-formas' : 'contener'}
            colorDe={s.colorDe}
            apagada={s.apagada}
            hover={s.hover?.unidad.codigo}
            resaltada={s.elegida?.unidad.codigo ?? resaltar}
            // sobre el render, los mismos circulitos que en Disponibilidad; el esquema sigue con etiquetas
            etiquetas={!escena.fondo}
            marcadores={!!escena.fondo}
            etiquetaDe={(f) => {
              const u = s.unidadDe(f)
              return u ? t.escena.unidadEstado(u.codigo, t.estados[s.estadoDe(u)]) : f.clave
            }}
            pois={pois}
            onPoi={(p, x, y) => setPoi({ p, x, y })}
            onHover={s.onHover}
            onElegir={s.onElegir}
            zoom
          />
        ) : (
          <div className="vacio">
            <Icono nombre="planta" tamano={40} />
            <p>{t.planta.sinPlano}</p>
          </div>
        )}
      </div>

      <header className="planta-titulo">
        {torres.length > 1 && (
          <div className="chips" role="tablist" aria-label={t.planta.torres}>
            {torres.map((t) => (
              <Link key={t.slug} href={rutas.planta(t.slug, nivel.piso)} className={`chip${t.slug === torre.slug ? ' activo' : ''}`}>
                {t.nombre}
              </Link>
            ))}
          </div>
        )}
        <span className="kicker">{torre.nombre}</span>
        <h1>{nombreNivel(t, nivel)}</h1>
        {nivel.tipo === 'unidades' ? (
          <p className="muted">{t.planta.libres(libres, unidades.length)}</p>
        ) : (
          pois.length > 0 && <p className="muted">{t.planta.tocaPunto}</p>
        )}
      </header>

      {nivel.tipo === 'unidades' && (
        <aside className="planta-controles">
          <FiltrosUnidades dormitoriosPosibles={dormitoriosPosibles} />
          <LeyendaEstados />
        </aside>
      )}

      <BarraNiveles torre={torre.slug} niveles={niveles} actual={nivel.piso} />

      <TooltipUnidad
        hover={s.hover && mouse ? { ...s.hover, x: mouse[0], y: mouse[1] } : s.hover}
        estado={s.hover ? s.estadoDe(s.hover.unidad) : undefined}
      />
      {s.elegida && (
        <UnitPopover unidad={s.elegida.unidad} x={s.elegida.x} y={s.elegida.y} onCerrar={cerrar} conTour={conTour} />
      )}
      {poi && <PopoverPoi {...poi} amenities={amenities} conTour={conTour} onCerrar={() => setPoi(null)} />}

      {/* listado accesible e indexable, además del plano */}
      <ul className="solo-lectores">
        {unidades.map((u) => (
          <li key={u.codigo}>
            <Link href={rutas.unidad(u.torre, u.codigo)}>
              {t.planta.itemLista(u.codigo, u.superficieTotal, t.estados[s.estadoDe(u)])}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PopoverPoi({
  p,
  x,
  y,
  amenities,
  conTour,
  onCerrar,
}: {
  p: PuntoDeInteres
  x: number
  y: number
  amenities: Record<string, string>
  conTour: boolean
  onCerrar: () => void
}) {
  const rutas = useRutas()
  const t = useTextos()
  useEffect(() => {
    const fuera = (e: PointerEvent) => !(e.target as Element).closest('.popover-unidad, .poi') && onCerrar()
    document.addEventListener('pointerdown', fuera)
    return () => document.removeEventListener('pointerdown', fuera)
  }, [onCerrar])
  const left = Math.min(x + 16, window.innerWidth - 280)
  const top = Math.min(Math.max(70, y - 60), window.innerHeight - 170)
  return (
    <div className="popover-unidad popover-poi" style={{ left, top }} role="dialog" aria-label={p.etiqueta}>
      <div className="popover-cabecera">
        <h3>{p.amenity ? (amenities[p.amenity] ?? p.etiqueta) : p.etiqueta}</h3>
        <button className="boton-icono chico" aria-label={t.comun.cerrar} onClick={onCerrar}>
          <Icono nombre="cerrar" tamano={16} />
        </button>
      </div>
      <div className="acciones">
        {p.amenity && amenities[p.amenity] && (
          <EnlaceProfundo className="boton primario" href={rutas.amenities(p.amenity)}>
            <Icono nombre="galeria" tamano={16} /> {t.comun.galeria}
          </EnlaceProfundo>
        )}
        {conTour && p.recorrido && (
          <EnlaceProfundo className="boton" href={rutas.recorridos(p.recorrido)}>
            <Icono nombre="tour" tamano={16} /> {t.comun.tour360}
          </EnlaceProfundo>
        )}
      </div>
    </div>
  )
}
