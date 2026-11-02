import type { CollectionAfterChangeHook, CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { obligatorioEnDefecto } from '../lib/localizacion'
import { avisarAvance } from '../lib/suscripcion-obra'

// Sólo lo que carga una persona en el admin: el seed y los snapshots también crean avances y no tienen que mandar mails.
const avisarSuscriptores: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || !req.user || doc.avisarSuscriptores === false) return doc
  const enviar = () => avisarAvance(req.payload, doc.id).catch((err) => req.payload.logger.error({ err }, '[suscripción obra]'))
  // after(): el admin guarda sin esperar los mails (y el avance ya quedó en la base cuando salen)
  try {
    const { after } = await import('next/server')
    after(enviar)
  } catch {
    void enviar()
  }
  return doc
}

// Entregas del avance de obra: el cliente las carga solo desde el admin.
export const AvancesDeObra: CollectionConfig = {
  slug: 'avances-de-obra',
  typescript: { interface: 'AvanceDeObra' },
  labels: { singular: 'Avance de obra', plural: 'Avances de obra' },
  admin: { useAsTitle: 'titulo', defaultColumns: ['titulo', 'fecha', 'edificio'], group: 'Contenido' },
  access: { read: () => true },
  defaultSort: '-fecha',
  hooks: {
    afterChange: [revalidarDespuesDeCambio, avisarSuscriptores],
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
      name: 'avisarSuscriptores',
      label: 'Avisar por mail a los suscriptores',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Al crear el avance se manda un mail a cada suscriptor (Ventas → Suscriptores). Destildar para cargar entregas viejas sin avisar.',
      },
    },
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
