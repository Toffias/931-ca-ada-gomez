import { randomBytes } from 'crypto'
import type { CollectionConfig } from 'payload'

import { IDIOMA_DEFECTO, IDIOMAS } from '../lib/idiomas'
import { textosDe } from '../textos'

// Quienes pidieron recibir por mail cada avance de obra nuevo (modal de la web, src/lib/suscripcion-obra.ts).
// Darse de baja no borra el registro: queda inactivo, así se sabe que no hay que volver a escribirle.
export const SuscriptoresObra: CollectionConfig = {
  slug: 'suscriptores-obra',
  typescript: { interface: 'SuscriptorObra' },
  labels: { singular: 'Suscriptor al avance de obra', plural: 'Suscriptores al avance de obra' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'idioma', 'activo', 'createdAt'],
    group: 'Ventas',
    description: 'Reciben un mail cada vez que se carga un avance de obra nuevo. Cada mail trae su link para darse de baja.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        if (data.email) data.email = String(data.email).trim().toLowerCase()
        // el token del link de baja: también para los que se cargan a mano en el admin
        if (!data.token && !originalDoc?.token) data.token = randomBytes(24).toString('base64url')
        const activo = data.activo ?? originalDoc?.activo ?? true
        if (!activo && !(data.bajaEn ?? originalDoc?.bajaEn)) data.bajaEn = new Date().toISOString()
        if (activo) data.bajaEn = null
        return data
      },
    ],
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    {
      type: 'row',
      fields: [
        {
          name: 'idioma',
          type: 'select',
          defaultValue: IDIOMA_DEFECTO,
          admin: { description: 'Los mails le llegan en este idioma.' },
          options: IDIOMAS.map((v) => ({ label: textosDe(v).idioma.nombre, value: v })),
        },
        { name: 'activo', label: 'Recibe los avisos', type: 'checkbox', defaultValue: true },
        { name: 'bajaEn', label: 'Se dio de baja', type: 'date', admin: { readOnly: true } },
      ],
    },
    { name: 'token', type: 'text', unique: true, index: true, admin: { hidden: true } },
  ],
}
