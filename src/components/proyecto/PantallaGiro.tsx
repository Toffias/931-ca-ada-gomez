'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { VistaGiro } from '@/lib/escenas'
import { etiquetaVista } from '@/lib/etiquetas'

import { type EventoForma, VisorEscena } from '../escena/VisorEscena'
import { EnlaceProfundo } from '../ui/EnlaceProfundo'
import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'

export type TorreGiro = { slug: string; nombre: string; plantas: string; disponibles: number }

type Props = {
  vistas: VistaGiro[]
  inicial: number
  torres: TorreGiro[]
  enlaces: { tresD?: string | null; galeria?: string | null; plantas: string }
}

// Giro 360 (spec C): un render por punto de vista; las flechas giran el edificio con un video de transición
// (o un fundido si todavía no hay video). La silueta de cada torre abre "Torre X · Ingresar".
export function PantallaGiro({ vistas, inicial, torres, enlaces }: Props) {
  const rutas = useRutas()
  const t = useTextos()
  const [actual, setActual] = useState(inicial)
  const [video, setVideo] = useState<{ url: string; destino: number } | null>(null)
  const [torre, setTorre] = useState<{ t: TorreGiro; x: number; y: number } | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const toque = useRef<number | null>(null)
  const n = vistas.length

  const ir = useCallback(
    (paso: 1 | -1) => {
      if (n < 2 || video) return
      const destino = (actual + paso + n) % n
      const url = paso > 0 ? vistas[actual].videoSiguiente : vistas[actual].videoAnterior
      setTorre(null)
      if (url) setVideo({ url, destino })
      else setActual(destino)
    },
    [actual, n, vistas, video],
  )

  // la URL sigue a la vista sin volver a pedir la página
  useEffect(() => {
    if (window.location.pathname !== rutas.giro(actual)) window.history.replaceState(null, '', rutas.giro(actual))
  }, [actual, rutas])

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, dialog')) return
      if (e.key === 'ArrowRight') ir(1)
      if (e.key === 'ArrowLeft') ir(-1)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [ir])

  const elegirTorre = (e: EventoForma) => {
    const t = torres.find((x) => x.slug === e.forma.clave)
    if (t) setTorre({ t, x: e.x, y: e.y })
  }
  const hayMascaras = vistas.some((v) => v.escena.formas.length)

  if (!n)
    return (
      <div className="pantalla vacio">
        <Icono nombre="edificio" tamano={44} />
        <p>{t.giro.sinImagenes}</p>
        <EnlaceProfundo className="boton primario" href={enlaces.plantas}>
          {t.comun.verPlantas}
        </EnlaceProfundo>
      </div>
    )

  return (
    <div
      className="pantalla pantalla-giro"
      onPointerDown={(e) => (toque.current = e.clientX)}
      onPointerUp={(e) => {
        const dx = toque.current == null ? 0 : e.clientX - toque.current
        toque.current = null
        if (e.pointerType !== 'mouse' && Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1)
      }}
    >
      {vistas.map((v, i) => (
        <div key={i} className={`giro-capa${i === actual ? ' activa' : ''}`} aria-hidden={i !== actual}>
          <VisorEscena
            escena={v.escena}
            ajuste="cubrir"
            pintar="hover"
            etiquetas={false}
            hover={hover}
            onHover={(e) => setHover(e?.forma.clave ?? null)}
            onElegir={elegirTorre}
            etiquetaDe={(f) => torres.find((t) => t.slug === f.clave)?.nombre ?? f.clave}
          />
        </div>
      ))}

      {video && (
        <video
          key={video.url}
          className="giro-video"
          src={video.url}
          autoPlay
          muted
          playsInline
          onEnded={() => {
            setActual(video.destino)
            setVideo(null)
          }}
          onError={() => {
            setActual(video.destino)
            setVideo(null)
          }}
        />
      )}

      <div className="giro-degradado" aria-hidden />

      {n > 1 && (
        <>
          <button className="boton-icono giro-flecha izq" aria-label={t.giro.izquierda} onClick={() => ir(-1)} disabled={!!video}>
            <Icono nombre="izquierda" />
          </button>
          <button className="boton-icono giro-flecha der" aria-label={t.giro.derecha} onClick={() => ir(1)} disabled={!!video}>
            <Icono nombre="derecha" />
          </button>
        </>
      )}

      <div className="giro-pie">
        <div className="giro-vistas" aria-label={t.giro.vistas}>
          {vistas.map((v, i) => (
            <button
              key={i}
              className={`punto-vista${i === actual ? ' activo' : ''}`}
              aria-label={etiquetaVista(t, v.etiqueta, i)}
              aria-current={i === actual}
              onClick={() => !video && setActual(i)}
            />
          ))}
          <span>{etiquetaVista(t, vistas[actual].etiqueta, actual)}</span>
        </div>

        {/* sin máscaras todavía: la torre se elige con botones */}
        {!hayMascaras && (
          <div className="giro-torres">
            {torres.map((x) => (
              <EnlaceProfundo key={x.slug} href={x.plantas} className="boton">
                {x.nombre} <small>· {t.comun.disponibles(x.disponibles)}</small>
              </EnlaceProfundo>
            ))}
          </div>
        )}

        <div className="giro-acciones">
          {enlaces.tresD && (
            <Link className="boton" href={enlaces.tresD}>
              <Icono nombre="cubo" tamano={16} /> {t.comun.modo3d}
            </Link>
          )}
          {enlaces.galeria && (
            <Link className="boton" href={enlaces.galeria}>
              <Icono nombre="galeria" tamano={16} /> {t.comun.galeria}
            </Link>
          )}
          <EnlaceProfundo className="boton primario" href={enlaces.plantas}>
            <Icono nombre="planta" tamano={16} /> {t.comun.verPlantas}
          </EnlaceProfundo>
        </div>
      </div>

      {torre && (
        <div className="popover-unidad popover-torre" style={{ left: Math.min(torre.x + 16, window.innerWidth - 260), top: Math.max(70, torre.y - 50) }}>
          <div className="popover-cabecera">
            <h3>{torre.t.nombre}</h3>
            <button className="boton-icono chico" aria-label={t.comun.cerrar} onClick={() => setTorre(null)}>
              <Icono nombre="cerrar" tamano={16} />
            </button>
          </div>
          <p className="muted">{t.comun.unidadesDisponibles(torre.t.disponibles)}</p>
          <EnlaceProfundo className="boton primario" href={torre.t.plantas}>
            {t.comun.ingresar}
          </EnlaceProfundo>
        </div>
      )}
    </div>
  )
}
