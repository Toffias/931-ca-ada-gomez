import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CompartirArticulo } from '@/components/blog/CompartirArticulo'
import { DatosEstructurados } from '@/components/blog/DatosEstructurados'
import { IndiceArticulo } from '@/components/blog/IndiceArticulo'
import { FotoAutor, TarjetaAutor } from '@/components/blog/TarjetaAutor'
import { TarjetaNota } from '@/components/blog/TarjetaNota'
import { TextoArticulo } from '@/components/blog/TextoArticulo'
import { BotonConsulta } from '@/components/landing/Desplazamiento'
import { Icono } from '@/components/ui/Icono'
import { obtenerArticulo, obtenerArticulos, obtenerProyecto } from '@/lib/datos'
import { alternativas, datosArticulo, urlAbsoluta } from '@/lib/datos-estructurados'
import { LOCALE } from '@/lib/idiomas'
import { idiomaActual, rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'

export const revalidate = 60

type Props = { params: Promise<{ slug: string }> }

// "Resumir con…": abre cada asistente con el pedido de resumir esta nota (le da tráfico y citas desde la IA)
const ASISTENTES = [
  { nombre: 'ChatGPT', url: (q: string) => `https://chatgpt.com/?q=${q}` },
  { nombre: 'Claude', url: (q: string) => `https://claude.ai/new?q=${q}` },
  { nombre: 'Perplexity', url: (q: string) => `https://www.perplexity.ai/search?q=${q}` },
  { nombre: 'Google AI Mode', url: (q: string) => `https://www.google.com/search?udm=50&q=${q}` },
]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [a, idioma] = await Promise.all([obtenerArticulo(slug), idiomaActual()])
  if (!a) return {}
  const titulo = a.seo.titulo || a.titulo
  const descripcion = a.seo.descripcion || a.resumen || undefined
  return {
    title: titulo,
    description: descripcion,
    authors: a.autor ? [{ name: a.autor.nombre }] : undefined,
    alternates: alternativas((r) => r.blog(a.slug), idioma),
    openGraph: {
      type: 'article',
      title: titulo,
      description: descripcion,
      publishedTime: a.fecha,
      modifiedTime: a.actualizado,
      authors: a.autor ? [a.autor.nombre] : undefined,
      section: a.categoria ?? undefined,
      images: a.portada ? [{ url: a.portada.grande, alt: a.portada.alt }] : undefined,
    },
  }
}

