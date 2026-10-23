// Datos estructurados (schema.org en JSON-LD) para buscadores y motores de IA: les dicen qué es cada página
// (artículo, preguntas frecuentes, quién lo publica) sin que tengan que deducirlo del HTML.

import { type Idioma, IDIOMAS } from './idiomas'
import { type Rutas, rutasDe } from './rutas'
import type { Articulo, Autor, Proyecto } from './tipos'

export const urlAbsoluta = (ruta: string) => new URL(ruta, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString()

/** quien publica: la desarrolladora si está cargada; si no, el proyecto */
export function organizacion(p: Proyecto) {
  const nombre = p.desarrolladora.nombre || p.nombre
  const logo = p.desarrolladora.nombre ? p.desarrolladora.logo : p.logo
  return {
    '@type': 'Organization',
    name: nombre,
    ...(p.desarrolladora.web && p.desarrolladora.nombre ? { url: p.desarrolladora.web } : {}),
    ...(logo ? { logo: urlAbsoluta(logo.url) } : {}),
  }
}

/** el autor como persona, con sus perfiles públicos para que lo reconozcan (sameAs) */
export function persona(a: Autor, p: Proyecto) {
  return {
    '@type': 'Person',
    name: a.nombre,
    ...(a.cargo ? { jobTitle: a.cargo } : {}),
    ...(a.bio ? { description: a.bio } : {}),
    ...(a.foto ? { image: urlAbsoluta(a.foto.chica) } : {}),
    ...(a.perfiles.length ? { sameAs: a.perfiles } : {}),
    worksFor: organizacion(p),
  }
}

export function datosArticulo(a: Articulo, p: Proyecto, url: string, idioma: string, migas: { nombre: string; url: string }[]) {
  const grafo: object[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${url}#articulo`,
      headline: a.seo.titulo || a.titulo,
      description: a.seo.descripcion || a.resumen || undefined,
      datePublished: a.fecha,
      dateModified: a.actualizado,
      inLanguage: idioma,
      mainEntityOfPage: url,
      ...(a.portada ? { image: urlAbsoluta(a.portada.grande) } : {}),
      ...(a.categoria ? { articleSection: a.categoria } : {}),
      timeRequired: `PT${a.minutos}M`,
      author: a.autor ? persona(a.autor, p) : organizacion(p),
      publisher: organizacion(p),
      about: { '@type': 'Residence', name: p.nombre },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: migas.map((m, i) => ({ '@type': 'ListItem', position: i + 1, name: m.nombre, item: m.url })),
    },
  ]
  if (a.preguntas.length)
    grafo.push({
      '@type': 'FAQPage',
      mainEntity: a.preguntas.map((q) => ({
        '@type': 'Question',
        name: q.pregunta,
        acceptedAnswer: { '@type': 'Answer', text: q.respuesta },
      })),
    })
  return { '@context': 'https://schema.org', '@graph': grafo }
}

export function datosBlog(articulos: Articulo[], p: Proyecto, url: string, urlDe: (slug: string) => string, titulo: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${url}#blog`,
    name: titulo,
    url,
    publisher: organizacion(p),
    blogPost: articulos.map((a) => ({
      '@type': 'BlogPosting',
      headline: a.titulo,
      url: urlDe(a.slug),
      datePublished: a.fecha,
    })),
  }
}

/** canonical + hreflang de una página, armada con las rutas de cada idioma */
export function alternativas(pagina: (r: Rutas) => string, idioma: Idioma) {
  return {
    canonical: urlAbsoluta(pagina(rutasDe(idioma))),
    languages: IDIOMAS.length > 1 ? Object.fromEntries(IDIOMAS.map((i) => [i, urlAbsoluta(pagina(rutasDe(i)))])) : undefined,
  }
}
