'use client'

import { useEffect, useRef, useState } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'

import { encuadreCubrir, type Margenes } from '@/lib/escena/encuadre'
import { aPuntosSVG } from '@/lib/esquemas/geometria'
import type { Escena, FormaEscena } from '@/lib/escena/tipos'
import type { PuntoDeInteres } from '@/lib/tipos'

import { Icono } from '../ui/Icono'
import { useTextos } from '../ui/ProveedorIdioma'
import { formaCalle, Manzana } from './Manzana'

export type EventoForma = { forma: FormaEscena; x: number; y: number }

type Props = {
  escena: Escena
  /** color de relleno de cada forma (p. ej. por estado); null = sin color */
  colorDe?: (f: FormaEscena) => string | null
  /** formas que no pasan los filtros: se ven apagadas y no se pueden elegir */
  apagada?: (f: FormaEscena) => boolean
  resaltada?: string | null
  hover?: string | null
  /** 'siempre': las formas se ven pintadas; 'hover': sólo al pasar (siluetas sobre un render) */
  pintar?: 'siempre' | 'hover'
  etiquetas?: boolean
  /** un punto del color de cada forma en su centro, en lugar de pintarla (disponibilidad sobre fotos) */
  marcadores?: boolean
  etiquetaDe?: (f: FormaEscena) => string | undefined
  pois?: PuntoDeInteres[]
  onPoi?: (p: PuntoDeInteres, x: number, y: number) => void
  onHover?: (e: EventoForma | null) => void
  onElegir?: (e: EventoForma) => void
  /**
   * 'contener' muestra todo (esquemas); 'cubrir' llena la pantalla (renders); 'cubrir-formas' llena la pantalla
   * centrado en las formas, sin dejar ninguna afuera (renders de plantas; ver lib/escena/encuadre.ts). El lugar que
   * ocupa la interfaz se declara en CSS con --encuadre-arriba / -derecha / -abajo / -izquierda.
   */
  ajuste?: 'contener' | 'cubrir' | 'cubrir-formas'
  zoom?: boolean
  className?: string
}

const claveForma = (f: FormaEscena) => (f.torre ? `${f.torre}/${f.clave}` : f.clave)

