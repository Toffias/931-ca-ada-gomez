import { type Idioma, LOCALE } from './idiomas'

export function formatoPrecio(valor: number | null | undefined, moneda: 'USD' | 'ARS' | null | undefined, idioma: Idioma) {
  if (valor == null) return null
  return new Intl.NumberFormat(LOCALE[idioma], {
    style: 'currency',
    currency: moneda ?? 'USD',
    maximumFractionDigits: 0,
  }).format(valor)
}

/** medidas con un decimal: "4,5" / "4.5" */
export const formatoMedida = (valor: number, idioma: Idioma) =>
  new Intl.NumberFormat(LOCALE[idioma], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(valor)

export function linkWhatsApp(numero: string, texto: string) {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`
}
