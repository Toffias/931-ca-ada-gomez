'use client'

import Link from 'next/link'
import { useState } from 'react'

import type { Escena } from '@/lib/escena/tipos'
import { formatoMedida, formatoPrecio, linkWhatsApp } from '@/lib/formato'
import { etiquetaMapa } from '@/lib/etiquetas'
import type { EmbedMapa, VistaMapa } from '@/lib/google-maps'
import type { PestanaFicha, TipoPlanta } from '@/lib/rutas'
import { useEstadoUnidad, useProyecto } from '@/lib/store-proyecto'
import type { Imagen, Proyecto, RecorridoRef, Tipologia, Unidad } from '@/lib/tipos'

import { VisorEscena } from '../escena/VisorEscena'
import { CarrilChips } from '../ui/CarrilChips'
import { Galeria } from '../ui/Galeria'
import { Icono, type NombreIcono } from '../ui/Icono'
import { Modal } from '../ui/Modal'
import { useIdioma, useRutas, useTextos } from '../ui/ProveedorIdioma'
import { COLOR_ESTADO } from '../visor/tipos'
import type { RecorridoPublico } from './PantallaRecorridos'
import { ReproductorVideo } from './ReproductorVideo'
import { VisorRecorrido } from './VisorRecorrido'

type Props = {
  unidad: Unidad
  tipologia: Tipologia | null
  torreNombre: string
  pestana: PestanaFicha
  n: number
  /** en Planta, la elegida en la URL; sin dato, la 3D si hay */
  tipoPlanta?: TipoPlanta
  pestanas: PestanaFicha[]
  /** modo Planta 3D sin render: la huella de la unidad */
  huella: (Escena & { medidas?: [number, number] }) | null
  /** miniatura "Ubicación en planta" */
  planoPiso: Escena | null
  vista: Imagen | null
  recorrido: RecorridoRef | null
  /** datos del recorrido para verlo dentro de la ficha */
  tour?: RecorridoPublico | null
  planoUrl?: string | null
  /** embeds de Google Maps del proyecto (modo Ubicación) y el que se está viendo */
  mapas: EmbedMapa[]
  mapa?: VistaMapa
  anterior?: string | null
  siguiente?: string | null
  proyecto: Pick<Proyecto, 'nombre' | 'contacto' | 'legal' | 'brochure'>
}

const ICONO_MODO: Record<PestanaFicha, NombreIcono> = {
  galeria: 'galeria',
  planta: 'planta',
  vistas: 'norte',
  tour: 'tour',
  video: 'video',
  ubicacion: 'ubicacion',
}

