import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { es } from '@payloadcms/translations/languages/es'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Amenities } from './collections/Amenities'
import { Articulos } from './collections/Articulos'
import { Autores } from './collections/Autores'
import { AvancesDeObra } from './collections/AvancesDeObra'
import { Consultas } from './collections/Consultas'
import { Edificios } from './collections/Edificios'
import { Media } from './collections/Media'
import { Recorridos } from './collections/Recorridos'
import { Tipologias } from './collections/Tipologias'
import { Unidades } from './collections/Unidades'
import { Users } from './collections/Users'
import { emailConsola } from './lib/email-consola'
import { LOCALIZACION } from './lib/localizacion'
import { Sitio } from './globals/Sitio'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Una sola variable decide la base: postgres://… en staging/producción, file:… (SQLite) en local.
const databaseUrl = process.env.DATABASE_URL || 'file:./plantilla.db'
const db = databaseUrl.startsWith('postgres')
  ? postgresAdapter({ pool: { connectionString: databaseUrl } })
  : sqliteAdapter({ client: { url: databaseUrl } })

export default buildConfig({
  // los links de los mails (ej. restablecer contraseña) se arman con esta URL
  serverURL: process.env.NEXT_PUBLIC_SITE_URL || '',
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Admin' },
  },
  i18n: {
    supportedLanguages: { es },
    fallbackLanguage: 'es',
  },
  // idioma del contenido (el de la interfaz del admin es i18n, arriba)
  localization: LOCALIZACION,
  collections: [Edificios, Tipologias, Unidades, Amenities, Recorridos, AvancesDeObra, Articulos, Autores, Consultas, Media, Users],
  globals: [Sitio],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db,
  sharp,
  // con RESEND_API_KEY los mails salen por Resend; sin ella se imprimen en la consola del server
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_REMITENTE || 'no-responder@localhost',
        defaultFromName: process.env.EMAIL_REMITENTE_NOMBRE || 'Plantilla edificio 3D',
      })
    : emailConsola,
  plugins: [],
})
