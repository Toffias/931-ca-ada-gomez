import { preload } from 'react-dom'

import { FondoConNubes } from '@/components/proyecto/FondoConNubes'
import { EnlaceProfundo } from '@/components/ui/EnlaceProfundo'
import { imagen, obtenerProyecto, obtenerSitio, obtenerTorres } from '@/lib/datos'
import { vistasGiro } from '@/lib/escenas'
import { rutasServidor, textosServidor } from '@/lib/idioma-servidor'
import { pisoInicial } from '@/lib/navegacion'
import type { Media } from '@/payload-types'

export const revalidate = 60

const urlVideo = (m: unknown) => (m && typeof m === 'object' && 'url' in m ? ((m as Media).url ?? null) : null)

// Intro (spec A): video en loop (o la portada con un zoom lento) y "Entrar", que hace zoom hacia el edificio y lleva
// a Plantas (o al Giro si todavía no hay torres). Mientras tanto se precarga el Giro.
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
  for (const v of vistas) preload(v.imagen.grande, { as: 'image' })

  const t = torres[0]
  return (
    <div className="pantalla intro">
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
        <EnlaceProfundo className="boton primario grande" href={t ? rutas.planta(t.slug, pisoInicial(t)) : rutas.giro(0)}>
          {tx.comun.entrar}
        </EnlaceProfundo>
      </div>

      {proyecto.desarrolladora.nombre && <p className="intro-firma">{tx.comun.desarrolloDe(proyecto.desarrolladora.nombre)}</p>}
    </div>
  )
}
