import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BotonConsulta, Desplazamiento } from '@/components/landing/Desplazamiento'
import { IndiceAmenities } from '@/components/landing/IndiceAmenities'
import { Icono } from '@/components/ui/Icono'
import { obtenerAmenities } from '@/lib/datos'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { exigirSeccion, seccionesVisibles } from '@/lib/navegacion'

export const revalidate = 60

type Props = { params: Promise<{ ruta?: string[] }> }

export async function generateMetadata({ params }: Props) {
  const { ruta = [] } = await params
  const [amenities, t] = await Promise.all([obtenerAmenities(), textosServidor()])
  const a = amenities.find((x) => x.slug === ruta[0])
  return { title: a ? `${a.nombre} · ${t.menu.amenities}` : t.menu.amenities }
}

const css = (v: Record<string, string | number>) => v as React.CSSProperties

// Amenities (spec K): landing informativa, un bloque por amenity con su texto fijo al costado y las fotos que van
// entrando con el scroll. /amenities/<slug> abre directo en ese amenity (se acepta /<n> de los links viejos).
export default async function PaginaAmenities({ params }: Props) {
  await exigirSeccion('amenities')
  const { ruta = [] } = await params
  const [amenities, visibles, rutas, t] = await Promise.all([obtenerAmenities(), seccionesVisibles(), rutasServidor(), textosServidor()])
  const elegido = ruta[0] ? amenities.find((x) => x.slug === ruta[0]) : null
  if ((ruta[0] && !elegido) || ruta.length > 2) notFound()

  const tx = t.amenities
  const portada = amenities.find((a) => a.imagenes.length)?.imagenes[0]

  return (
    <Desplazamiento className="pantalla-amenities">
      <section className="lp-hero am-hero" data-progreso="salida">
        <div className="lp-hero-fondo">{portada && <img src={portada.grande} alt="" />}</div>
        <div className="lp-hero-velo" aria-hidden />
        <div className="lp-hero-texto">
          <span className="kicker">{tx.kicker}</span>
          <h1>{tx.titulo}</h1>
          <p>{tx.cantidad(amenities.length)}</p>
        </div>
        <span className="lp-bajar" aria-hidden>
          {t.proyecto.bajar}
          <Icono nombre="abajo" tamano={18} />
        </span>
      </section>

      <IndiceAmenities items={amenities.map((a) => ({ slug: a.slug, nombre: a.nombre, href: rutas.amenities(a.slug) }))} inicial={elegido?.slug} />

      {amenities.map((a, i) => (
        <section key={a.slug} id={`amenity-${a.slug}`} data-amenity={a.slug} className={`am-bloque${i % 2 ? ' invertido' : ''}`}>
          <div className="am-texto">
            <div className="am-texto-fijo">
              <span className="am-numero" data-revelar>
                {tx.numero(i + 1, amenities.length)}
              </span>
              <h2 data-revelar>{a.nombre}</h2>
              {/* una línea en blanco en el admin separa párrafos */}
              {a.descripcion
                ?.split(/\n\s*\n/)
                .map((parrafo) => parrafo.trim())
                .filter(Boolean)
                .map((parrafo, k) => (
                  <p key={k} data-revelar>
                    {parrafo}
                  </p>
                ))}
              {visibles.recorridos && a.recorrido && (
                <Link className="boton" href={rutas.recorridos(a.recorrido.slug)} data-revelar>
                  <Icono nombre="tour" tamano={16} /> {t.comun.tour360}
                </Link>
              )}
            </div>
          </div>
          <div className="am-fotos">
            {a.imagenes.map((img, j) => (
              <figure
                key={img.url + j}
                className={`lp-parallax am-foto${j % 3 === 1 ? ' angosta' : ''}`}
                data-progreso="vista"
                data-revelar="imagen"
                style={css({ '--ar': img.ancho && img.alto ? img.ancho / img.alto : 1.5 })}
              >
                <img src={img.grande} alt={img.alt} loading={i || j ? 'lazy' : undefined} />
                {img.epigrafe && <figcaption>{img.epigrafe}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      ))}

      <section className="lp-cierre">
        <h2 data-revelar>{tx.tituloCierre}</h2>
        <p data-revelar>{tx.textoCierre}</p>
        <div className="lp-acciones" data-revelar>
          <BotonConsulta className="boton primario grande">{t.consulta.consultanos}</BotonConsulta>
          {visibles.recorridos && (
            <Link className="boton grande" href={rutas.recorridos()}>
              <Icono nombre="tour" tamano={16} /> {t.menu.recorridos}
            </Link>
          )}
        </div>
      </section>
    </Desplazamiento>
  )
}
