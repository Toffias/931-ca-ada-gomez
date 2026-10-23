import Link from 'next/link'

import { Icono } from '@/components/ui/Icono'
import type { Idioma } from '@/lib/idiomas'
import { rutasDe } from '@/lib/rutas'
import { textosDe } from '@/textos'

// Contenido del 404: lo usan global-not-found.tsx (URLs inexistentes) y (app)/not-found.tsx (notFound() al
// navegar dentro del sitio, por ejemplo una unidad que ya no existe).
export function NoEncontrada({ idioma }: { idioma: Idioma }) {
  const t = textosDe(idioma).noEncontrada
  return (
    <div className="pantalla no-encontrada">
      <div className="vacio proximamente">
        <span className="proximamente-icono">
          <Icono nombre="ubicacion" tamano={34} />
        </span>
        <p>{t.error}</p>
        <h2>{t.mensaje}</h2>
        <small>{t.detalle}</small>
        <Link className="boton primario grande" href={rutasDe(idioma).intro()}>
          {t.inicio}
        </Link>
      </div>
    </div>
  )
}
