import { obtenerArticulos, obtenerProyecto, obtenerSitio } from '@/lib/datos'
import { urlAbsoluta } from '@/lib/datos-estructurados'
import { IDIOMA_DEFECTO } from '@/lib/idiomas'
import { seccionesVisibles } from '@/lib/navegacion'
import { rutasDe } from '@/lib/rutas'
import { textosDe } from '@/textos'

export const revalidate = 3600

// /llms.txt (llmstxt.org): resumen del sitio en Markdown para los motores de IA, con las páginas principales y las
// notas del blog. Sale del admin; va en el idioma por defecto.
export async function GET() {
  const [p, sitio, visibles, articulos] = await Promise.all([obtenerProyecto(), obtenerSitio(), seccionesVisibles(), obtenerArticulos()])
  const r = rutasDe(IDIOMA_DEFECTO)
  const t = textosDe(IDIOMA_DEFECTO)
  const m = t.menu
  const link = (nombre: string, ruta: string, nota?: string | null) => `- [${nombre}](${urlAbsoluta(ruta)})${nota ? `: ${nota.replace(/\s+/g, ' ').trim()}` : ''}`
  const u = sitio.ubicacion

  const paginas = [
    link(m.proyecto, r.proyecto(), p.descripcion),
    visibles.amenities && link(m.amenities, r.amenities()),
    visibles.ubicacion && link(m.ubicacion, r.ubicacion(), [u?.barrio, u?.direccion].filter(Boolean).join(', ')),
    visibles.obra && link(m.obra, r.obra()),
    link(m.contacto, r.contacto(), [p.contacto.telefono, p.contacto.email].filter(Boolean).join(' · ')),
  ].filter((x): x is string => !!x)

  const texto = [
    `# ${p.nombre}`,
    p.eslogan && `> ${p.eslogan}`,
    p.desarrolladora.nombre && `${t.comun.desarrolloDe(p.desarrolladora.nombre)}${p.desarrolladora.web ? ` (${p.desarrolladora.web})` : ''}`,
    `## ${m.proyecto}\n\n${paginas.join('\n')}`,
    visibles.blog && articulos.length && `## ${m.blog}\n\n${articulos.map((a) => link(a.titulo, r.blog(a.slug), a.resumen)).join('\n')}`,
    p.legal && `## Legal\n\n${p.legal}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return new Response(texto + '\n', { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } })
}