// Ficha de unidad (spec H). Panel izquierdo con los datos y, a la derecha, el modo activo a pantalla completa:
// Galería, Planta (2D y 3D), Recorrido 360 y Video (más Vistas si hay imagen para esa orientación y altura, y Ubicación
// si el proyecto tiene mapa o Street View de Google).
export function PantallaFicha(p: Props) {
  const { unidad: u, tipologia: t } = p
  const idioma = useIdioma()
  const tx = useTextos()
  const rutas = useRutas()
  const modo = tx.ficha.modos
  const estado = useEstadoUnidad(u.torre, u.codigo, u.estado)
  const precioVivo = useProyecto((s) => s.disponibilidad[u.torre]?.[u.codigo]?.precio)
  const set = useProyecto((s) => s.set)
  const [copiado, setCopiado] = useState(false)
  const [panelOculto, setPanelOculto] = useState(false)
  const [verDisclaimer, setVerDisclaimer] = useState(false)
  const disponible = estado === 'disponible'
  const precio = disponible ? formatoPrecio(precioVivo ?? u.precio, u.moneda, idioma) : null
  const ref = { id: u.id, codigo: u.codigo, torre: u.torre, torreId: u.torreId }
  const linkModo = (x: PestanaFicha) => rutas.unidad(u.torre, u.codigo, x)

  const compartir = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: tx.ficha.tituloCompartir(u.codigo, p.proyecto.nombre), url })
        return
      } catch {
        /* cancelado: se copia */
      }
    }
    await navigator.clipboard?.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const superficies: [string, number | null | undefined][] = [
    [tx.unidad.total, u.superficieTotal],
    [tx.unidad.interna, u.superficieInterna],
    [tx.unidad.balcon, u.superficieBalcon],
  ]
  const datos: [NombreIcono, string, string | null][] = [
    ['superficie', tx.unidad.ambientes, u.ambientes != null ? String(u.ambientes) : null],
    ['dormitorio', tx.unidad.dormitorios, u.dormitorios != null ? String(u.dormitorios) : null],
    ['bano', tx.unidad.banos, u.banos != null ? String(u.banos) : null],
    ['norte', tx.unidad.orientacion, u.orientacion?.split('(')[0].trim() ?? null],
  ]
  const c = p.proyecto.contacto
  const textoWA = tx.ficha.whatsapp(u.codigo, p.proyecto.nombre)
  const brochure = t?.brochure ?? p.planoUrl

  return (
    <div className={`pantalla pantalla-ficha${panelOculto ? ' sin-panel' : ''}`}>
      <aside className="ficha-panel" aria-hidden={panelOculto} inert={panelOculto}>
        <div className="ficha-scroll">
          <div className="ficha-portada">
            {t?.foto ? <img src={t.foto.chica} alt={t.foto.alt} /> : <div className="ficha-portada-vacia" />}
            <button className="boton-icono compartir" onClick={compartir} aria-label={tx.ficha.compartir} title={copiado ? tx.ficha.copiado : tx.ficha.compartir}>
              <Icono nombre={copiado ? 'copiar' : 'compartir'} tamano={18} />
            </button>
          </div>

          <div className="ficha-encabezado">
            <span className="kicker">
              {p.torreNombre} · {tx.comun.piso(u.piso)}
            </span>
            <h1>{tx.comun.unidad(u.codigo)}</h1>
            <div className="ficha-badges">
              {t && (
                <span className="badge tipologia">
                  {tx.comun.tipologia(t.codigo)}
                  {t.nombre ? ` · ${t.nombre}` : ''}
                </span>
              )}
              <span className={`badge ${estado}`}>{tx.estados[estado]}</span>
            </div>
          </div>

          {disponible ? (
            <div className="ficha-precio">
              {precio && <strong>{precio}</strong>}
              <button className="boton primario" onClick={() => set({ consulta: { origen: 'precio', unidad: ref } })}>
                {tx.consulta.consultarPrecio}
              </button>
            </div>
          ) : (
            <p className="aviso">{tx.unidad.noDisponibleFicha(tx.estadoEnFrase[estado])}</p>
          )}

          <nav className="ficha-modos" aria-label={tx.ficha.verUnidad}>
            {p.pestanas.map((x) => (
              <Link key={x} href={linkModo(x)} replace scroll={false} className={x === p.pestana ? 'activo' : ''} aria-current={x === p.pestana ? 'page' : undefined}>
                <span>
                  <Icono nombre={ICONO_MODO[x]} />
                </span>
                {modo[x]}
              </Link>
            ))}
          </nav>

          <div className="ficha-superficies">
            {superficies
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <strong>{v} m²</strong>
                  <span>{k}</span>
                </div>
              ))}
          </div>

          <dl className="ficha-datos">
            {datos
              .filter(([, , v]) => v)
              .map(([icono, k, v]) => (
                <div key={k}>
                  <Icono nombre={icono} tamano={18} />
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          {u.extras.length > 0 && (
            <ul className="ficha-extras">
              {u.extras.map((e) => (
                <li key={e}>{tx.extras[e] ?? e}</li>
              ))}
            </ul>
          )}

          {t?.descripcion && <p className="ficha-descripcion">{t.descripcion}</p>}

          {(brochure || p.proyecto.brochure) && (
            <div className="ficha-brochures">
              {brochure && (
                <a className="boton" href={brochure} target="_blank" rel="noreferrer">
                  {tx.ficha.verBrochure}
                </a>
              )}
              {p.proyecto.brochure && (
                <a className="boton" href={p.proyecto.brochure} target="_blank" rel="noreferrer">
                  {tx.ficha.brochureGeneral}
                </a>
              )}
            </div>
          )}

          {p.proyecto.legal && (
            <button className="link disclaimer-link" onClick={() => setVerDisclaimer(true)}>
              {tx.ficha.disclaimer}
            </button>
          )}
        </div>

        <footer className="ficha-pie">
          <button className="link-fuerte" onClick={() => set({ consulta: { origen: 'ficha', unidad: ref } })}>
            {tx.ficha.solicitarInfo}
          </button>
          <div className="menu-contacto">
            {c.email && (
              <a href={`mailto:${c.email}?subject=${encodeURIComponent(tx.comun.unidad(u.codigo))}`} aria-label="Email">
                <Icono nombre="contacto" />
              </a>
            )}
            {c.telefono && (
              <a href={`tel:${c.telefono.replace(/[^\d+]/g, '')}`} aria-label={tx.marco.telefono}>
                <Icono nombre="telefono" />
              </a>
            )}
            {c.whatsapp && (
              <a href={linkWhatsApp(c.whatsapp, textoWA)} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <Icono nombre="whatsapp" />
              </a>
            )}
          </div>
        </footer>
      </aside>

      <section className="ficha-media" aria-label={modo[p.pestana]}>
        <MedioFicha {...p} estado={estado} />

        <button
          className="ficha-plegar"
          onClick={() => setPanelOculto((v) => !v)}
          aria-label={panelOculto ? tx.ficha.mostrarDatos : tx.ficha.ocultarDatos}
          aria-expanded={!panelOculto}
        >
          <Icono nombre={panelOculto ? 'derecha' : 'izquierda'} tamano={18} />
        </button>

        <div className="ficha-etiqueta">
          {p.anterior && (
            <Link className="boton-icono chico" href={rutas.unidad(u.torre, p.anterior, p.pestana, p.tipoPlanta)} aria-label={tx.ficha.unidadAnterior(p.anterior)} replace>
              <Icono nombre="izquierda" tamano={16} />
            </Link>
          )}
          <span>
            {modo[p.pestana]} · {tx.comun.unidad(u.codigo)}
            {t ? ` · ${t.codigo}` : ''}
          </span>
          {p.siguiente && (
            <Link className="boton-icono chico" href={rutas.unidad(u.torre, p.siguiente, p.pestana, p.tipoPlanta)} aria-label={tx.ficha.unidadSiguiente(p.siguiente)} replace>
              <Icono nombre="derecha" tamano={16} />
            </Link>
          )}
        </div>

        <nav className="ficha-selector" aria-label={tx.ficha.modo}>
          {p.pestanas.map((x) => (
            <Link
              key={x}
              href={linkModo(x)}
              replace
              scroll={false}
              className={x === p.pestana ? 'activo' : ''}
              aria-current={x === p.pestana ? 'page' : undefined}
              aria-label={modo[x]}
            >
              {/* siempre en el DOM: en los no activos se despliega con hover (sitio.css) */}
              <span>{modo[x]}</span>
              <Icono nombre={ICONO_MODO[x]} tamano={18} />
            </Link>
          ))}
        </nav>

        {/* en Ubicación taparía el mapa (y la atribución de Google) */}
        {p.planoPiso && p.pestana !== 'ubicacion' && (
          <Link className="ficha-ubicacion" href={rutas.planta(u.torre, u.piso, u.codigo)}>
            <div className="ficha-ubicacion-plano">
              <VisorEscena
                escena={p.planoPiso}
                resaltada={u.codigo}
                colorDe={(f) => (f.clave === u.codigo ? 'var(--acento)' : null)}
                etiquetas={false}
              />
            </div>
            <span>{tx.ficha.ubicacionEnPlanta}</span>
          </Link>
        )}
      </section>

      <Modal abierto={verDisclaimer} onCerrar={() => setVerDisclaimer(false)} titulo={tx.ficha.disclaimer}>
        <p className="politica">{p.proyecto.legal}</p>
      </Modal>
    </div>
  )
}

/** el contenido del modo activo; si todavía no hay material, un aviso de "próximamente" */
function MedioFicha(p: Props & { estado: Unidad['estado'] }) {
  const { unidad: u, tipologia: t } = p
  const idioma = useIdioma()
  const tx = useTextos()
  const rutas = useRutas()
  const modo = tx.ficha.modos
  switch (p.pestana) {
    case 'galeria':
      return t?.galeria.length ? (
        <Galeria
          imagenes={t.galeria}
          inicial={Math.max(0, p.n - 1)}
          miniaturas={false}
          onCambio={(i) => window.history.replaceState(null, '', rutas.unidad(u.torre, u.codigo, 'galeria', i + 1))}
        />
      ) : (
        <Proximamente icono="galeria" titulo={modo.galeria} />
      )

    case 'planta':
      return <PlantaFicha {...p} />

    case 'vistas':
      return p.vista ? (
        <figure className="ficha-vista">
          <img src={p.vista.grande} alt={p.vista.alt} />
          <figcaption>{p.vista.epigrafe}</figcaption>
        </figure>
      ) : (
        <Proximamente icono="norte" titulo={modo.vistas} />
      )

    case 'tour':
      if (p.tour?.tipo === 'externo' && p.tour.url)
        return <iframe className="recorrido-externo" src={p.tour.url} title={p.tour.nombre} allowFullScreen />
      if (p.tour?.puntos.length)
        return <VisorRecorrido puntos={p.tour.puntos} plano={p.tour.plano ? { url: p.tour.plano.chica, alt: p.tour.plano.alt } : null} />
      return <Proximamente icono="tour" titulo={tx.ficha.recorrido360} texto={tx.ficha.recorridoProximamente} />

    case 'video':
      return t?.video ? (
        <div className="ficha-video">
          <ReproductorVideo url={t.video} poster={t.foto?.grande} titulo={tx.ficha.videoDe(t.codigo)} />
        </div>
      ) : (
        <Proximamente icono="video" titulo={modo.video} />
      )

    case 'ubicacion': {
      const actual = p.mapas.find((m) => m.vista === p.mapa) ?? p.mapas[0]
      if (!actual) return <Proximamente icono="ubicacion" titulo={modo.ubicacion} />
      return (
        <div className="ficha-mapa">
          {/* el redondeo va en el marco: con border-radius en el iframe Chromium no pinta el mapa */}
          <div className="ficha-mapa-marco">
            <iframe
              key={actual.vista}
              src={actual.url}
              title={tx.ubicacion.iframe(etiquetaMapa(tx, actual), p.proyecto.nombre)}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          {p.mapas.length > 1 && (
            <CarrilChips etiqueta={tx.ficha.vistaDelMapa}>
              {p.mapas.map((m) => (
                <Link
                  key={m.vista}
                  href={rutas.unidad(u.torre, u.codigo, 'ubicacion', m.vista)}
                  replace
                  scroll={false}
                  className={`chip${m.vista === actual.vista ? ' activo' : ''}`}
                  aria-current={m.vista === actual.vista ? 'page' : undefined}
                >
                  {etiquetaMapa(tx, m)}
                </Link>
              ))}
            </CarrilChips>
          )}
        </div>
      )
    }
  }
}

/** Planta 2D (plano técnico) o 3D (render cenital o, sin render, la huella del esquema); con las dos, un selector */
function PlantaFicha(p: Props & { estado: Unidad['estado'] }) {
  const { unidad: u, tipologia: t } = p
  const idioma = useIdioma()
  const tx = useTextos()
  const rutas = useRutas()
  const hay: Record<TipoPlanta, boolean> = { '2d': !!t?.planta2d, '3d': !!(t?.planta || p.huella) }
  const tipo: TipoPlanta = p.tipoPlanta && hay[p.tipoPlanta] ? p.tipoPlanta : hay['3d'] ? '3d' : '2d'
  const imagen = tipo === '2d' ? t?.planta2d : t?.planta

  let medio
  if (t && imagen)
    medio = (
      <VisorEscena
        key={tipo}
        className="ficha-planta"
        escena={{
          ancho: imagen.ancho ?? 1600,
          alto: imagen.alto ?? 1200,
          fondo: { url: imagen.grande, alt: `${tx.ficha.plantaDe(t.codigo)} · ${tipo === '2d' ? tx.ficha.planta2d : tx.ficha.planta3d}` },
          formas: [],
        }}
        zoom
      />
    )
  else if (p.huella)
    medio = (
      <div className="ficha-huella">
        <VisorEscena escena={p.huella} colorDe={() => COLOR_ESTADO[p.estado]} etiquetas={false} zoom />
        {p.huella.medidas && (
          <p className="medidas">
            {formatoMedida(p.huella.medidas[0], idioma)} m × {formatoMedida(p.huella.medidas[1], idioma)} m · {tx.ficha.esquemaIlustrativo}
          </p>
        )}
      </div>
    )
  else return <Proximamente icono="planta" titulo={tx.ficha.modos.planta} />

  return (
    <>
      {medio}
      {hay['2d'] && hay['3d'] && (
        <nav className={`ficha-tipo-planta${tipo === '3d' && !t?.planta ? ' sobre-medidas' : ''}`} aria-label={tx.ficha.tipoPlanta}>
          {(['2d', '3d'] as const).map((x) => (
            <Link
              key={x}
              href={rutas.unidad(u.torre, u.codigo, 'planta', x)}
              replace
              scroll={false}
              className={x === tipo ? 'activo' : ''}
              aria-current={x === tipo ? 'page' : undefined}
            >
              {x === '2d' ? tx.ficha.planta2d : tx.ficha.planta3d}
            </Link>
          ))}
        </nav>
      )}
    </>
  )
}

function Proximamente({ icono, titulo, texto }: { icono: NombreIcono; titulo: string; texto?: string }) {
  const tx = useTextos()
  return (
    <div className="vacio proximamente">
      <span className="proximamente-icono">
        <Icono nombre={icono} tamano={34} />
      </span>
      <h2>{titulo}</h2>
      <p>{tx.ficha.proximamente}</p>
      {texto && <small>{texto}</small>}
    </div>
  )
}
