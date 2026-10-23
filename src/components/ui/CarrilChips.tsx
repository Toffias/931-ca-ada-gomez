'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Icono } from './Icono'
import { useTextos } from './ProveedorIdioma'

/**
 * Chips en una sola línea con scroll horizontal. Las flechas aparecen sólo si hay más chips para ese lado
 * (con touch se sigue pudiendo deslizar). El chip `.activo` se trae a la vista al entrar.
 */
export function CarrilChips({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const t = useTextos().comun
  const carril = useRef<HTMLElement>(null)
  const [bordes, setBordes] = useState({ izq: false, der: false })

  useEffect(() => {
    const el = carril.current
    if (!el) return
    // centra el chip activo sólo al entrar (sin animar), después el scroll queda en manos del visitante
    const activo = el.querySelector<HTMLElement>('.activo')
    if (activo) el.scrollTo({ left: activo.offsetLeft - (el.clientWidth - activo.offsetWidth) / 2, behavior: 'instant' })
    const medir = () =>
      setBordes({ izq: el.scrollLeft > 2, der: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    medir()
    el.addEventListener('scroll', medir, { passive: true })
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => {
      el.removeEventListener('scroll', medir)
      obs.disconnect()
    }
  }, [])

  const mover = (dir: 1 | -1) => carril.current?.scrollBy({ left: dir * carril.current.clientWidth * 0.7, behavior: 'smooth' })

  return (
    <div className={`carril-chips${bordes.izq ? ' hay-izq' : ''}${bordes.der ? ' hay-der' : ''}`}>
      <button type="button" className="carril-flecha izq" onClick={() => mover(-1)} aria-label={t.anterior} tabIndex={-1}>
        <Icono nombre="izquierda" tamano={16} />
      </button>
      <nav ref={carril} className="carril" aria-label={etiqueta}>
        {children}
      </nav>
      <button type="button" className="carril-flecha der" onClick={() => mover(1)} aria-label={t.siguiente} tabIndex={-1}>
        <Icono nombre="derecha" tamano={16} />
      </button>
    </div>
  )
}
