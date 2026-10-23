import { type JSXConvertersFunction, LinkJSXConverter, RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { conId, generadorIds, textoDeNodo } from '@/lib/lexical'
import type { Rutas } from '@/lib/rutas'

type DocEnlazado = { relationTo: string; value: unknown }

// Cuerpo del artículo (Lexical → JSX, en el servidor: llega como HTML a buscadores y motores de IA).
// Los links internos del editor apuntan a documentos: acá se traducen a la URL del sitio en el idioma de la página.
export function TextoArticulo({ contenido, rutas }: { contenido: unknown; rutas: Rutas }) {
  if (!contenido || typeof contenido !== 'object' || !('root' in contenido)) return null

  const hrefDe = ({ linkNode }: { linkNode: { fields: { doc?: DocEnlazado | null } } }) => {
    const doc = linkNode.fields.doc
    const slug = doc?.value && typeof doc.value === 'object' && 'slug' in doc.value ? String(doc.value.slug) : null
    if (doc?.relationTo === 'articulos') return rutas.blog(slug)
    if (doc?.relationTo === 'amenities') return rutas.amenities(slug)
    return rutas.proyecto()
  }
  // los h2/h3 llevan id para el índice lateral (mismo generador que indiceDe, en el mismo orden)
  const id = generadorIds()
  const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
    ...defaultConverters,
    ...LinkJSXConverter({ internalDocToHref: hrefDe }),
    heading: ({ node, nodesToJSX }) => {
      const Tag = node.tag
      return <Tag id={conId(node.tag) ? id(textoDeNodo(node)) : undefined}>{nodesToJSX({ nodes: node.children })}</Tag>
    },
  })

  return <RichText className="articulo-texto" data={contenido as SerializedEditorState} converters={converters} />
}
