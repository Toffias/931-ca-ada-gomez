import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'

// Quién firma las notas del blog. Una persona real con cargo, bio y perfiles públicos le da confianza a buscadores
// y motores de IA (E-E-A-T); se reutiliza en todas sus notas.
export const Autores: CollectionConfig = {
  slug: 'autores',
  typescript: { interface: 'Autor' },
  labels: { singular: 'Autor', plural: 'Autores del blog' },
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'cargo'], group: 'Contenido' },
  access: { read: () => true },
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nombre', type: 'text', required: true },
        { name: 'cargo', type: 'text', localized: true, admin: { placeholder: 'Ej: Gerente comercial de Desarrollos Ejemplo' } },
      ],
    },
    { name: 'foto', type: 'upload', relationTo: 'media' },
    { name: 'bio', label: 'Biografía corta', type: 'textarea', localized: true, admin: { description: 'Dos o tres líneas: experiencia y por qué sabe del tema.' } },
    {
      name: 'perfiles',
      label: 'Perfiles públicos',
      type: 'array',
      labels: { singular: 'Perfil', plural: 'Perfiles' },
      admin: { description: 'LinkedIn, Instagram, web personal… Ayudan a que los buscadores reconozcan a la persona.' },
      fields: [{ name: 'url', type: 'text', required: true }],
    },
  ],
}
