import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'
import { ValidationError } from 'payload'

export const ESTADOS_UNIDAD = [
  { label: 'Disponible', value: 'disponible' },
  { label: 'Reservada', value: 'reservada' },
  { label: 'Vendida', value: 'vendida' },
] as const

export const Unidades: CollectionConfig = {
  slug: 'unidades',
  typescript: { interface: 'Unidad' },
  labels: { singular: 'Unidad', plural: 'Unidades' },
  admin: {
    useAsTitle: 'titulo',
    defaultColumns: ['titulo', 'edificio', 'piso', 'dormitorios', 'superficieTotal', 'estado', 'precio'],
    listSearchableFields: ['codigo', 'titulo'],
    group: 'Proyecto',
    pagination: { defaultLimit: 50 },
  },
  access: { read: () => true },
  defaultSort: 'codigo',
  hooks: {
    afterChange: [revalidarDespuesDeCambio],
    afterDelete: [revalidarDespuesDeBorrar],
    beforeValidate: [
      ({ data }) => {
        if (data?.codigo) data.titulo = `Unidad ${String(data.codigo).toUpperCase()}`
        return data
      },
    ],
    beforeChange: [
      // un código no se puede repetir dentro del mismo edificio
      async ({ data, req, originalDoc }) => {
        if (!data.codigo || !data.edificio) return data
        const edificio = typeof data.edificio === 'object' ? data.edificio.id : data.edificio
        const existentes = await req.payload.find({
          collection: 'unidades',
          where: { and: [{ codigo: { equals: data.codigo } }, { edificio: { equals: edificio } }] },
          limit: 1,
          depth: 0,
          req,
        })
        const otro = existentes.docs.find((d) => d.id !== originalDoc?.id)
        if (otro) {
          throw new ValidationError({
            errors: [{ message: `Ya existe la unidad ${data.codigo} en este edificio.`, path: 'codigo' }],
          })
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'titulo', type: 'text', admin: { hidden: true } },
    {
      type: 'row',
      fields: [
        {
          name: 'codigo',
          label: 'Código',
          type: 'text',
          required: true,
          admin: { description: 'Igual que en el modelo 3D: el objeto Unidad_5B corresponde al código 5B.' },
        },
        { name: 'edificio', type: 'relationship', relationTo: 'edificios', required: true },
        { name: 'piso', type: 'number', required: true },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'estado',
          type: 'select',
          required: true,
          defaultValue: 'disponible',
          options: [...ESTADOS_UNIDAD],
        },
        {
          name: 'tipologia',
          label: 'Tipología',
          type: 'relationship',
          relationTo: 'tipologias',
          admin: { description: 'La ficha hereda de acá planta, galería y recorrido.' },
        },
        { name: 'orientacion', label: 'Orientación', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'dormitorios', type: 'number', min: 0, admin: { description: 'Vacío = el de la tipología.' } },
        { name: 'banos', label: 'Baños', type: 'number', min: 0 },
        { name: 'ambientes', type: 'number', min: 1 },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'superficieCubierta', label: 'Sup. interna (m²)', type: 'number' },
        { name: 'superficieBalcon', label: 'Sup. balcón (m²)', type: 'number' },
        { name: 'superficieTotal', label: 'Sup. total (m²)', type: 'number' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'precio', type: 'number' },
        {
          name: 'moneda',
          type: 'select',
          defaultValue: 'USD',
          options: [
            { label: 'USD', value: 'USD' },
            { label: 'ARS', value: 'ARS' },
          ],
        },
        {
          name: 'mostrarPrecio',
          label: 'Mostrar precio en la web',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    { name: 'plano', type: 'upload', relationTo: 'media', admin: { description: 'Imagen o PDF del plano.' } },
    { name: 'notas', type: 'textarea', admin: { description: 'Interno: no se muestra en la web.' } },
  ],
}
