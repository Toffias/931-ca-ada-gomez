import Link from 'next/link'
import { notFound } from 'next/navigation'

import { VisorEscena } from '@/components/escena/VisorEscena'
import { CarrilChips } from '@/components/ui/CarrilChips'
import { Icono } from '@/components/ui/Icono'
import { imagen, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { etiquetaMapa } from '@/lib/etiquetas'
import { embedsUbicacion } from '@/lib/google-maps'
import { idiomaActual, rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion } from '@/lib/navegacion'
import type { PuntoDeInteres } from '@/lib/tipos'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.ubicacion }
}

// Ubicación (spec P): texto del barrio y cercanías. Vistas opcionales según lo cargado en el admin:
// mapa y Street View de Google (iframes de "Insertar un mapa", sin API key), búsquedas de cercanías (Maps Embed
// API, con key) y mapa ilustrado con pins.
export default async function PaginaUbicacion({ params }: { params: Promise<{ modo: string }> }) {
  await exigirSeccion('ubicacion')
  const { modo } = await params
  const [sitio, torres, rutas, tx, idioma] = await Promise.all([obtenerSitio(), obtenerTorres(), rutasServidor(), textosServidor(), idiomaActual()])
  const t = tx.ubicacion
  const u = sitio.ubicacion ?? {}
  const mapa = imagen(u.mapaIlustrado)
  const embeds = embedsUbicacion(u, idioma)
  const disponibles = [
    { modo: 'info', etiqueta: t.barrio } as const,
    ...embeds.map((e) => ({ modo: e.vista, etiqueta: etiquetaMapa(tx, e) })),
    ...(mapa ? [{ modo: 'ilustrado', etiqueta: t.ilustrado } as const] : []),
  ]
  if (!disponibles.some((v) => v.modo === modo)) notFound()
  const embed = embeds.find((e) => e.vista === modo)

  const cercanias = u.cercanias ?? []
  const categorias = [...new Set(cercanias.map((c) => c.categoria || t.cerca))]
  const pins: PuntoDeInteres[] = [
    ...(u.loteX != null && u.loteY != null ? [{ clave: 'lote', etiqueta: sitio.nombre, x: u.loteX, y: u.loteY }] : []),
    ...cercanias.filter((c) => c.x != null && c.y != null).map((c, i) => ({ clave: `c${i}`, etiqueta: c.nombre, x: c.x!, y: c.y! })),
  ]
  const foto = imagen(u.foto) ?? torres[0]?.galeria[0] ?? torres[0]?.portada

  return (
    <div className="pantalla pantalla-ubicacion">
      <div className="ubicacion-media">
        {embed ? (
          <iframe
            key={modo}
            src={embed.url}
            title={t.iframe(etiquetaMapa(tx, embed), sitio.nombre)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : modo === 'ilustrado' && mapa ? (
          <VisorEscena
            escena={{ ancho: mapa.ancho ?? 1600, alto: mapa.alto ?? 1000, fondo: { url: mapa.grande, alt: mapa.alt }, formas: [] }}
            pois={pins}
            zoom
          />
        ) : (
          foto && <img src={foto.grande} alt={foto.alt} />
        )}
      </div>
      <aside className="ubicacion-panel">
        <span className="kicker">{t.kicker}</span>
        <h1>{u.barrio || t.barrio}</h1>
        {u.direccion && (
          <p className="muted">
            <Icono nombre="ubicacion" tamano={16} /> {u.direccion}
          </p>
        )}
        {disponibles.length > 1 && (
          <CarrilChips etiqueta={t.vista}>
            {disponibles.map((v) => (
              <Link
                key={v.modo}
                href={rutas.ubicacion(v.modo)}
                className={`chip${modo === v.modo ? ' activo' : ''}`}
                aria-current={modo === v.modo ? 'page' : undefined}
                replace
              >
                {v.etiqueta}
              </Link>
            ))}
          </CarrilChips>
        )}
        {u.texto && <p className="ubicacion-texto">{u.texto}</p>}
        {categorias.map((cat) => (
          <section key={cat} className="ubicacion-categoria">
            <h2>{cat}</h2>
            <ul>
              {cercanias
                .filter((c) => (c.categoria || t.cerca) === cat)
                .map((c) => (
                  <li key={c.id ?? c.nombre}>
                    <span>{c.nombre}</span>
                    {c.tiempo && <small>{c.tiempo}</small>}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </aside>
    </div>
  )
}
