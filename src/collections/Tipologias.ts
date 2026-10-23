import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'

// El contenido de la ficha (plantas 2D y 3D, galería, recorrido, brochure) cuelga de la tipología, no de la unidad:
// se produce un set por tipología (A1, B1…) y cada unidad lo hereda.
export const Tipologias: CollectionConfig = {
  slug: 'tipologias',
  typescript: { interface: 'Tipologia' },
  labels: { singular: 'Tipología', plural: 'Tipologías' },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'edificio', 'dormitorios', 'superficieTotal'],
    group: 'Proyecto',
  },
  access: { read: () => true },
  defaultSort: 'codigo',
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
    beforeValidate: [
      ({ data }) => {
        if (data?.codigo) data.titulo = data.nombre ? `${data.codigo} · ${data.nombre}` : String(data.codigo)
        return data
      },
    ],
  },
  fields: [
    { name: 'titulo', type: 'text', localized: true, admin: { hidden: true } },
    {
      type: 'row',
      fields: [
        { name: 'codigo', label: 'Código', type: 'text', required: true, admin: { placeholder: 'Ej: A1' } },
        { name: 'nombre', type: 'text', localized: true, admin: { placeholder: 'Ej: 3 ambientes con balcón' } },
        { name: 'edificio', type: 'relationship', relationTo: 'edificios', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'dormitorios', type: 'number', min: 0 },
        { name: 'banos', label: 'Baños', type: 'number', min: 0 },
        { name: 'ambientes', type: 'number', min: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'superficieInterna', label: 'Sup. interna (m²)', type: 'number' },
        { name: 'superficieBalcon', label: 'Sup. balcón (m²)', type: 'number' },
        { name: 'superficieTotal', label: 'Sup. total (m²)', type: 'number' },
      ],
    },
    {
      name: 'extras',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Balcón', value: 'balcon' },
        { label: 'Terraza', value: 'terraza' },
        { label: 'Lavadero', value: 'lavadero' },
        { label: 'Cochera', value: 'cochera' },
        { label: 'Baulera', value: 'baulera' },
        { label: 'Dependencia', value: 'dependencia' },
      ],
    },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', localized: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Imágenes',
          fields: [
            { name: 'foto', type: 'upload', relationTo: 'media', admin: { description: 'Foto principal de la ficha.' } },
            {
              type: 'row',
              fields: [
                {
                  name: 'planta',
                  label: 'Planta 3D',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Render cenital amoblado de la tipología. Si falta se dibuja un esquema.' },
                },
                {
                  name: 'planta2d',
                  label: 'Planta 2D',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Plano técnico con medidas. Con las dos, la ficha muestra un selector 2D / 3D.' },
                },
              ],
            },
            {
              name: 'galeria',
              label: 'Galería (renders interiores)',
              type: 'array',
              labels: { singular: 'Imagen', plural: 'Imágenes' },
              fields: [
                { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
                { name: 'epigrafe', type: 'text', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Extras',
          fields: [
            { name: 'recorrido', label: 'Recorrido 360', type: 'relationship', relationTo: 'recorridos' },
            {
              name: 'video',
              type: 'text',
              admin: { description: 'URL de YouTube / Vimeo, de un MP4 o de un .m3u8. Vacío = "Disponible próximamente".' },
            },
            { name: 'brochure', type: 'upload', relationTo: 'media', localized: true, admin: { description: 'PDF descargable. Puede haber uno por idioma.' } },
          ],
        },
      ],
    },
  ],
}
