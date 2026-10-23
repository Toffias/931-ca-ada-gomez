import type { CollectionConfig } from 'payload'

import { IDIOMA_DEFECTO, IDIOMAS } from '../lib/idiomas'
import { textosDe } from '../textos'

// Consultas que llegan desde la web: consultar precio, ficha y contacto (server action en src/app/(frontend)/acciones.ts).
// Sólo se crean desde el servidor; nadie puede leerlas sin estar logueado en el admin.
export const Consultas: CollectionConfig = {
  slug: 'consultas',
  typescript: { interface: 'Consulta' },
  labels: { singular: 'Consulta', plural: 'Consultas' },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'email', 'origen', 'idioma', 'unidad', 'estado', 'createdAt'],
    group: 'Ventas',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nombre', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'telefono', label: 'Teléfono', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'origen',
          type: 'select',
          defaultValue: 'ficha',
          options: [
            { label: 'Consultar precio', value: 'precio' },
            { label: 'Ficha de unidad', value: 'ficha' },
            { label: 'Contacto', value: 'contacto' },
          ],
        },
        { name: 'motivo', type: 'text' },
        {
          name: 'idioma',
          type: 'select',
          defaultValue: IDIOMA_DEFECTO,
          admin: { description: 'En el que estaba navegando: conviene responder en ese idioma.' },
          options: IDIOMAS.map((v) => ({ label: textosDe(v).idioma.nombre, value: v })),
        },
        { name: 'aceptaPrivacidad', label: 'Aceptó la política de privacidad', type: 'checkbox' },
      ],
    },
    { name: 'mensaje', type: 'textarea' },
    { name: 'pagina', label: 'Página de origen', type: 'text' },
    {
      type: 'row',
      fields: [
        { name: 'edificio', type: 'relationship', relationTo: 'edificios' },
        { name: 'unidad', type: 'relationship', relationTo: 'unidades' },
        {
          name: 'estado',
          type: 'select',
          defaultValue: 'nueva',
          options: [
            { label: 'Nueva', value: 'nueva' },
            { label: 'Contactada', value: 'contactada' },
            { label: 'Cerrada', value: 'cerrada' },
          ],
        },
      ],
    },
  ],
}
