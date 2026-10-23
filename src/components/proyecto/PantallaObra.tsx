'use client'

import { useState } from 'react'

import { LOCALE } from '@/lib/idiomas'
import type { Imagen } from '@/lib/tipos'

import { Galeria } from '../ui/Galeria'
import { useIdioma, useTextos } from '../ui/ProveedorIdioma'

export type Avance = { id: number | string; titulo: string; fecha: string; texto?: string | null; fotos: Imagen[] }

// Avance de obra (spec O): una entrega por fecha con su texto y fotos; la tira agrupa las entregas por mes.
export function PantallaObra({ avances }: { avances: Avance[] }) {
  const idioma = useIdioma()
  const t = useTextos().obra
  const mes = new Intl.DateTimeFormat(LOCALE[idioma], { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const dia = new Intl.DateTimeFormat(LOCALE[idioma], { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const [actual, setActual] = useState(0)
  const a = avances[actual]
  const meses = new Map<string, { i: number; av: Avance }[]>()
  avances.forEach((av, i) => {
    const k = mes.format(new Date(av.fecha))
    meses.set(k, [...(meses.get(k) ?? []), { i, av }])
  })

  return (
    <div className="pantalla pantalla-obra">
      <section className="obra-media">
        <Galeria key={a.id} imagenes={a.fotos} miniaturas={a.fotos.length > 1} />
      </section>
      <aside className="obra-panel">
        <span className="kicker">{t.kicker}</span>
        <h1>{a.titulo}</h1>
        <time dateTime={a.fecha} className="muted">
          {dia.format(new Date(a.fecha))}
        </time>
        {a.texto && <p>{a.texto}</p>}

        <nav className="obra-linea" aria-label={t.entregas}>
          {[...meses.entries()].map(([m, items]) => (
            <div key={m} className="obra-mes">
              <h2>{m}</h2>
              <div className="obra-miniaturas">
                {items.map(({ i, av }) => (
                  <button key={av.id} className={i === actual ? 'activa' : ''} aria-current={i === actual} onClick={() => setActual(i)} title={av.titulo}>
                    {av.fotos[0] && <img src={av.fotos[0].chica} alt="" loading="lazy" />}
                    <span>{av.titulo}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </div>
  )
}
