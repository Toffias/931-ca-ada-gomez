'use client'

import { useEffect, useState } from 'react'

import type { Articulo } from '@/lib/tipos'

// Índice de la nota: salta a cada subtítulo y marca en cuál está el lector. La página scrollea dentro de
// .pantalla-blog (no la ventana), por eso el salto es con scrollIntoView y no con el ancla sola.
export function IndiceArticulo({ entradas, titulo }: { entradas: Articulo['indice']; titulo: string }) {
  const [activa, setActiva] = useState(entradas[0]?.id)

  useEffect(() => {
    const titulos = entradas.map((e) => document.getElementById(e.id)).filter((el): el is HTMLElement => !!el)
    if (!titulos.length) return
    // activa = el último subtítulo que ya pasó por el tercio de arriba de la pantalla
    const observador = new IntersectionObserver(
      () => {
        const pasados = titulos.filter((el) => el.getBoundingClientRect().top < window.innerHeight * 0.3)
        setActiva((pasados.at(-1) ?? titulos[0]).id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] },
    )
    titulos.forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [entradas])

  const ir = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.replaceState(null, '', `#${id}`)
    setActiva(id)
  }

  return (
    <nav className="indice-articulo" aria-label={titulo}>
      <p className="lateral-titulo">{titulo}</p>
      <ol>
        {entradas.map((e) => (
          <li key={e.id} className={e.nivel === 3 ? 'sub' : undefined}>
            <a href={`#${e.id}`} onClick={(ev) => ir(ev, e.id)} aria-current={activa === e.id ? 'location' : undefined}>
              {e.texto}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
