import { preload } from 'react-dom'

import { FondoConNubes } from '@/components/proyecto/FondoConNubes'
import { BotonEntrar, IntroConEntrada } from '@/components/proyecto/IntroConEntrada'
import { imagen, obtenerProyecto, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { vistasGiro } from '@/lib/escenas'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { pisoInicial } from '@/lib/navegacion'
import type { Media } from '@/payload-types'

export const revalidate = 60

const urlVideo = (m: unknown) => (m && typeof m === 'object' && 'url' in m ? ((m as Media).url ?? null) : null)

// Intro (spec A): video en loop (o la portada con un zoom lento) y "Entrar", que hace zoom hacia el edificio y lleva
// a Plantas (o al Giro si todavía no hay torres). Mientras tanto se precarga el Giro. Con la portada, "Entrar" puede
// reproducir antes el video de entrada (de la calle al hall) que arranca en el mismo cuadro.
export default async function Intro() {
  const [proyecto, sitio, torres, vistas, rutas, tx] = await Promise.all([
    obtenerProyecto(),
    obtenerSitio(),
    obtenerTorres(),
    vistasGiro(),
    rutasServidor(),
    textosServidor(),
  ])
  const video = urlVideo(sitio.intro?.video)
  const videoMovil = urlVideo(sitio.intro?.videoMovil)
  const fondo = imagen(sitio.intro?.poster) ?? torres[0]?.portada ?? vistas[0]?.imagen ?? null
  const entrada = video ? null : urlVideo(sitio.intro?.videoEntrada)
  for (const v of vistas) preload(v.imagen.grande, { as: 'image' })

  const t = torres[0]
  const destino = t ? rutas.planta(t.slug, pisoInicial(t)) : rutas.giro(0)
  return (
    <IntroConEntrada video={entrada} href={destino}>
      {video ? (
        <video className="intro-fondo" autoPlay muted loop playsInline poster={fondo?.grande}>
          {videoMovil && <source src={videoMovil} media="(orientation: portrait)" />}
          <source src={video} />
        </video>
      ) : (
        fondo && <FondoConNubes src={fondo.grande} nubes={sitio.intro?.nubes !== false} />
      )}
      <div className="intro-velo" aria-hidden />

      <div className="intro-contenido">
        {t?.estadoObra && <span className="kicker">{tx.estadoObra[t.estadoObra] ?? t.estadoObra}{t.entrega ? ` · ${tx.intro.entrega(t.entrega)}` : ''}</span>}
        {proyecto.logo ? <img className="intro-logo" src={proyecto.logo.url} alt={proyecto.nombre} /> : <h1>{proyecto.nombre}</h1>}
        {proyecto.eslogan && <p className="intro-eslogan">{proyecto.eslogan}</p>}
        <BotonEntrar className="boton primario grande" href={destino}>
          {tx.comun.entrar}
        </BotonEntrar>
      </div>

      {proyecto.desarrolladora.nombre && <p className="intro-firma">{tx.comun.desarrolloDe(proyecto.desarrolladora.nombre)}</p>}
    </IntroConEntrada>
  )
}
