'use client'

import { useCallback, useState } from 'react'

import type { Escena } from '@/lib/escena/tipos'
import type { VistaFachada } from '@/lib/escenas'
import { etiquetaFachada } from '@/lib/etiquetas'
import type { Unidad } from '@/lib/tipos'

import { VisorEscena } from '../escena/VisorEscena'
import { EnlaceProfundo } from '../ui/EnlaceProfundo'
import { Icono } from '../ui/Icono'
import { useRutas, useTextos } from '../ui/ProveedorIdioma'
import { UnitPopover } from '../ui/UnitPopover'
import { FiltrosUnidades, LeyendaEstados } from './FiltrosUnidades'
import { TooltipUnidad } from './TooltipUnidad'
import { useUnidadesEnEscena } from './useUnidadesEnEscena'

type Props = {
  escena: Escena
  vistas: VistaFachada[]
  actual: string
  unidades: Unidad[]
  conTour: boolean
  dormitoriosPosibles: number[]
}

// Disponibilidad en fachada (spec J): cada unidad pintada por estado sobre el render (o el esquema) de una fachada.
export function PantallaFachada({ escena, vistas, actual, unidades, conTour, dormitoriosPosibles }: Props) {
  const rutas = useRutas()
  const t = useTextos()
  const s = useUnidadesEnEscena(unidades)
  const { setElegida } = s
  const [mouse, setMouse] = useState<[number, number] | null>(null)
  const cerrar = useCallback(() => setElegida(null), [setElegida])
  const i = vistas.findIndex((v) => v.clave === actual)
  const anterior = vistas[(i - 1 + vistas.length) % vistas.length]
  const siguiente = vistas[(i + 1) % vistas.length]
  // para los chips: se gira hacia el lado más corto, como si la cámara diera la vuelta al edificio
  const ladoHacia = (j: number) => ((j - i + vistas.length) % vistas.length <= vistas.length / 2 ? 'derecha' : 'izquierda')
  const conTorre = (u?: Unidad | null) => (u ? `${u.torre}/${u.codigo}` : null)
  const render = !!escena.fondo

  return (
    <div className="pantalla pantalla-fachada" onPointerMove={(e) => s.hover && setMouse([e.clientX, e.clientY])}>
      <div className={`fachada-lienzo${render ? ' con-render' : ''}`}>
        <VisorEscena
          escena={escena}
          ajuste={render ? 'cubrir-formas' : 'contener'}
          colorDe={s.colorDe}
          apagada={s.apagada}
          hover={conTorre(s.hover?.unidad)}
          resaltada={conTorre(s.elegida?.unidad)}
          etiquetas={!render}
          etiquetaDe={(f) => {
            const u = s.unidadDe(f)
            return u ? t.escena.unidadEstado(u.codigo, t.estados[s.estadoDe(u)]) : f.clave
          }}
          onHover={s.onHover}
          onElegir={s.onElegir}
          zoom
        />
      </div>

      <header className="planta-titulo">
        <span className="kicker">{t.fachada.kicker}</span>
        <h1>{vistas[i] && etiquetaFachada(t, vistas[i])}</h1>
        <p className="muted">{render ? t.fachada.render : t.fachada.esquema}</p>
      </header>

      {vistas.length > 1 && (
        <>
          <EnlaceProfundo tipo="izquierda" className="boton-icono giro-flecha izq" href={rutas.disponibilidad(anterior.clave)} aria-label={t.fachada.ver(etiquetaFachada(t, anterior))} replace>
            <Icono nombre="izquierda" />
          </EnlaceProfundo>
          <EnlaceProfundo tipo="derecha" className="boton-icono giro-flecha der" href={rutas.disponibilidad(siguiente.clave)} aria-label={t.fachada.ver(etiquetaFachada(t, siguiente))} replace>
            <Icono nombre="derecha" />
          </EnlaceProfundo>
          <nav className="chips fachada-vistas" aria-label={t.fachada.fachadas}>
            {vistas.map((v, j) => (
              <EnlaceProfundo key={v.clave} tipo={ladoHacia(j)} href={rutas.disponibilidad(v.clave)} className={`chip${v.clave === actual ? ' activo' : ''}`} replace>
                {etiquetaFachada(t, v, true)}
              </EnlaceProfundo>
            ))}
          </nav>
        </>
      )}

      <aside className="planta-controles">
        <FiltrosUnidades dormitoriosPosibles={dormitoriosPosibles} />
        <LeyendaEstados />
      </aside>

      <TooltipUnidad
        hover={s.hover && mouse ? { ...s.hover, x: mouse[0], y: mouse[1] } : s.hover}
        estado={s.hover ? s.estadoDe(s.hover.unidad) : undefined}
      />
      {s.elegida && <UnitPopover unidad={s.elegida.unidad} x={s.elegida.x} y={s.elegida.y} onCerrar={cerrar} conTour={conTour} />}
    </div>
  )
}