// Artículo del blog: cabecera (migas, título, resumen, autor, fecha, lectura, "resumir con IA"), portada ancha y
// dos columnas: el texto y un lateral fijo con índice, autor y compartir. Al final el autor completo y notas
// relacionadas. Todo sale del servidor (texto, FAQ y JSON-LD) para que lo lean buscadores y motores de IA.
export default async function PaginaArticulo({ params }: Props) {
  await exigirSeccion('blog')
  const { slug } = await params
  const [a, todos, proyecto, rutas, t, idioma] = await Promise.all([
    obtenerArticulo(slug),
    obtenerArticulos(),
    obtenerProyecto(),
    rutasServidor(),
    textosServidor(),
    idiomaActual(),
  ])
  if (!a) notFound()
  const tx = t.blog
  const fecha = new Intl.DateTimeFormat(LOCALE[idioma], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  // relacionadas: primero las de la misma categoría, después las más nuevas
  const relacionadas = todos
    .filter((x) => x.slug !== a.slug)
    .sort((x, y) => Number(y.categoria === a.categoria && !!a.categoria) - Number(x.categoria === a.categoria && !!a.categoria))
    .slice(0, 3)
  const url = urlAbsoluta(rutas.blog(a.slug))
  const pedido = encodeURIComponent(tx.pedidoResumen(url, proyecto.nombre))
  const migas = [
    { nombre: proyecto.nombre, url: urlAbsoluta(rutas.proyecto()) },
    { nombre: t.menu.blog, url: urlAbsoluta(rutas.blog()) },
    { nombre: a.titulo, url },
  ]
  const indice = [...a.indice, ...(a.preguntas.length ? [{ id: 'preguntas-frecuentes', texto: tx.preguntas, nivel: 2 as const }] : [])]

  return (
    <div className="pantalla landing pantalla-blog">
      <DatosEstructurados datos={datosArticulo(a, proyecto, url, idioma, migas)} />
      <article className="articulo">
        <header className="articulo-cabecera">
          <nav className="articulo-migas" aria-label={tx.migas}>
            <Link href={rutas.blog()}>{t.menu.blog}</Link>
            {a.categoria && (
              <>
                <Icono nombre="derecha" tamano={14} />
                <span>{a.categoria}</span>
              </>
            )}
          </nav>
          <h1>{a.titulo}</h1>
          {a.resumen && <p className="articulo-resumen">{a.resumen}</p>}
          <div className="articulo-datos">
            {a.autor && (
              <span className="articulo-firma">
                <FotoAutor autor={a.autor} tamano={32} />
                {a.autor.nombre}
              </span>
            )}
            <time dateTime={a.fecha}>{fecha.format(new Date(a.fecha))}</time>
            <span>{tx.minutos(a.minutos)}</span>
          </div>
          <div className="articulo-resumir">
            <span>
              <Icono nombre="chispa" tamano={16} /> {tx.resumirCon}
            </span>
            {ASISTENTES.map((x) => (
              <a key={x.nombre} className="chip" href={x.url(pedido)} target="_blank" rel="noreferrer">
                {x.nombre}
              </a>
            ))}
          </div>
        </header>

        {a.portada && (
          <figure className="articulo-portada">
            <img src={a.portada.grande} alt={a.portada.alt} width={a.portada.ancho ?? undefined} height={a.portada.alto ?? undefined} />
          </figure>
        )}

        <div className="articulo-cuerpo">
          <div className="articulo-principal">
            {indice.length > 1 && (
              <details className="indice-celular">
                <summary>{tx.indice}</summary>
                <IndiceArticulo entradas={indice} titulo={tx.indice} />
              </details>
            )}
            <TextoArticulo contenido={a.contenido} rutas={rutas} />

            {a.preguntas.length > 0 && (
              <section className="articulo-preguntas" aria-labelledby="preguntas-frecuentes">
                <h2 id="preguntas-frecuentes">{tx.preguntas}</h2>
                {a.preguntas.map((q) => (
                  <div key={q.pregunta}>
                    <h3>{q.pregunta}</h3>
                    <p>{q.respuesta}</p>
                  </div>
                ))}
              </section>
            )}
          </div>

          <aside className="articulo-lateral">
            <div className="lateral-fijo">
              {indice.length > 1 && <IndiceArticulo entradas={indice} titulo={tx.indice} />}
              {a.autor && <TarjetaAutor autor={a.autor} titulo={tx.escritoPor} />}
              <CompartirArticulo url={url} titulo={a.titulo} />
            </div>
          </aside>
        </div>

        <footer className="articulo-pie">
          {a.autor && <TarjetaAutor autor={a.autor} titulo={tx.escritoPor} completa />}
          <div className="solo-celular-blog">
            <CompartirArticulo url={url} titulo={a.titulo} />
          </div>
        </footer>
      </article>

      {relacionadas.length > 0 && (
        <section className="blog-otros">
          <h2>{tx.otras}</h2>
          <ul className="blog-lista">
            {relacionadas.map((x) => (
              <li key={x.id}>
                <TarjetaNota articulo={x} href={rutas.blog(x.slug)} fecha={fecha.format(new Date(x.fecha))} minutos={tx.minutos(x.minutos)} leer={tx.leer} nivel="h3" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="lp-cierre blog-cierre">
        <h2>{tx.tituloCierre}</h2>
        <p>{tx.textoCierre}</p>
        <div className="lp-acciones">
          <BotonConsulta className="boton primario grande">{t.consulta.consultanos}</BotonConsulta>
        </div>
      </section>
    </div>
  )
}
