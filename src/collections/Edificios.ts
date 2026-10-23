import type { CollectionConfig } from 'payload'

import { revalidarDespuesDeBorrar, revalidarDespuesDeCambio } from '../hooks/revalidar'

import { slugify } from '../lib/slugify'
import { obligatorioEnDefecto } from '../lib/localizacion'

export const Edificios: CollectionConfig = {
  slug: 'edificios',
  typescript: { interface: 'Edificio' },
  labels: { singular: 'Edificio', plural: 'Edificios' },
  admin: {
    useAsTitle: 'nombre',
    defaultColumns: ['nombre', 'estadoObra', 'orden', 'updatedAt'],
    group: 'Proyecto',
  },
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
        {
          name: 'slug',
          type: 'text',
          unique: true,
          index: true,
          admin: { description: 'Se genera solo a partir del nombre. Es la URL: /p/<slug>/<piso>' },
          hooks: {
            beforeValidate: [({ value, data }) => (value ? slugify(value) : data?.nombre ? slugify(data.nombre) : value)],
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'estadoObra',
          label: 'Estado de obra',
          type: 'select',
          defaultValue: 'preventa',
          options: [
            { label: 'Preventa', value: 'preventa' },
            { label: 'En construcción', value: 'construccion' },
            { label: 'Terminado', value: 'terminado' },
          ],
        },
        { name: 'entrega', label: 'Entrega estimada', type: 'text', localized: true, admin: { placeholder: 'Ej: Diciembre 2027' } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'direccion', label: 'Dirección', type: 'text' },
        {
          name: 'orden',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Orden en el menú cuando el proyecto tiene varias torres.' },
        },
      ],
    },
    { name: 'bajada', label: 'Bajada', type: 'textarea', localized: true, admin: { description: 'Texto corto para la portada.' } },
    {
      name: 'caracteristicas',
      label: 'Características / amenities',
      type: 'array',
      labels: { singular: 'Característica', plural: 'Características' },
      fields: [{ name: 'texto', type: 'text', localized: true, validate: obligatorioEnDefecto }],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Modelo 3D',
          fields: [
            {
              name: 'modelo3D',
              label: 'Modelo 3D (.glb)',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: {
                description:
                  'Exportado desde Blender con scripts/blender/exportar_web.py. Las unidades del modelo se vinculan por código (Unidad_5B → 5B).',
              },
            },
            {
              name: 'config3D',
              label: 'Configuración del visor',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'escala',
                      type: 'number',
                      defaultValue: 1,
                      admin: { description: 'Metros por unidad del modelo. 1 si en Blender ya trabajaste en metros.' },
                    },
                    { name: 'solElevacion', label: 'Sol: elevación (°)', type: 'number', defaultValue: 30 },
                    { name: 'solAzimut', label: 'Sol: azimut (°)', type: 'number', defaultValue: -20 },
                  ],
                },
                {
                  name: 'texturasRealistas',
                  label: 'Texturas realistas (revoque, piedra, veredas) y desgaste',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: { description: 'Se configuran en src/components/visor/convenciones.ts → TEXTURAS.' },
                },
                {
                  name: 'ventanasNoche',
                  label: 'Ventanas encendidas de noche',
                  type: 'group',
                  admin: {
                    description:
                      'Para modelos sin textura emisiva: se prenden ventanas al azar en el material indicado. Medidas en metros.',
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'material', type: 'text', defaultValue: 'WEB_Vidrio' },
                        { name: 'alturaPrimerPiso', label: 'Altura piso 1 (m)', type: 'number', defaultValue: 3 },
                        { name: 'alturaPiso', label: 'Alto de piso (m)', type: 'number', defaultValue: 3 },
                        { name: 'anchoVentana', label: 'Ancho de ventana (m)', type: 'number', defaultValue: 1.5 },
                        { name: 'encendidas', label: '% encendidas', type: 'number', defaultValue: 58, min: 0, max: 100 },
                      ],
                    },
                  ],
                },
                {
                  name: 'vistas',
                  type: 'array',
                  labels: { singular: 'Vista', plural: 'Vistas' },
                  admin: {
                    description:
                      'Botones de vistas. "Cámara" es el nombre del objeto cámara en Blender (ej: Cam_Principal). Si lo dejás vacío se usan todas las cámaras del modelo.',
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'camara', label: 'Cámara', type: 'text', required: true },
                        { name: 'etiqueta', type: 'text', localized: true, validate: obligatorioEnDefecto },
                        {
                          name: 'alturaObjetivo',
                          label: 'Mirar a altura (m)',
                          type: 'number',
                          admin: { description: 'Opcional: fuerza la altura del punto al que mira.' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Plantas',
          description:
            'Los pisos con unidades aparecen solos. Acá se agregan los niveles especiales (planta baja, amenities, rooftop) y los renders cenitales cuando existan; sin render se dibuja un esquema desde el modelo 3D.',
          fields: [
            {
              name: 'fondoPlantas',
              label: 'Fondo de las plantas',
              type: 'select',
              defaultValue: 'realista',
              options: [
                { label: 'Realista (el edificio en su entorno)', value: 'realista' },
                { label: 'Blanco (sólo el edificio)', value: 'blanco' },
              ],
              admin: {
                description:
                  'Qué render cenital se muestra en cada nivel. Si un nivel no tiene el elegido, se usa el otro. Los dos comparten la máscara.',
              },
            },
            {
              name: 'niveles',
              type: 'array',
              labels: { singular: 'Nivel', plural: 'Niveles' },
              admin: { initCollapsed: true },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'piso', type: 'number', required: true, admin: { description: '0 = planta baja, -1 = subsuelo.' } },
                    { name: 'nombre', type: 'text', localized: true, admin: { placeholder: 'Ej: Amenities' } },
                    {
                      name: 'tipo',
                      type: 'select',
                      defaultValue: 'unidades',
                      options: [
                        { label: 'Con unidades', value: 'unidades' },
                        { label: 'Especial (puntos de interés)', value: 'especial' },
                      ],
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'cenital', label: 'Render cenital (realista)', type: 'upload', relationTo: 'media' },
                    {
                      name: 'cenitalBlanco',
                      label: 'Render cenital (blanco)',
                      type: 'upload',
                      relationTo: 'media',
                      admin: { description: 'Sólo el edificio, con fondo transparente.' },
                    },
                    {
                      name: 'mascara',
                      label: 'Máscara SVG',
                      type: 'upload',
                      relationTo: 'media',
                      admin: { description: 'SVG con un <path data-unidad="5B"> por unidad, mismo encuadre que el render.' },
                    },
                  ],
                },
                {
                  name: 'pois',
                  label: 'Puntos de interés',
                  type: 'array',
                  labels: { singular: 'Punto', plural: 'Puntos' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'etiqueta', type: 'text', localized: true, validate: obligatorioEnDefecto },
                        { name: 'x', label: 'X (%)', type: 'number', min: 0, max: 100, required: true },
                        { name: 'y', label: 'Y (%)', type: 'number', min: 0, max: 100, required: true },
                      ],
                    },
                    {
                      type: 'row',
                      fields: [
                        { name: 'amenity', type: 'relationship', relationTo: 'amenities' },
                        { name: 'recorrido', label: 'Recorrido 360', type: 'relationship', relationTo: 'recorridos' },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              name: 'vistasUnidad',
              label: 'Vistas desde las unidades',
              type: 'array',
              labels: { singular: 'Vista', plural: 'Vistas' },
              admin: {
                initCollapsed: true,
                description: 'Lo que se ve desde una orientación y franja de pisos (pestaña "Vistas" de la ficha).',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'orientacion', label: 'Orientación', type: 'text', required: true, admin: { placeholder: 'Ej: Norte' } },
                    { name: 'desde', label: 'Desde piso', type: 'number', required: true },
                    { name: 'hasta', label: 'Hasta piso', type: 'number', required: true },
                  ],
                },
                { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
              ],
            },
          ],
        },
        {
          label: 'Disponibilidad',
          description:
            'Tomas fijas de la torre desde distintos ángulos, con las unidades pintadas por estado. Salen de Blender con scripts/blender/renders_fachadas.py (docs/renders-fachadas.md). Sin vistas se dibuja un esquema de cada fachada desde el modelo 3D.',
          fields: [
            {
              name: 'vistasDisponibilidad',
              label: 'Vistas',
              type: 'array',
              labels: { singular: 'Vista', plural: 'Vistas' },
              admin: { initCollapsed: true, description: 'En el orden en que se recorren con las flechas (alrededor de la torre).' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'etiqueta', type: 'text', localized: true, validate: obligatorioEnDefecto, admin: { placeholder: 'Ej: Noreste' } },
                    { name: 'imagen', label: 'Render', type: 'upload', relationTo: 'media', required: true },
                    {
                      name: 'mascara',
                      label: 'Máscara SVG',
                      type: 'upload',
                      relationTo: 'media',
                      required: true,
                      admin: { description: 'SVG con un <polygon data-unidad="5B"> por unidad visible, mismo encuadre que el render.' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Imágenes',
          fields: [
            {
              name: 'portada',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Se muestra en la home y mientras carga el 3D. Ideal: un render de Blender.' },
            },
            {
              name: 'galeria',
              type: 'array',
              labels: { singular: 'Imagen', plural: 'Imágenes' },
              fields: [
                { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
                { name: 'epigrafe', type: 'text', localized: true },
              ],
            },
          ],
        },
      ],
    },
  ],
}
