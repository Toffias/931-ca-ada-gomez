import type { Metadata } from 'next'

import { DatosEstructurados } from '@/components/blog/DatosEstructurados'
import { TarjetaNota } from '@/components/blog/TarjetaNota'
import { obtenerArticulos, obtenerProyecto } from '@/lib/datos'
import { alternativas, datosBlog, urlAbsoluta } from '@/lib/datos-estructurados'
import { LOCALE } from '@/lib/idiomas'
import { idiomaActual, rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const [t, p, idioma] = await Promise.all([textosServidor(), obtenerProyecto(), idiomaActual()])
  return {
    title: t.menu.blog,
    description: t.blog.bajada,
    alternates: alternativas((r) => r.blog(), idioma),
    openGraph: { title: t.blog.titulo(p.nombre), description: t.blog.bajada, type: 'website' },
  }
}

// Blog: listado de notas publicadas, la más nueva primero.
export default async function PaginaBlog() {
  await exigirSeccion('blog')
  const [articulos, proyecto, rutas, t, idioma] = await Promise.all([
    obtenerArticulos(),
    obtenerProyecto(),
    rutasServidor(),
    textosServidor(),
    idiomaActual(),
  ])
  const fecha = new Intl.DateTimeFormat(LOCALE[idioma], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const titulo = t.blog.titulo(proyecto.nombre)

  return (
    <div className="pantalla landing pantalla-blog">
      <DatosEstructurados datos={datosBlog(articulos, proyecto, urlAbsoluta(rutas.blog()), (s) => urlAbsoluta(rutas.blog(s)), titulo)} />
      <header className="blog-cabecera">
        <span className="kicker">{t.blog.kicker}</span>
        <h1>{titulo}</h1>
        <p>{t.blog.bajada}</p>
      </header>
      <ul className="blog-lista">
        {articulos.map((a, i) => (
          <li key={a.id} className={i === 0 ? 'destacado' : undefined}>
            <TarjetaNota
              articulo={a}
              href={rutas.blog(a.slug)}
              fecha={fecha.format(new Date(a.fecha))}
              minutos={t.blog.minutos(a.minutos)}
              leer={t.blog.leer}
              destacada={i === 0}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
