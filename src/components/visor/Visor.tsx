'use client'

import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

import type { Unidad } from '@/lib/tipos'

import { textoTooltip } from '../proyecto/TooltipUnidad'
import { BarraVistas } from '../ui/BarraVistas'
import { PanelPisos } from '../ui/PanelPisos'
import { useTextos } from '../ui/ProveedorIdioma'
import { UnitPopover } from '../ui/UnitPopover'
import { Ambiente } from './Ambiente'
import { ControlCamara } from './ControlCamara'
import { Modelo } from './Modelo'
import type { ModeloPreparado } from './prepararModelo'
import { useVisor } from './store'
import type { ConfigVisor, UnidadVisor } from './tipos'

export type VisorProps = {
  config: ConfigVisor
  unidades: UnidadVisor[]
  /** datos completos para el popup de unidad (el mismo de planta y fachada) */
  fichas: Unidad[]
  torre: string
  pisoInicial?: number | null
  conTour?: boolean
}

const CENTRO_POR_DEFECTO = new THREE.Vector3(0, 15, 0)

export default function Visor({ config, unidades, fichas, torre, pisoInicial = null, conTour }: VisorProps) {
  const [modelo, setModelo] = useState<ModeloPreparado | null>(null)
  const onListo = useCallback((m: ModeloPreparado) => setModelo(m), [])

  // el store es global: al entrar a otro edificio arranca limpio
  useEffect(() => {
    useVisor.setState({
      cargado: false,
      hora: 0,
      verDisponibilidad: false,
      soloDisponibles: false,
      dormitorios: null,
      pisoSeleccionado: pisoInicial,
      unidadHover: null,
      unidadSeleccionada: null,
      vista: null,
    })
  }, [config.edificioId, pisoInicial])

  const alto = modelo ? modelo.caja.max.y - modelo.caja.min.y : 30
  const centro = modelo ? modelo.caja.getCenter(new THREE.Vector3()) : CENTRO_POR_DEFECTO

  const tooltipRef = useRef<HTMLDivElement>(null)
  const moverTooltip = (e: React.PointerEvent) => {
    const el = tooltipRef.current
    if (el) el.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`
  }

  return (
    <div className="visor" onPointerMove={moverTooltip}>
      <Canvas
        className="visor-canvas"
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 40, near: 0.5, far: 8000, position: [60, 20, 45] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Ambiente solElevacion={config.solElevacion} solAzimut={config.solAzimut} tamano={alto} centro={centro} />
        <Suspense fallback={null}>
          <Modelo config={config} unidades={unidades} onListo={onListo} />
        </Suspense>
        {modelo && <ControlCamara modelo={modelo} vistas={config.vistas} />}
      </Canvas>

      <Cargando portada={config.portadaUrl} nombre={config.nombre} />
      <PanelPisos unidades={unidades} torre={torre} />
      <PopupUnidad fichas={fichas} conTour={conTour} />
      <BarraVistas vistas={config.vistas} />
      <Tooltip refEl={tooltipRef} unidades={unidades} />
    </div>
  )
}

/** la unidad elegida en el 3D abre el mismo popup que en planta y fachada, fijo abajo a la izquierda */
function PopupUnidad({ fichas, conTour }: { fichas: Unidad[]; conTour?: boolean }) {
  const codigo = useVisor((s) => s.unidadSeleccionada)
  const set = useVisor((s) => s.set)
  const cerrar = useCallback(() => set({ unidadSeleccionada: null }), [set])
  const u = codigo ? fichas.find((x) => x.codigo.toUpperCase() === codigo.toUpperCase()) : null
  return u ? <UnitPopover unidad={u} x={0} y={0} fijo onCerrar={cerrar} conTour={conTour} /> : null
}

function Cargando({ portada, nombre }: { portada?: string | null; nombre: string }) {
  const { progress } = useProgress()
  const t = useTextos()
  const cargado = useVisor((s) => s.cargado)
  return (
    <div className={`visor-cargando${cargado ? ' oculto' : ''}`} aria-hidden={cargado}>
      {portada && <img src={portada} alt="" className="visor-cargando-img" />}
      <div className="visor-cargando-caja">
        <div className="visor-cargando-titulo">{t.visor3d.cargando(nombre)}</div>
        <div className="barra">
          <span style={{ width: `${Math.round(progress)}%` }} />
        </div>
      </div>
    </div>
  )
}

function Tooltip({ refEl, unidades }: { refEl: React.RefObject<HTMLDivElement | null>; unidades: UnidadVisor[] }) {
  const hover = useVisor((s) => s.unidadHover)
  const t = useTextos()
  const u = hover ? unidades.find((x) => x.codigo.toUpperCase() === hover.toUpperCase()) : null
  return (
    <div ref={refEl} className="visor-tooltip" hidden={!u}>
      {u && textoTooltip(t, u, u.estado)}
    </div>
  )
}
