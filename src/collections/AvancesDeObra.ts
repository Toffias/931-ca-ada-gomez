import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { obligatorioEnDefecto } from '../lib/localizacion'

// Entregas del avance de obra: el cliente las carga solo desde el admin.
export const AvancesDeObra: CollectionConfig = {
  slug: 'avances-de-obra',
  typescript: { interface: 'AvanceDeObra' },
  labels: { singular: 'Avance de obra', plural: 'Avances de obra' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'fecha', 'edificio'], group: 'Contenido' },
  access: { read: () => true },
  defaultSort: '-fecha',
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'titulo', label: 'Título', type: 'text', localized: true, validate: obligatorioEnDefecto },
        { name: 'fecha', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'edificio', type: 'relationship', relationTo: 'edificios' },
      ],
    },
    { name: 'texto', type: 'textarea', localized: true },
    {
      name: 'fotos',
      type: 'array',
      labels: { singular: 'Foto', plural: 'Fotos' },
      minRows: 1,
      fields: [
        { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
        { name: 'epigrafe', type: 'text', localized: true },
      ],
    },
  ],
}