// Visor de escena (spec C/E/F/J): fondo (render o esquema) + formas clickeables en el mismo viewBox.
// El render va como <image> dentro del SVG, así las máscaras quedan alineadas al píxel en cualquier pantalla.
export function VisorEscena({
  escena,
  colorDe,
  apagada,
  resaltada,
  hover,
  pintar = 'siempre',
  etiquetas = true,
  marcadores = false,
  etiquetaDe,
  pois,
  onPoi,
  onHover,
  onElegir,
  ajuste = 'contener',
  zoom = false,
  className,
}: Props) {
  const { ancho, alto, fondo, esquema, entorno, formas } = escena
  const t = useTextos()
  const inicio = useRef<[number, number] | null>(null)
  const caja = useRef<HTMLDivElement>(null)

  // renders de plantas con fondo "blanco" (docs/renders-plantas.md §4): salen transparentes. Se mira el píxel de
  // una esquina; hasta saberlo no se pone el relleno desenfocado
  const [opaco, setOpaco] = useState(false)
  useEffect(() => {
    setOpaco(false)
    if (!fondo || ajuste !== 'cubrir-formas') return
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 1
      const ctx = c.getContext('2d')
      if (!ctx) return setOpaco(true)
      ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1)
      setOpaco(ctx.getImageData(0, 0, 1, 1).data[3] > 250)
    }
    img.src = fondo.url
    return () => void (img.onload = null)
  }, [fondo?.url, ajuste])

  // el texto va en unidades del viewBox: se agranda si la escena se ve chica (celular) para no bajar de ~12 px
  const [pxPorUnidad, setPxPorUnidad] = useState(1)
  // arrastrar sólo mueve la imagen si está acercada; sin zoom queda fija
  const [acercada, setAcercada] = useState(false)
  const [vista, setVista] = useState<[number, number, number, number] | null>(null)
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const medir = () => {
      // tamaño de layout y no getBoundingClientRect: durante una transición el lienzo está rotado o escalado, y
      // medido así el encuadre quedaría con zoom (y al terminar la animación no hay resize que lo corrija)
      const width = el.clientWidth
      const height = el.clientHeight
      if (!width || !height) return
      if (ajuste === 'cubrir-formas') {
        // una variable CSS con calc() se lee como texto sin resolver: se mide con un elemento de prueba
        const px = (n: string) => {
          const p = document.createElement('div')
          p.style.cssText = `position:absolute;visibility:hidden;height:var(--encuadre-${n}, 0px)`
          el.appendChild(p)
          const v = p.offsetHeight
          p.remove()
          return v
        }
        const m: Margenes = {
          arriba: px('arriba'),
          derecha: px('derecha'),
          abajo: px('abajo'),
          izquierda: px('izquierda'),
          cubrir: getComputedStyle(el).getPropertyValue('--encuadre-cubrir').trim() === '1',
        }
        // con manzana, el encuadre se aleja lo necesario para mostrar también la calle
        const e = encuadreCubrir({ ancho, alto, formas: entorno ? [...formas, formaCalle(entorno)] : formas }, width, height, m)
        setVista(e.vista)
        setPxPorUnidad(e.escala)
        return
      }
      setVista(null)
      const k = ajuste === 'cubrir' ? Math.max(width / ancho, height / alto) : Math.min(width / ancho, height / alto)
      setPxPorUnidad(k)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ancho, alto, ajuste, formas, entorno])
  // con 'cubrir-formas' el texto se mide sobre lo que se ve, no sobre toda la imagen
  const lado = vista ? Math.max(vista[2], vista[3]) : Math.max(ancho, alto)
  const fuente = Math.min(Math.max(lado / 48, 15 / pxPorUnidad), lado / 22)

  // un arrastre para mover el zoom no cuenta como click
  const fueClick = (e: React.PointerEvent | React.MouseEvent) => {
    const i = inicio.current
    return !i || Math.hypot(e.clientX - i[0], e.clientY - i[1]) < 6
  }

  const svg = (
    <svg
      className={`escena-svg${fondo ? ' con-render' : ' esquema'}`}
      viewBox={vista ? vista.join(' ') : `0 0 ${ancho} ${alto}`}
      preserveAspectRatio={ajuste === 'contener' ? 'xMidYMid meet' : 'xMidYMid slice'}
      onPointerDown={(e) => (inicio.current = [e.clientX, e.clientY])}
      role="img"
      aria-label={esquema?.titulo ?? fondo?.alt ?? t.escena.plano}
    >
      {entorno && <Manzana entorno={entorno} />}
      {fondo && <image href={fondo.url} x={0} y={0} width={ancho} height={alto} preserveAspectRatio="xMidYMid slice" />}

      {esquema && (
        <g className="esquema-dibujo" aria-hidden>
          <defs>
            <pattern id="grilla" width={ancho / 40} height={ancho / 40} patternUnits="userSpaceOnUse">
              <path d={`M ${ancho / 40} 0 L 0 0 0 ${ancho / 40}`} fill="none" className="grilla" />
            </pattern>
          </defs>
          <rect width={ancho} height={alto} fill="url(#grilla)" />
          {esquema.suelo != null && <line className="suelo" x1={0} x2={ancho} y1={esquema.suelo} y2={esquema.suelo} />}
          {esquema.contornos.map((c, i) => (
            <polygon key={i} className="contorno" points={aPuntosSVG(c)} />
          ))}
          {esquema.lineas?.map(([a, b], i) => (
            <line key={i} className="entrepiso" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
          ))}
          {esquema.norte != null && (
            <g className="norte" transform={`translate(${ancho - fuente * 2.4} ${fuente * 2.4}) rotate(${esquema.norte})`}>
              <circle r={fuente * 1.3} />
              <path d={`M 0 ${-fuente} L ${fuente * 0.45} ${fuente * 0.5} L 0 ${fuente * 0.2} L ${-fuente * 0.45} ${fuente * 0.5} Z`} />
              <text y={-fuente * 1.6} fontSize={fuente * 0.7} textAnchor="middle">
                N
              </text>
            </g>
          )}
          {esquema.escala && (
            <g className="escala" transform={`translate(${ancho - fuente * 1.1 - esquema.escala.px} ${fuente * (esquema.norte != null ? 5.4 : 1.6)})`}>
              <line x1={0} x2={esquema.escala.px} y1={0} y2={0} />
              <line x1={0} x2={0} y1={-fuente * 0.3} y2={fuente * 0.3} />
              <line x1={esquema.escala.px} x2={esquema.escala.px} y1={-fuente * 0.3} y2={fuente * 0.3} />
              <text x={esquema.escala.px / 2} y={-fuente * 0.5} fontSize={fuente * 0.6} textAnchor="middle">
                {esquema.escala.metros} m
              </text>
            </g>
          )}
        </g>
      )}

      <g className={`formas pintar-${pintar}${marcadores ? ' con-marcadores' : ''}`}>
        {formas.map((f) => {
          const k = claveForma(f)
          const color = colorDe?.(f) ?? null
          const off = apagada?.(f) ?? false
          const clases = ['forma', `forma-${f.tipo}`, off && 'apagada', resaltada === k && 'resaltada', hover === k && 'hover']
            .filter(Boolean)
            .join(' ')
          const props = {
            className: clases,
            style: color ? ({ '--color': color } as React.CSSProperties) : undefined,
            'data-clave': k,
            tabIndex: off ? -1 : 0,
            role: 'button',
            'aria-label': etiquetaDe?.(f) ?? f.etiqueta ?? f.clave,
            'aria-disabled': off || undefined,
            onPointerEnter: (e: React.PointerEvent) => !off && e.pointerType === 'mouse' && onHover?.({ forma: f, x: e.clientX, y: e.clientY }),
            onPointerLeave: (e: React.PointerEvent) => e.pointerType === 'mouse' && onHover?.(null),
            onClick: (e: React.MouseEvent) => !off && fueClick(e) && onElegir?.({ forma: f, x: e.clientX, y: e.clientY }),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (off || (e.key !== 'Enter' && e.key !== ' ')) return
              e.preventDefault()
              const r = (e.currentTarget as SVGGraphicsElement).getBoundingClientRect()
              onElegir?.({ forma: f, x: r.left + r.width / 2, y: r.top + r.height / 2 })
            },
          }
          return f.d ? <path key={k} d={f.d} {...props} /> : <polygon key={k} points={aPuntosSVG(f.puntos ?? [])} {...props} />
        })}
      </g>

      {marcadores && (
        // tamaño fijo en pantalla (~6 px de radio): se mide en unidades del viewBox con pxPorUnidad
        <g className="marcadores" aria-hidden>
          {formas.map((f) => {
            const k = claveForma(f)
            const r = 5.5 / pxPorUnidad
            const clases = ['marcador', apagada?.(f) && 'apagada', resaltada === k && 'resaltada', hover === k && 'hover']
              .filter(Boolean)
              .join(' ')
            return (
              <g key={k} transform={`translate(${f.centro[0]} ${f.centro[1]})`}>
                <g className={clases} style={colorDe?.(f) ? ({ '--color': colorDe(f) } as React.CSSProperties) : undefined}>
                  <circle className="marcador-latido" r={r * 1.9} />
                  <circle className="marcador-halo" r={r * 2.6} />
                  <circle className="marcador-anillo" r={r * 1.9} />
                  <circle className="marcador-punto" r={r} />
                </g>
              </g>
            )
          })}
        </g>
      )}

      {etiquetas && (
        <g className="etiquetas" aria-hidden>
          {formas.map((f) => {
            const texto = f.etiqueta ?? f.clave
            const w = fuente * (0.62 * texto.length + 1)
            const h = fuente * 1.35
            const k = claveForma(f)
            return (
              <g
                key={k}
                className={`etiqueta${apagada?.(f) ? ' apagada' : ''}${resaltada === k ? ' resaltada' : ''}`}
                transform={`translate(${f.centro[0]} ${f.centro[1]})`}
                style={colorDe?.(f) ? ({ '--color': colorDe(f) } as React.CSSProperties) : undefined}
              >
                <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} />
                <text fontSize={fuente * 0.78} textAnchor="middle" dominantBaseline="central">
                  {texto}
                </text>
              </g>
            )
          })}
        </g>
      )}

      {pois?.map((p) => {
        const x = (p.x / 100) * ancho
        const y = (p.y / 100) * alto
        return (
          <g
            key={p.clave}
            className="poi"
            transform={`translate(${x} ${y})`}
            tabIndex={0}
            role="button"
            aria-label={p.etiqueta}
            onClick={(e) => fueClick(e) && onPoi?.(p, e.clientX, e.clientY)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return
              e.preventDefault()
              const r = e.currentTarget.getBoundingClientRect()
              onPoi?.(p, r.left + r.width / 2, r.top + r.height / 2)
            }}
          >
            <circle r={fuente * 0.9} className="poi-halo" />
            <circle r={fuente * 0.45} className="poi-punto" />
            <text x={fuente * 1.3} fontSize={fuente * 0.8} dominantBaseline="central">
              {p.etiqueta}
            </text>
          </g>
        )
      })}
    </svg>
  )

  // si para mostrar todas las formas hay que alejarse más que la imagen, el hueco se llena con la misma imagen
  // desenfocada en lugar de un color liso. Un render con fondo transparente no lo necesita (y desenfocado haría
  // un halo alrededor del edificio): ahí el hueco es el fondo del tema, igual que alrededor del edificio
  const relleno = fondo && ajuste === 'cubrir-formas' && opaco && (
    <div className="escena-relleno" style={{ backgroundImage: `url("${fondo.url}")` }} aria-hidden />
  )

  if (!zoom)
    return (
      <div ref={caja} className={`escena ${className ?? ''}`}>
        {relleno}
        {svg}
      </div>
    )

  // zoom sólo con los botones (y pellizco en pantallas táctiles, donde los botones no se muestran):
  // la rueda del mouse queda para la página y el doble click no acerca
  return (
    <div ref={caja} className={`escena ${className ?? ''}`}>
      {relleno}
      <TransformWrapper
        minScale={1}
        maxScale={5}
        doubleClick={{ disabled: true }}
        wheel={{ disabled: true }}
        panning={{ disabled: !acercada }}
        onTransform={(_, { scale }) => setAcercada(scale > 1.01)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent wrapperClass="escena-zoom" contentClass="escena-zoom-contenido">
              {svg}
            </TransformComponent>
            <div className="controles-zoom" role="group" aria-label={t.escena.zoom}>
              <button className="boton-icono chico" aria-label={t.escena.acercar} onClick={() => zoomIn()}>
                <Icono nombre="mas" tamano={18} />
              </button>
              <button className="boton-icono chico" aria-label={t.escena.alejar} onClick={() => zoomOut()}>
                <Icono nombre="menos" tamano={18} />
              </button>
              <button className="boton-icono chico" aria-label={t.escena.restablecer} onClick={() => resetTransform()}>
                <Icono nombre="restablecer" tamano={18} />
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  )
}
