import type { Idioma } from '@/lib/idiomas'

import { en } from './en'
import { es, type Textos } from './es'

export type { Textos }

// Los dos diccionarios son chicos: van juntos al navegador y así los componentes cliente no esperan nada.
const TEXTOS: Record<Idioma, Textos> = { es, en }

export const textosDe = (idioma: Idioma): Textos => TEXTOS[idioma]
