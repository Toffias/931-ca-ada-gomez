import Link from 'next/link'

import type { Articulo } from '@/lib/tipos'

type Props = { articulo: Articulo; href: string; fecha: string; minutos: string; leer: string; destacada?: boolean; nivel?: 'h2' | 'h3' }

// Tarjeta de una nota en el listado y en "Notas relacionadas": foto, categoría, título, resumen, fecha y lectura.
export function TarjetaNota({ articulo: a, href, fecha, minutos, leer, destacada, nivel: Titulo = 'h2' }: Props) {
  return (
    <Link href={href} className="blog-tarjeta">
      {a.portada && <img src={destacada ? a.portada.grande : a.portada.chica} alt={a.portada.alt} loading={destacada ? undefined : 'lazy'} />}
      <div>
        {a.categoria && <span className="blog-categoria">{a.categoria}</span>}
        <Titulo>{a.titulo}</Titulo>
        {a.resumen && <p>{a.resumen}</p>}
        <span className="blog-meta">
          <time dateTime={a.fecha}>{fecha}</time> · {minutos}
        </span>
        {destacada && <span className="blog-leer">{leer} →</span>}
      </div>
    </Link>
  )
}
