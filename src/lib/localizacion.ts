// Contenido del admin en varios idiomas (localización de Payload). Los idiomas salen de IDIOMAS: sacar o sumar uno
// ahí alcanza para que aparezca o desaparezca el selector de idioma en el admin.
// Lo que no se carga en otro idioma se muestra en el de defecto (fallback), así el inglés se puede ir completando.

import type { LocalizationConfig, PayloadRequest } from 'payload'

import { textosDe } from '../textos'
import { IDIOMA_DEFECTO, IDIOMAS } from './idiomas'

export const LOCALIZACION: LocalizationConfig = {
  locales: IDIOMAS.map((code) => ({ code, label: textosDe(code).idioma.nombre })),
  defaultLocale: IDIOMA_DEFECTO,
  fallback: true,
}

/**
 * En lugar de `required` en un campo traducible: obligatorio sólo en el idioma por defecto. En los otros se puede
 * dejar vacío (se muestra el del defecto); con `required` Payload exigiría completarlo en cada idioma al guardar.
 */
export const obligatorioEnDefecto = (value: unknown, { req }: { req: PayloadRequest }) =>
  (req.locale && req.locale !== IDIOMA_DEFECTO) || (typeof value === 'string' ? value.trim() !== '' : value != null) ||
  req.t('validation:required')
