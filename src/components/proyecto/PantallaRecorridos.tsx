'use client'

import Link from 'next/link'

import type { Imagen } from '@/lib/tipos'

import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'
import { type PuntoRecorrido, VisorRecorrido } from './VisorRecorrido'

export type RecorridoPublico = {
  slug: string
  nombre: string
  tipo: 'propio' | 'externo'
  url?: string | null
  plano: Imagen | null
  puntos: PuntoRecorrido[]
}

export function PantallaRecorridos({ recorridos, actual, punto }: { recorridos: RecorridoPublico[]; actual: RecorridoPublico; punto?: string }) {
  const rutas = useRutas()
  const t = useTextos().recorridos
  return (
    <div className="pantalla pantalla-recorridos">
      {actual.tipo === 'externo' && actual.url ? (
        <iframe className="recorrido-externo" src={actual.url} title={actual.nombre} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
      ) : actual.puntos.length ? (
        <VisorRecorrido
          key={actual.slug}
          puntos={actual.puntos}
          inicial={punto}
          plano={actual.plano ? { url: actual.plano.chica, alt: actual.plano.alt } : null}
          onCambio={(clave) => window.history.replaceState(null, '', rutas.recorridos(actual.slug, clave))}
        />
      ) : (
        <div className="vacio">
          <Icono nombre="tour" tamano={44} />
          <p>{t.sinPanoramas}</p>
        </div>
      )}
      <header className="galeria-titulo">
        <span className="kicker">{t.kicker}</span>
        <h1>{actual.nombre}</h1>
      </header>
      {recorridos.length > 1 && (
        <nav className="chips galeria-pestanas" aria-label={t.recorridos}>
          {recorridos.map((r) => (
            <Link key={r.slug} href={rutas.recorridos(r.slug)} className={`chip${r.slug === actual.slug ? ' activo' : ''}`} replace>
              {r.nombre}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}
