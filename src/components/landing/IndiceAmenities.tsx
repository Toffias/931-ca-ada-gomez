'use client'

import { useEffect, useState } from 'react'

import { useTextos } from '../ui/ProveedorIdioma'

type Props = { items: { slug: string; nombre: string; href: string }[]; inicial?: string | null }

// Índice fijo de la landing de Amenities: marca el amenity que se está leyendo, lleva a cada uno con scroll suave y
// deja la URL en /amenities/<slug> para compartirlo. Al abrir un link a un amenity, arranca ahí.
export function IndiceAmenities({ items, inicial }: Props) {
  const t = useTextos()
  const [activo, setActivo] = useState(inicial ?? null)

  useEffect(() => {
    if (inicial) document.getElementById(`amenity-${inicial}`)?.scrollIntoView({ block: 'start' })
  }, [inicial])

  useEffect(() => {
    // "leyendo" es el que cruza la franja del medio de la pantalla
    const io = new IntersectionObserver(
      (entradas) => {
        const e = entradas.find((x) => x.isIntersecting)
        if (!e) return
        const slug = (e.target as HTMLElement).dataset.amenity!
        setActivo(slug)
        const href = items.find((x) => x.slug === slug)?.href
        if (href && location.pathname !== href) history.replaceState(null, '', href)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    document.querySelectorAll('[data-amenity]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [items])

  return (
    <nav className="am-indice chips" aria-label={t.amenities.indice}>
      {items.map((a) => (
        <a
          key={a.slug}
          href={a.href}
          className={`chip${activo === a.slug ? ' activo' : ''}`}
          aria-current={activo === a.slug ? 'true' : undefined}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(`amenity-${a.slug}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {a.nombre}
        </a>
      ))}
    </nav>
  )
}
