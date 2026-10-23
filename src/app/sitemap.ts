import type { MetadataRoute } from 'next'

import { obtenerArticulos, obtenerTorres, obtenerUnidadesDeTorre } from '@/lib/datos'
import { IDIOMA_DEFECTO, IDIOMAS } from '@/lib/idiomas'
import { seccionesVisibles } from '@/lib/navegacion'
import { type Rutas, rutasDe } from '@/lib/rutas'

export const revalidate = 3600

// Pantallas del proyecto + plantas de cada piso + fichas de cada unidad + notas del blog, en el idioma por defecto y con sus
// versiones en los otros idiomas (hreflang) para que los buscadores indexen cada una.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const [torres, visibles, articulos] = await Promise.all([obtenerTorres(), seccionesVisibles(), obtenerArticulos()])
  const unidades = await Promise.all(torres.map((t) => obtenerUnidadesDeTorre(t.slug)))

  // cada entrada arma su ruta con las rutas de un idioma
  type Pagina = ((r: Rutas) => string) & { modificada?: string }
  const conFecha = (f: (r: Rutas) => string, modificada: string): Pagina => Object.assign(f, { modificada })
  const paginas: Pagina[] = [
    (r) => r.intro(),
    (r) => r.proyecto(),
    (r) => r.giro(0),
    (r) => r.contacto(),
    ...(visibles.amenities ? [(r: Rutas) => r.amenities()] : []),
    ...(visibles.galeria ? [(r: Rutas) => r.galeria()] : []),
    ...(visibles.obra ? [(r: Rutas) => r.obra()] : []),
    ...(visibles.ubicacion ? [(r: Rutas) => r.ubicacion()] : []),
    ...(visibles.video ? [(r: Rutas) => r.video()] : []),
    ...(visibles.recorridos ? [(r: Rutas) => r.recorridos()] : []),
    ...(visibles.blog
      ? [(r: Rutas) => r.blog(), ...articulos.map((a) => conFecha((r) => r.blog(a.slug), a.actualizado))]
      : []),
    ...torres.flatMap((t, i) => [
      ...t.niveles.map((n) => (r: Rutas) => r.planta(t.slug, n.piso)),
      ...unidades[i].map((u) => (r: Rutas) => r.unidad(t.slug, u.codigo)),
    ]),
  ]

  const url = (ruta: string) => new URL(ruta, base).toString()
  return paginas.map((pagina) => ({
    url: url(pagina(rutasDe(IDIOMA_DEFECTO))),
    lastModified: pagina.modificada,
    changeFrequency: 'weekly',
    alternates: IDIOMAS.length > 1 ? { languages: Object.fromEntries(IDIOMAS.map((i) => [i, url(pagina(rutasDe(i)))])) } : undefined,
  }))
}
