'use client'

import { usePathname } from 'next/navigation'

import { IDIOMAS, quitarIdioma } from '@/lib/idiomas'
import { textosDe } from '@/textos'

import { useIdioma } from '../ui/ProveedorIdioma'

// Un botón por cada otro idioma ("EN" en castellano, "ES" en inglés) que lleva a la misma pantalla.
// Siempre con prefijo (/es/… o /en/…): el proxy guarda la elección en la cookie y, en el de defecto, saca el
// prefijo. Es un <a> común para que la página se pida entera, con su <html lang> y sus textos.
export function SelectorIdioma() {
  const idioma = useIdioma()
  const { ruta } = quitarIdioma(usePathname())
  const otros = IDIOMAS.filter((i) => i !== idioma)
  if (!otros.length) return null

  return otros.map((i) => {
    const t = textosDe(i).idioma
    const href = `/${i}${ruta === '/' ? '' : ruta}`
    return (
      <a
        key={i}
        className="boton-icono boton-idioma"
        href={href}
        hrefLang={i}
        lang={i}
        aria-label={t.ver}
        title={t.nombre}
        // conserva la query de la pantalla (?piso=, ?u=)
        onClick={(e) => (e.currentTarget.href = href + window.location.search)}
      >
        {t.corto}
      </a>
    )
  })
}
