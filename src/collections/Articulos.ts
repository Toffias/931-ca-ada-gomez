import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { obligatorioEnDefecto } from '../lib/localizacion'
import { slugify } from '../lib/slugify'

// Blog del proyecto: notas que carga el cliente para posicionar en buscadores y motores de IA (SEO/GEO).
// Con borradores: sólo lo publicado llega al sitio (y a la API pública).
export const Articulos: CollectionConfig = {
  slug: 'articulos',
  typescript: { interface: 'Articulo' },
  labels: { singular: 'Artículo', plural: 'Blog' },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'categoria', 'fecha', '_status'],
    group: 'Contenido',
    description: 'Notas del blog. Un buen artículo responde una pregunta concreta (sobre el barrio, la obra, cómo comprar…) en el primer párrafo.',
  },
  access: { read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }) },
  versions: { drafts: true },
  defaultSort: '-fecha',
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
  },
  fields: [
    { name: 'titulo', label: 'Título', type: 'text', localized: true, validate: obligatorioEnDefecto },
    {
      name: 'categoria',
      label: 'Categoría',
      type: 'text',
      localized: true,
      admin: { placeholder: 'Ej: Guías de compra, El barrio, Novedades de obra' },
    },
    {
      name: 'resumen',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'Dos o tres oraciones con la respuesta principal. Se muestra en el listado y arriba del artículo, y es lo que más citan Google y los motores de IA.',
      },
    },
    { name: 'portada', type: 'upload', relationTo: 'media' },
    { name: 'contenido', type: 'richText', localized: true },
    {
      name: 'preguntas',
      label: 'Preguntas frecuentes',
      type: 'array',
      labels: { singular: 'Pregunta', plural: 'Preguntas' },
      admin: { description: 'Opcional. Se muestran al final y se marcan como FAQ para los buscadores.' },
      fields: [
        { name: 'pregunta', type: 'text', localized: true, validate: obligatorioEnDefecto },
        { name: 'respuesta', type: 'textarea', localized: true, validate: obligatorioEnDefecto },
      ],
    },
    // barra lateral
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Dirección del artículo (/blog/<slug>). Se arma sola desde el título.' },
      hooks: {
        beforeValidate: [({ value, data }) => (value ? slugify(value) : data?.titulo ? slugify(data.titulo) : value)],
      },
    },
    {
      name: 'fecha',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayOnly' } },
    },
    {
      name: 'autor',
      type: 'relationship',
      relationTo: 'autores',
      admin: { position: 'sidebar', description: 'Quién firma la nota (suma confianza para los buscadores). Se cargan en "Autores del blog".' },
    },
    {
      name: 'seo',
      label: 'SEO',
      type: 'group',
      admin: { position: 'sidebar' },
      fields: [
        {
          name: 'titulo',
          label: 'Título para buscadores',
          type: 'text',
          localized: true,
          admin: { description: 'Opcional; si queda vacío se usa el título. Ideal: hasta 60 caracteres.' },
        },
        {
          name: 'descripcion',
          label: 'Descripción para buscadores',
          type: 'textarea',
          localized: true,
          admin: { description: 'Opcional; si queda vacía se usa el resumen. Ideal: hasta 155 caracteres.' },
        },
      ],
    },
  ],
}
