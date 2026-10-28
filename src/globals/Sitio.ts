import type { Field, GlobalConfig } from 'payload'

import { revalidarGlobal } from '../hooks/revalidar'
import { validarEmbedGoogle } from '../lib/google-maps'
import { obligatorioEnDefecto } from '../lib/localizacion'

// Datos del proyecto inmobiliario (una web = un proyecto, que puede tener varias torres).
// Cambiarlos acá alcanza para "vestir" la plantilla.

const imagenes = (name: string, label: string): Field => ({
  name,
  label,
  type: 'array',
  labels: { singular: 'Imagen', plural: 'Imágenes' },
  fields: [
    { name: 'imagen', type: 'upload', relationTo: 'media', required: true },
    { name: 'epigrafe', type: 'text', localized: true },
  ],
})

// valores iniciales por idioma: si no, el inglés arrancaría con el texto en castellano
const MOTIVOS_ES = ['Quiero comprar', 'Quiero invertir', 'Soy inmobiliaria', 'Otro']
const MOTIVOS_EN = ['I want to buy', 'I want to invest', "I'm a real estate agent", 'Other']
const LEGAL_ES =
  'Las imágenes, renders, videos y planos exhibidos son meramente ilustrativos, no contractuales, y el emprendimiento terminado podrá diferir de lo representado. Medidas, materiales y terminaciones sujetos a modificaciones. Precios y disponibilidad sujetos a cambios sin previo aviso.'
const LEGAL_EN =
  'All images, renderings, videos and floor plans shown are for illustration only and not contractual; the finished development may differ from what is shown. Dimensions, materials and finishes are subject to change. Prices and availability are subject to change without notice.'

export const SECCIONES = [
  { name: 'disponibilidad', label: 'Disponibilidad en fachada' },
  { name: 'amenities', label: 'Amenities' },
  { name: 'recorridos', label: 'Recorridos 360' },
  { name: 'galeria', label: 'Galería' },
  { name: 'video', label: 'Video' },
  { name: 'obra', label: 'Avance de obra' },
  { name: 'ubicacion', label: 'Ubicación' },
  { name: 'blog', label: 'Blog' },
  { name: 'modo3d', label: 'Modo 3D' },
] as const

