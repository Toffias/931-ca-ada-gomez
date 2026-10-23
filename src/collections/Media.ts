import type { CollectionConfig } from 'payload'

import { obligatorioEnDefecto } from '../lib/localizacion'

// Imágenes, planos (PDF), videos, máscaras SVG y modelos 3D (.glb) comparten esta colección.
// En producción conviene guardar los archivos en S3 / R2 / Vercel Blob con el plugin de storage de Payload.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Archivo', plural: 'Archivos' },
  admin: { group: 'Contenido' },
  access: { read: () => true },
  fields: [
    {
      name: 'alt',
      label: 'Texto alternativo',
      type: 'text',
      localized: true,
      validate: obligatorioEnDefecto,
    },
  ],
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm', 'application/pdf', 'model/gltf-binary', 'application/octet-stream'],
    imageSizes: [
      { name: 'tarjeta', width: 800 },
      { name: 'grande', width: 1920 },
    ],
  },
}
