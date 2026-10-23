'use client'

import Link from 'next/link'

import type { Imagen } from '@/lib/tipos'

import { Galeria } from '../ui/Galeria'
import { useTextos } from '../ui/ProveedorIdioma'

type Props = {
  titulo: string
  imagenes: Imagen[]
  inicial: number
  /** base de la URL de cada imagen (`${base}/3`), para compartir la que se está viendo */
  base: string
  /** pestañas arriba (p. ej. un amenity por pestaña) */
  pestanas?: { href: string; etiqueta: string; activa: boolean }[]
  descripcion?: string | null
  acciones?: React.ReactNode
}

// Galería a pantalla completa (spec K y M): carrusel con el título de cada imagen y la URL sincronizada.
export function PantallaGaleria({ titulo, imagenes, inicial, base, pestanas, descripcion, acciones }: Props) {
  const t = useTextos()
  return (
    <div className="pantalla pantalla-galeria">
      <Galeria imagenes={imagenes} inicial={inicial} onCambio={(i) => window.history.replaceState(null, '', `${base}/${i + 1}`)} />
      <header className="galeria-titulo">
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
        {acciones}
      </header>
      {pestanas && pestanas.length > 1 && (
        <nav className="chips galeria-pestanas" aria-label={t.galeria.secciones}>
          {pestanas.map((p) => (
            <Link key={p.href} href={p.href} className={`chip${p.activa ? ' activo' : ''}`} replace>
              {p.etiqueta}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