export const Sitio: GlobalConfig = {
  slug: 'sitio',
  label: 'Proyecto',
  admin: { group: 'Contenido' },
  access: { read: () => true },
  hooks: { afterChange: [revalidarGlobal] },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Marca',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'nombre', type: 'text', required: true, defaultValue: 'Nombre del desarrollo' },
                { name: 'eslogan', type: 'text', localized: true },
              ],
            },
            { name: 'logo', type: 'upload', relationTo: 'media', admin: { description: 'Ideal: SVG claro sobre fondo oscuro.' } },
            {
              name: 'favicon',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Ícono de la pestaña del navegador. PNG o SVG cuadrado (ideal 512 × 512), que se lea en chico.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'colorAcento',
                  label: 'Color de acento',
                  type: 'text',
                  defaultValue: '#e8b56a',
                  admin: { description: 'Hex. Se usa en botones y selección.' },
                },
                {
                  name: 'tema',
                  label: 'Tema por defecto',
                  type: 'select',
                  defaultValue: 'oscuro',
                  options: [
                    { label: 'Oscuro', value: 'oscuro' },
                    { label: 'Claro', value: 'claro' },
                    { label: 'Automático (según el dispositivo)', value: 'sistema' },
                  ],
                  admin: { description: 'Con el que abre el sitio. Cada visitante lo puede cambiar desde la barra superior.' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'colorFondo', label: 'Fondo (tema oscuro)', type: 'text', defaultValue: '#0e1116' },
                { name: 'colorFondoClaro', label: 'Fondo (tema claro)', type: 'text', defaultValue: '#f3f1ed' },
                {
                  name: 'tipografia',
                  label: 'Tipografía',
                  type: 'select',
                  defaultValue: 'inter',
                  options: [
                    { label: 'Inter (sans)', value: 'inter' },
                    { label: 'Manrope (sans geométrica)', value: 'manrope' },
                    { label: 'Cormorant (serif elegante)', value: 'cormorant' },
                  ],
                },
              ],
            },
            {
              name: 'desarrolladora',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'nombre', type: 'text' },
                    { name: 'web', type: 'text' },
                  ],
                },
                { name: 'logo', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
        {
          label: 'Secciones',
          description: 'Las secciones apagadas no aparecen en el menú y su página da 404.',
          fields: [
            {
              name: 'secciones',
              type: 'group',
              fields: SECCIONES.map(({ name, label }) => ({
                name,
                label,
                type: 'checkbox' as const,
                defaultValue: name !== 'obra',
              })),
            },
          ],
        },
        {
          label: 'Contacto',
          fields: [
            {
              name: 'contacto',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'telefono', label: 'Teléfono', type: 'text' },
                    { name: 'whatsapp', label: 'WhatsApp (con código de país)', type: 'text' },
                    { name: 'email', type: 'email' },
                  ],
                },
                { name: 'direccion', label: 'Dirección del showroom', type: 'text' },
                { name: 'horario', type: 'text', localized: true, admin: { placeholder: 'Ej: Lunes a viernes de 10 a 18 h' } },
                {
                  name: 'avisosConsultas',
                  label: 'Emails que reciben las consultas',
                  type: 'text',
                  hasMany: true,
                  admin: {
                    description:
                      'Cada consulta de la web llega por mail a estas direcciones. Si queda vacío, se usa el email de contacto.',
                  },
                },
                {
                  name: 'motivos',
                  label: 'Motivos del formulario de contacto',
                  type: 'text',
                  hasMany: true,
                  localized: true,
                  defaultValue: ({ locale }) => (locale === 'en' ? MOTIVOS_EN : MOTIVOS_ES),
                },
              ],
            },
          ],
        },
        {
          label: 'Textos',
          fields: [
            { name: 'descripcion', label: 'Descripción del proyecto', type: 'textarea', localized: true },
            {
              name: 'legal',
              label: 'Disclaimer',
              type: 'textarea',
              localized: true,
              defaultValue: ({ locale }) => (locale === 'en' ? LEGAL_EN : LEGAL_ES),
            },
            { name: 'privacidad', label: 'Política de privacidad', type: 'textarea', localized: true },
            {
              name: 'brochure',
              label: 'Brochure general (PDF)',
              type: 'upload',
              relationTo: 'media',
              localized: true,
              admin: { description: 'Se ofrece en todas las fichas, junto al brochure de cada tipología. Puede haber uno por idioma.' },
            },
          ],
        },
        {
          label: 'Intro y Giro 360',
          fields: [
            {
              name: 'intro',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'video', label: 'Video de fondo (MP4)', type: 'upload', relationTo: 'media' },
                    { name: 'videoMovil', label: 'Video vertical (celular)', type: 'upload', relationTo: 'media' },
                    { name: 'poster', label: 'Póster / imagen de fondo', type: 'upload', relationTo: 'media' },
                  ],
                },
                {
                  name: 'videoEntrada',
                  label: 'Video al tocar "Entrar" (MP4)',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description:
                      'Sólo con imagen de fondo (sin video). Tiene que arrancar en el mismo cuadro que el póster: al tocar "Entrar" se reproduce encima y al terminar pasa a la pantalla siguiente. Sin audio y corto (5–12 s).',
                  },
                },
                {
                  name: 'nubes',
                  label: 'Nubes en movimiento detrás del edificio',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    description:
                      'Sólo con imagen de fondo (sin video). El cielo se detecta solo en la imagen; apagarlo si el render ya trae nubes.',
                  },
                },
              ],
            },
            {
              name: 'giro',
              label: 'Vistas del Giro 360',
              type: 'array',
              labels: { singular: 'Vista', plural: 'Vistas' },
              admin: {
                description:
                  'Renders a pantalla completa desde puntos fijos. Si falta, se usan la portada y la galería de las torres.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'etiqueta', type: 'text', localized: true },
                    { name: 'imagen', label: 'Render', type: 'upload', relationTo: 'media', required: true },
                    {
                      name: 'mascara',
                      label: 'Máscara SVG de torres',
                      type: 'upload',
                      relationTo: 'media',
                      admin: { description: 'Un <path data-torre="slug"> por torre.' },
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'videoSiguiente', label: 'Transición → siguiente', type: 'upload', relationTo: 'media' },
                    { name: 'videoAnterior', label: 'Transición → anterior', type: 'upload', relationTo: 'media' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Galería y video',
          fields: [
            imagenes('galeria', 'Galería general'),
            {
              name: 'video',
              label: 'Video institucional',
              type: 'text',
              admin: { description: 'URL de un MP4, de un .m3u8 (HLS) o de YouTube / Vimeo.' },
            },
          ],
        },
        {
          label: 'Ubicación',
          fields: [
            {
              name: 'ubicacion',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'barrio', type: 'text' },
                    { name: 'direccion', label: 'Dirección', type: 'text' },
                  ],
                },
                { name: 'texto', type: 'textarea', localized: true },
                {
                  name: 'foto',
                  label: 'Foto del barrio',
                  type: 'upload',
                  relationTo: 'media',
                  admin: {
                    description: 'Para "El proyecto" y la pestaña Barrio de Ubicación. Sin foto se usa la primera de la galería de la torre.',
                  },
                },
                {
                  name: 'mapaGoogle',
                  label: 'Mapa de Google (código para insertar)',
                  type: 'textarea',
                  validate: validarEmbedGoogle,
                  admin: {
                    description:
                      'En Google Maps buscá la dirección → Compartir → Insertar un mapa → Copiar HTML, y pegalo acá. No requiere API key.',
                  },
                },
                {
                  name: 'streetView',
                  label: 'Street View (código para insertar)',
                  type: 'textarea',
                  validate: validarEmbedGoogle,
                  admin: {
                    description:
                      'En Google Maps entrá a Street View frente al edificio, encuadrá la vista → Compartir → Insertar un mapa → Copiar HTML.',
                  },
                },
                {
                  name: 'busquedasCercanas',
                  label: 'Búsquedas de cercanías en Google Maps',
                  type: 'array',
                  labels: { singular: 'Búsqueda', plural: 'Búsquedas' },
                  admin: {
                    description:
                      'Cada una es un botón que muestra en el mapa de Google lo que haya cerca de la dirección (ej: supermercados). Necesita la dirección cargada y NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY en el .env.',
                  },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'nombre', label: 'Nombre del botón', type: 'text', localized: true, validate: obligatorioEnDefecto, admin: { placeholder: 'Ej: Supermercados' } },
                        {
                          name: 'busqueda',
                          label: 'Qué buscar',
                          type: 'text',
                          admin: { placeholder: 'Ej: supermercado', description: 'Opcional. Si queda vacío se busca el nombre del botón.' },
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'cercanias',
                  label: 'Cercanías',
                  type: 'array',
                  labels: { singular: 'Lugar', plural: 'Lugares' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'nombre', type: 'text', required: true },
                        { name: 'categoria', label: 'Categoría', type: 'text', localized: true, admin: { placeholder: 'Ej: Transporte' } },
                        { name: 'tiempo', type: 'text', localized: true, admin: { placeholder: 'Ej: 5 min caminando' } },
                      ],
                    },
                    {
                      type: 'row',
                      fields: [
                        { name: 'x', label: 'X en el mapa (%)', type: 'number', min: 0, max: 100 },
                        { name: 'y', label: 'Y en el mapa (%)', type: 'number', min: 0, max: 100 },
                      ],
                    },
                  ],
                },
                {
                  name: 'mapaIlustrado',
                  label: 'Mapa ilustrado',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Opcional. Los lugares con X/Y se marcan como pins encima.' },
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'loteX', label: 'Lote: X (%)', type: 'number', min: 0, max: 100 },
                    { name: 'loteY', label: 'Lote: Y (%)', type: 'number', min: 0, max: 100 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
