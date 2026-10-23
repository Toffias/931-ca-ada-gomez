'use client'

import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'

import type { Viewer } from '@photo-sphere-viewer/core'
import type { VirtualTourNode, VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { useEffect, useRef, useState } from 'react'

import { useTextos } from '../ui/ProveedorIdioma'

export type PuntoRecorrido = {
  clave: string
  titulo: string
  rumbo: number
  panorama: string | null
  x?: number | null
  y?: number | null
  enlaces: string[]
}

type Props = {
  puntos: PuntoRecorrido[]
  inicial?: string
  plano?: { url: string; alt: string } | null
  onCambio?: (clave: string) => void
}

// Si todos los puntos tienen posición en el plano, se usa como "GPS" local: el plugin calcula solo hacia dónde
// apunta cada flecha. Si no, las flechas se reparten alrededor. El plano tiene que estar con el norte arriba y ser
// cuadrado (x e y en % valen lo mismo), como el que genera scripts/blender/renders_recorrido.py.
const ESCALA_GPS = 0.00001

// Recorrido 360 propio (spec L): panoramas equirectangulares con saltos entre puntos y plano con los puntos.
export function VisorRecorrido({ puntos, inicial, plano, onCambio }: Props) {
  const t = useTextos()
  const textos = useRef(t)
  textos.current = t
  const caja = useRef<HTMLDivElement>(null)
  const tour = useRef<VirtualTourPlugin | null>(null)
  const [actual, setActual] = useState(inicial ?? puntos[0]?.clave)
  const onCambioRef = useRef(onCambio)
  onCambioRef.current = onCambio

  useEffect(() => {
    if (!caja.current || !puntos.length) return
    let viewer: Viewer | null = null
    let vivo = true
    const conGps = puntos.every((p) => p.x != null && p.y != null)

    Promise.all([
      import('@photo-sphere-viewer/core'),
      import('@photo-sphere-viewer/markers-plugin'),
      import('@photo-sphere-viewer/virtual-tour-plugin'),
    ]).then(([{ Viewer }, { MarkersPlugin }, { VirtualTourPlugin }]) => {
      if (!vivo || !caja.current) return
      const inicio = puntos.find((p) => p.clave === inicial) ?? puntos[0]
      const nodos: VirtualTourNode[] = puntos.map((p) => ({
        id: p.clave,
        panorama: p.panorama,
        name: p.titulo,
        caption: p.titulo,
        // rumbo = hacia dónde mira el centro de la panorámica; girándola al revés, el norte queda en yaw 0 como las flechas
        sphereCorrection: { pan: `${-p.rumbo}deg` },
        gps: conGps ? [p.x! * ESCALA_GPS, -p.y! * ESCALA_GPS] : undefined,
        links: p.enlaces
          .filter((e) => puntos.some((q) => q.clave === e))
          .map((e, i, todos) => (conGps ? { nodeId: e } : { nodeId: e, position: { yaw: (2 * Math.PI * i) / todos.length, pitch: -0.2 } })),
      }))
      viewer = new Viewer({
        container: caja.current,
        loadingTxt: textos.current.comun.cargando,
        // arranca mirando al centro de la panorámica: hacia donde apuntaba la cámara
        defaultYaw: `${inicio.rumbo}deg`,
        navbar: ['zoom', 'move', 'caption', 'fullscreen'],
        lang: textos.current.recorridos.visor,
        plugins: [
          MarkersPlugin,
          [VirtualTourPlugin, { positionMode: conGps ? 'gps' : 'manual', renderMode: '3d', nodes: nodos, startNodeId: inicio.clave, preload: true }],
        ],
      })
      const vt = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin)
      tour.current = vt
      vt.addEventListener('node-changed', ({ node }) => {
        setActual(node.id)
        onCambioRef.current?.(node.id)
      })
    })

    return () => {
      vivo = false
      tour.current = null
      viewer?.destroy()
    }
    // el visor se arma una vez por recorrido; cambiar de punto lo hace el propio plugin
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puntos])

  return (
    <div className="recorrido">
      <div ref={caja} className="recorrido-visor" />
      {plano && puntos.some((p) => p.x != null) && (
        <div className="recorrido-plano">
          <img src={plano.url} alt={plano.alt} />
          {puntos
            .filter((p) => p.x != null && p.y != null)
            .map((p) => (
              <button
                key={p.clave}
                className={`recorrido-punto${p.clave === actual ? ' activo' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-label={p.titulo}
                title={p.titulo}
                onClick={() => tour.current?.setCurrentNode(p.clave)}
              />
            ))}
        </div>
      )}
    </div>
  )
}
