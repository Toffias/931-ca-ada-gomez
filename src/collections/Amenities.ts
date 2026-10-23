import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { slugify } from '../lib/slugify'
import { obligatorioEnDefecto } from '../lib/localizacion'

export const Amenities: CollectionConfig = {
  slug: 'amenities',
  typescript: { interface: 'Amenity' },
  labels: { singular: 'Amenity', plural: 'Amenities' },
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'edificio', 'orden'], group: 'Contenido' },
  access: { read: () => true },
  defaultSort: 'orden',
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nombre', type: 'text', localized: true, validate: obligatorioEnDefecto },
        {
          name: 'slug',
          type: 'text',
          unique: true,
          index: true,
          hooks: {
            beforeValidate: [({ value, data }) => (value ? slugify(value) : data?.nombre ? slugify(data.nombre) : value)],
          },
        },
        { name: 'orden', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'edificio',
      type: 'relationship',
      relationTo: 'edificios',
      admin: { description: 'Vacío si es del proyecto entero.' },
    },
    {
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      localized: true,
      admin: { description: 'Separá los párrafos con una línea en blanco.' },
    },
    {
      name: 'imagenes',
      type: 'array',
      labels: { singular: 'Imagen', plural: 'Imágenes' },
      fields: [
        { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
        { name: 'epigrafe', type: 'text', localized: true },
      ],
    },
    { name: 'recorrido', label: 'Recorrido 360', type: 'relationship', relationTo: 'recorridos' },
  ],
}
