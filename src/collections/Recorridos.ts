import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { slugify } from '../lib/slugify'
import { obligatorioEnDefecto } from '../lib/localizacion'

// Tours 360: propios (panoramas equirectangulares + enlaces, se ven con Photo Sphere Viewer)
// o externos (3DVista, Pano2VR, Matterport…) embebidos por iframe.
export const Recorridos: CollectionConfig = {
  slug: 'recorridos',
  typescript: { interface: 'Recorrido' },
  labels: { singular: 'Recorrido 360', plural: 'Recorridos 360' },
  admin: { useAsTitle: 'nombre', defaultColumns: ['nombre', 'tipo', 'orden'], group: 'Contenido' },
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
        { name: 'nombre', type: 'text', localized: true, validate: obligatorioEnDefecto, admin: { placeholder: 'Ej: Departamento A1' } },
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
      name: 'tipo',
      type: 'select',
      defaultValue: 'propio',
      options: [
        { label: 'Propio (panoramas)', value: 'propio' },
        { label: 'Externo (iframe)', value: 'externo' },
      ],
    },
    {
      name: 'url',
      label: 'URL del tour externo',
      type: 'text',
      admin: { condition: (_, s) => s?.tipo === 'externo' },
    },
    {
      name: 'plano',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_, s) => s?.tipo !== 'externo',
        description: 'Plano cuadrado con el norte arriba: con él se calcula hacia dónde apunta cada flecha.',
      },
    },
    {
      name: 'puntos',
      type: 'array',
      labels: { singular: 'Punto', plural: 'Puntos' },
      admin: { condition: (_, s) => s?.tipo !== 'externo' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'clave', type: 'text', required: true, admin: { description: 'Ej: living. Se usa en los enlaces.' } },
            { name: 'titulo', label: 'Título', type: 'text', localized: true },
            {
              name: 'rumbo',
              label: 'Rumbo (°)',
              type: 'number',
              defaultValue: 0,
              admin: { description: 'Hacia dónde mira el centro de la panorámica, desde el norte (90 = este). Es la vista con la que arranca.' },
            },
          ],
        },
        { name: 'panorama', type: 'upload', relationTo: 'media', required: true },
        {
          type: 'row',
          fields: [
            { name: 'x', label: 'X en el plano (%)', type: 'number', min: 0, max: 100 },
            { name: 'y', label: 'Y en el plano (%)', type: 'number', min: 0, max: 100 },
          ],
        },
        {
          name: 'enlaces',
          type: 'text',
          hasMany: true,
          admin: { description: 'Claves de los puntos a los que se puede saltar desde acá.' },
        },
      ],
    },
  ],
}
