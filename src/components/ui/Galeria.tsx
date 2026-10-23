'use client'

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Imagen } from '@/lib/tipos'

import { Icono } from './Icono'
import { useTextos } from './ProveedorIdioma'

type Props = {
  imagenes: Imagen[]
  /** índice inicial (0-based) */
  inicial?: number
  /** para sincronizar la URL (/galeria/3) */
  onCambio?: (i: number) => void
  miniaturas?: boolean
  /** 'cubrir' llena el cuadro (renders); 'contener' muestra la imagen entera (plantas) */
  ajuste?: 'cubrir' | 'contener'
  className?: string
}

// Carrusel (spec K, M, O y galería de la ficha): swipe, flechas, teclado, epígrafe y miniaturas.
export function Galeria({ imagenes, inicial = 0, onCambio, miniaturas = true, ajuste = 'cubrir', className }: Props) {
  const t = useTextos()
  const [ref, api] = useEmblaCarousel({ loop: imagenes.length > 1, startIndex: inicial })
  const [actual, setActual] = useState(inicial)
  const caja = useRef<HTMLDivElement>(null)
  const onCambioRef = useRef(onCambio)
  onCambioRef.current = onCambio

  useEffect(() => {
    if (!api) return
    const alSeleccionar = () => {
      const i = api.selectedScrollSnap()
      setActual(i)
      onCambioRef.current?.(i)
    }
    api.on('select', alSeleccionar)
    return () => {
      api.off('select', alSeleccionar)
    }
  }, [api])

  useEffect(() => {
    if (api && api.selectedScrollSnap() !== inicial) api.scrollTo(inicial, true)
  }, [api, inicial])

  const ir = useCallback((i: number) => api?.scrollTo(i), [api])
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') api?.scrollPrev()
    if (e.key === 'ArrowRight') api?.scrollNext()
  }
  const pantallaCompleta = () =>
    document.fullscreenElement ? document.exitFullscreen() : caja.current?.requestFullscreen?.().catch(() => {})

  if (!imagenes.length)
    return (
      <div className={`galeria-carrusel vacia ${className ?? ''}`}>
        <div className="vacio">
          <Icono nombre="galeria" tamano={40} />
          <p>{t.galeria.vacia}</p>
        </div>
      </div>
    )

  const img = imagenes[actual]
  return (
    <div
      ref={caja}
      className={`galeria-carrusel ajuste-${ajuste} ${className ?? ''}`}
      tabIndex={0}
      onKeyDown={tecla}
      role="region"
      aria-roledescription={t.galeria.carrusel}
      aria-label={t.galeria.region}
    >
      <div className="galeria-vista" ref={ref}>
        <div className="galeria-tira">
          {imagenes.map((im, i) => (
            <figure key={`${im.url}-${i}`} className="galeria-slide" aria-roledescription={t.galeria.imagen} aria-label={t.galeria.posicion(i + 1, imagenes.length)}>
              <img src={im.grande} alt={im.alt} loading={Math.abs(i - actual) <= 1 ? 'eager' : 'lazy'} draggable={false} />
            </figure>
          ))}
        </div>
      </div>

      {imagenes.length > 1 && (
        <>
          <button className="boton-icono galeria-flecha izq" aria-label={t.comun.anterior} onClick={() => api?.scrollPrev()}>
            <Icono nombre="izquierda" />
          </button>
          <button className="boton-icono galeria-flecha der" aria-label={t.comun.siguiente} onClick={() => api?.scrollNext()}>
            <Icono nombre="derecha" />
          </button>
        </>
      )}

      <div className="galeria-pie">
        <span className="galeria-epigrafe">{img?.epigrafe || img?.alt}</span>
        <span className="galeria-contador">
          {actual + 1} / {imagenes.length}
        </span>
        <button className="boton-icono chico solo-escritorio" aria-label={t.comun.pantallaCompleta} onClick={pantallaCompleta}>
          <Icono nombre="pantalla" tamano={16} />
        </button>
      </div>

      {miniaturas && imagenes.length > 1 && (
        <div className="galeria-miniaturas" role="tablist" aria-label={t.galeria.miniaturas}>
          {imagenes.map((im, i) => (
            <button
              key={`${im.url}-${i}`}
              role="tab"
              aria-selected={i === actual}
              aria-label={t.galeria.verImagen(i + 1)}
              className={i === actual ? 'activa' : ''}
              onClick={() => ir(i)}
            >
              <img src={im.chica} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
