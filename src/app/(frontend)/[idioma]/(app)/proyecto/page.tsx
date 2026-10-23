import Link from 'next/link'

import { BotonConsulta, Cifra, Desplazamiento, TextoEncendido } from '@/components/landing/Desplazamiento'
import { EnlaceProfundo } from '@/components/ui/EnlaceProfundo'
import { Icono } from '@/components/ui/Icono'
import { cifrasDelProyecto } from '@/lib/cifras'
import { imagen, obtenerAmenities, obtenerProyecto, obtenerSitio, obtenerTorres, obtenerUnidadesDeTorre } from '@/lib/datos'
import { vistasGiro } from '@/lib/escenas'
import { etiquetaVista } from '@/lib/etiquetas'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { pisoInicial, seccionesVisibles } from '@/lib/navegacion'
import type { Media } from '@/payload-types'

export const revalidate = 60

export async function generateMetadata() {
  return { title: (await textosServidor()).menu.proyecto }
}

const urlVideo = (m: unknown) => (m && typeof m === 'object' && 'url' in m ? ((m as Media).url ?? null) : null)
const css = (v: Record<string, string | number>) => v as React.CSSProperties

// El proyecto: landing con scroll. Hero con parallax, la descripción que se enciende palabra por palabra, el edificio
// fijo en pantalla girando entre las vistas del Giro, cifras, cada torre, amenities en una pista horizontal,
// ubicación y cierre. Todo sale del admin; cada bloque se omite si no tiene contenido.
export default async function PaginaProyecto() {
  const [proyecto, sitio, torres, vistas, amenities, visibles, rutas, t] = await Promise.all([
    obtenerProyecto(),
    obtenerSitio(),
    obtenerTorres(),
    vistasGiro(),
    obtenerAmenities(),
    seccionesVisibles(),
    rutasServidor(),
    textosServidor(),
  ])
  const unidades = (await Promise.all(torres.map((x) => obtenerUnidadesDeTorre(x.slug)))).flat()
  const tx = t.proyecto
  const t0 = torres[0]

  const video = urlVideo(sitio.intro?.video)
  const fondo = imagen(sitio.intro?.poster) ?? t0?.portada ?? vistas[0]?.imagen ?? null
  const plantas = t0 ? rutas.planta(t0.slug, pisoInicial(t0)) : rutas.contacto()
  const manifiesto = proyecto.descripcion || t0?.bajada

  const cifras = cifrasDelProyecto(torres, unidades, tx)

  const u = sitio.ubicacion
  const fotoUbicacion = imagen(u?.foto) ?? imagen(u?.mapaIlustrado) ?? t0?.galeria[0] ?? null
  const conAmenities = visibles.amenities && amenities.length > 0

  return (
    <Desplazamiento className="pantalla-proyecto">
      {/* guía fija a la derecha: invita a bajar y muestra cuánto falta; se apaga al llegar al final */}
      <div className="lp-guia" aria-hidden>
        <span className="lp-guia-texto">{tx.guia}</span>
        <span className="lp-guia-linea">
          <i />
        </span>
        <Icono nombre="abajo" tamano={14} />
      </div>
      {/* hero: la imagen baja más lento que el scroll y el título se desvanece */}
      <section className="lp-hero" data-progreso="salida">
        <div className="lp-hero-fondo">
          {video ? (
            <video autoPlay muted loop playsInline poster={fondo?.grande} src={video} />
          ) : (
            fondo && <img src={fondo.grande} alt="" />
          )}
        </div>
        <div className="lp-hero-velo" aria-hidden />
        <div className="lp-hero-texto">
          {t0?.estadoObra && (
            <span className="kicker">
              {t.estadoObra[t0.estadoObra] ?? t0.estadoObra}
              {t0.entrega ? ` · ${t.intro.entrega(t0.entrega)}` : ''}
            </span>
          )}
          {proyecto.logo ? <img className="lp-hero-logo" src={proyecto.logo.url} alt={proyecto.nombre} /> : <h1>{proyecto.nombre}</h1>}
          {proyecto.eslogan && <p>{proyecto.eslogan}</p>}
        </div>
        <span className="lp-bajar" aria-hidden>
          {tx.bajar}
          <Icono nombre="abajo" tamano={18} />
        </span>
      </section>

      {manifiesto && (
        <section className="lp-manifiesto" data-progreso="fijo">
          <div className="lp-fijo">
            <span className="kicker">{tx.kickerManifiesto}</span>
            <TextoEncendido texto={manifiesto} />
          </div>
        </section>
      )}

      {/* el edificio queda fijo: el marco se abre a pantalla completa y va pasando por las vistas del giro */}
      {vistas.length > 0 && (
        <section className="lp-giro" data-progreso="fijo" style={css({ '--n': vistas.length })}>
          <div className="lp-fijo">
            <div className="lp-giro-titulo">
              <span className="kicker">{tx.kickerGiro}</span>
              <h2>{tx.tituloGiro}</h2>
            </div>
            <div className="lp-giro-marco">
              {vistas.map((v, i) => (
                <img key={v.imagen.url} src={v.imagen.grande} alt={v.imagen.alt} style={css({ '--i': i })} loading={i ? 'lazy' : undefined} />
              ))}
              <div className="lp-giro-pie">
                <ol className="lp-giro-etiquetas">
                  {vistas.map((v, i) => (
                    <li key={v.imagen.url} style={css({ '--i': i })}>
                      {etiquetaVista(t, v.etiqueta, i)}
                    </li>
                  ))}
                </ol>
                <EnlaceProfundo className="boton primario" href={rutas.giro(0)}>
                  <Icono nombre="restablecer" tamano={16} /> {tx.girar}
                </EnlaceProfundo>
              </div>
              <div className="lp-giro-avance" aria-hidden>
                <span />
              </div>
            </div>
          </div>
        </section>
      )}

      {cifras.length > 0 && (
        <section className="lp-cifras">
          <span className="kicker" data-revelar>
            {tx.kickerCifras}
          </span>
          <dl>
            {cifras.map((c, i) => (
              <div key={c.etiqueta} data-revelar style={css({ '--retraso': `${i * 90}ms` })}>
                <dt>{c.etiqueta}</dt>
                <dd className={typeof c.valor === 'number' || /^[\d\s]+$/.test(c.valor) ? undefined : 'texto'}>
                  <Cifra valor={c.valor} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {torres.map((x, i) => {
        const foto = x.portada ?? x.galeria[0]
        const segunda = x.galeria.find((g) => g.url !== foto?.url)
        return (
          <section key={x.slug} className={`lp-torre${i % 2 ? ' invertida' : ''}`}>
            <div className="lp-torre-fotos">
              {foto && (
                <figure className="lp-parallax" data-progreso="vista" data-revelar="imagen">
                  <img src={foto.grande} alt={foto.alt} loading="lazy" />
                </figure>
              )}
              {segunda && (
                <figure className="lp-parallax lp-torre-segunda" data-progreso="vista" data-revelar="imagen">
                  <img src={segunda.grande} alt={segunda.alt} loading="lazy" />
                </figure>
              )}
            </div>
            <div className="lp-torre-texto">
              {x.direccion && (
                <span className="kicker" data-revelar>
                  {x.direccion}
                </span>
              )}
              <h2 data-revelar>{x.nombre}</h2>
              {x.bajada && x.bajada !== manifiesto && <p data-revelar>{x.bajada}</p>}
              {x.caracteristicas.length > 0 && (
                <ul className="lp-lista">
                  {x.caracteristicas.map((c, j) => (
                    <li key={c} data-revelar style={css({ '--retraso': `${j * 80}ms` })}>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              <div className="lp-acciones" data-revelar>
                <EnlaceProfundo className="boton primario" href={rutas.planta(x.slug, pisoInicial(x))}>
                  {t.comun.verPlantas}
                </EnlaceProfundo>
                {visibles.modo3d && (
                  <Link className="boton" href={rutas.tresD(x.slug)}>
                    <Icono nombre="cubo" tamano={16} /> {t.comun.modo3d}
                  </Link>
                )}
              </div>
            </div>
          </section>
        )
      })}

      {/* amenities: el scroll vertical corre la pista de tarjetas hacia el costado */}
      {conAmenities && (
        <section className="lp-amenities" data-progreso="fijo" data-horizontal>
          <div className="lp-fijo">
            <header>
              <span className="kicker">{tx.kickerAmenities}</span>
              <h2>{tx.tituloAmenities}</h2>
              <Link className="boton" href={rutas.amenities()}>
                {tx.verAmenities} <Icono nombre="derecha" tamano={16} />
              </Link>
            </header>
            <div className="lp-pista" data-pista>
              {amenities.map((a) => (
                <EnlaceProfundo key={a.slug} className="lp-tarjeta" href={rutas.amenities(a.slug)}>
                  {a.imagenes[0] && <img src={a.imagenes[0].grande} alt={a.imagenes[0].alt} loading="lazy" />}
                  <div>
                    <h3>{a.nombre}</h3>
                    {/* en la tarjeta va sólo el primer párrafo; el texto completo está en Amenities */}
                    {a.descripcion && <p>{a.descripcion.split(/\n\s*\n/)[0]}</p>}
                  </div>
                </EnlaceProfundo>
              ))}
            </div>
          </div>
        </section>
      )}

      {visibles.ubicacion && (u?.barrio || u?.direccion || u?.texto) && (
        <section className="lp-ubicacion">
          {fotoUbicacion && (
            <figure className="lp-parallax" data-progreso="vista" data-revelar="imagen">
              <img src={fotoUbicacion.grande} alt={fotoUbicacion.alt} loading="lazy" />
            </figure>
          )}
          <div className="lp-ubicacion-texto">
            <span className="kicker" data-revelar>
              {tx.kickerUbicacion}
            </span>
            <h2 data-revelar>{u.barrio || u.direccion}</h2>
            {u.barrio && u.direccion && (
              <p className="lp-direccion" data-revelar>
                <Icono nombre="ubicacion" tamano={16} /> {u.direccion}
              </p>
            )}
            {u.texto && <p data-revelar>{u.texto}</p>}
            <Link className="boton" href={rutas.ubicacion()} data-revelar>
              {tx.verUbicacion} <Icono nombre="derecha" tamano={16} />
            </Link>
          </div>
        </section>
      )}

      <section className="lp-cierre">
        <h2 data-revelar>{tx.tituloCierre}</h2>
        <p data-revelar>{tx.textoCierre}</p>
        <div className="lp-acciones" data-revelar>
          <EnlaceProfundo className="boton primario grande" href={plantas}>
            {t.comun.verPlantas}
          </EnlaceProfundo>
          <BotonConsulta className="boton grande">{t.consulta.consultanos}</BotonConsulta>
        </div>
        {proyecto.desarrolladora.nombre && (
          <p className="lp-firma">
            {proyecto.desarrolladora.logo ? (
              <img src={proyecto.desarrolladora.logo.url} alt={proyecto.desarrolladora.nombre} />
            ) : (
              t.comun.desarrolloDe(proyecto.desarrolladora.nombre)
            )}
          </p>
        )}
        {proyecto.legal && <p className="lp-legal">{proyecto.legal}</p>}
      </section>
    </Desplazamiento>
  )
}
