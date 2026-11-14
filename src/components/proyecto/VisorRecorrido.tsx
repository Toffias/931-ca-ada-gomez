'use client'

import '@photo-sphere-viewer/core/index.css'
import '@photo-sphere-viewer/markers-plugin/index.css'
import '@photo-sphere-viewer/virtual-tour-plugin/index.css'

import type { Viewer } from '@photo-sphere-viewer/core'
import type { MarkerConfig, MarkersPlugin as PluginMarcadores } from '@photo-sphere-viewer/markers-plugin'
import type { VirtualTourNode, VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin'
import { useEffect, useRef, useState } from 'react'

import { useTextos } from '../ui/ProveedorIdioma'

export type PuntoRecorrido = {
  clave: string
  titulo: string
  rumbo: number
  panorama: string | null
  // la misma toma en otro momento del día (clave de `variantes` → panorámica); sin ella se ve `panorama`
  panoramas?: Record<string, string | null>
  x?: number | null
  y?: number | null
  enlaces: string[]
}

export type VarianteRecorrido = { clave: string; titulo: string }

type Props = {
  puntos: PuntoRecorrido[]
  inicial?: string
  plano?: { url: string; alt: string } | null
  // momentos del día (día, atardecer, noche…): la primera es la de `panorama`
  variantes?: VarianteRecorrido[]
  onCambio?: (clave: string) => void
}

const panoramaDe = (p: PuntoRecorrido, variante?: string) => (variante && p.panoramas?.[variante]) || p.panorama

// Flechas en el piso: un ">" fino dentro de un círculo, acostado sobre el piso en la dirección del otro ambiente.
// Es un marcador 3D (elementLayer): queda fijo en la panorámica y, al girar, sale de cuadro como cualquier objeto.
const FLECHA =
  '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<circle cx="50" cy="50" r="45" stroke-width="2.4"/><path d="M35 57 L50 42 L65 57" stroke-width="3.8"/></svg>'
// El plano es cuadrado y con el norte arriba (renders_recorrido.py); estos metros por lado son aproximados y sólo
// definen a qué distancia en el piso se apoya la flecha.
const METROS_PLANO = 13
const ALTURA_CAMARA = 1.5
// la flecha va entre estos metros de la cámara: ni a los pies ni perdida al fondo
const DISTANCIA_FLECHA: [number, number] = [1.5, 3.2]
const TAMANO_FLECHA = 150 // px del elemento; en 3D se ve más chico cuanto más lejos queda

const flechasDe = (origen: PuntoRecorrido, puntos: PuntoRecorrido[]): MarkerConfig[] => {
  if (origen.x == null || origen.y == null) return []
  return origen.enlaces.flatMap((clave) => {
    const destino = puntos.find((q) => q.clave === clave)
    if (!destino || destino.x == null || destino.y == null) return []
    const dx = destino.x - origen.x!
    const dy = destino.y - origen.y!
    // rumbo desde el norte, en sentido horario (y del plano crece hacia el sur); con sphereCorrection es el yaw
    const yaw = Math.atan2(dx, -dy)
    const metros = (Math.hypot(dx, dy) / 100) * METROS_PLANO
    const d = Math.min(Math.max(metros * 0.6, DISTANCIA_FLECHA[0]), DISTANCIA_FLECHA[1])
    const pitch = -Math.atan(ALTURA_CAMARA / d)
    const elemento = document.createElement('div')
    elemento.innerHTML = FLECHA
    // el plugin mide el elemento para dibujarlo en 3D: sin tamaño propio tomaría el ancho del visor
    elemento.style.width = elemento.style.height = `${TAMANO_FLECHA}px`
    return [
      {
        id: `flecha-${clave}`,
        elementLayer: elemento,
        className: 'recorrido-flecha',
        position: { yaw, pitch },
        size: { width: TAMANO_FLECHA, height: TAMANO_FLECHA },
        // los marcadores 3D nacen parados mirando al centro: 90° los acuesta, con el ">" apuntando hacia adelante
        rotation: { pitch: Math.PI / 2 },
        tooltip: destino.titulo,
        data: { destino: clave },
      },
    ]
  })
}

// Recorrido 360 propio (spec L): panoramas equirectangulares. Se pasa de un punto a otro con las flechas del piso,
// la lista de ambientes o los puntos del plano.
export function VisorRecorrido({ puntos, inicial, plano, variantes = [], onCambio }: Props) {
  const t = useTextos()
  const textos = useRef(t)
  textos.current = t
  const caja = useRef<HTMLDivElement>(null)
  const tour = useRef<VirtualTourPlugin | null>(null)
  const [actual, setActual] = useState(inicial ?? puntos[0]?.clave)
  const [variante, setVariante] = useState(variantes[0]?.clave)
  const varianteRef = useRef(variante)
  varianteRef.current = variante
  const onCambioRef = useRef(onCambio)
  onCambioRef.current = onCambio

  useEffect(() => {
    if (!caja.current || !puntos.length) return
    let viewer: Viewer | null = null
    let vivo = true
    const porClave = new Map(puntos.map((p) => [p.clave, p]))

    Promise.all([
      import('@photo-sphere-viewer/core'),
      import('@photo-sphere-viewer/markers-plugin'),
      import('@photo-sphere-viewer/virtual-tour-plugin'),
    ]).then(([{ Viewer }, { MarkersPlugin }, { VirtualTourPlugin }]) => {
      if (!vivo || !caja.current) return
      const inicio = puntos.find((p) => p.clave === inicial) ?? puntos[0]
      const nodos: VirtualTourNode[] = puntos.map((p) => ({
        id: p.clave,
        panorama: panoramaDe(p, varianteRef.current),
        name: p.titulo,
        caption: p.titulo,
        // rumbo = hacia dónde mira el centro de la panorámica; girándola al revés, el norte queda en yaw 0
        sphereCorrection: { pan: `${-p.rumbo}deg` },
        links: [],
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
          [
            VirtualTourPlugin,
            {
              positionMode: 'manual',
              renderMode: '3d',
              nodes: nodos,
              startNodeId: inicio.clave,
              // cambiar el momento del día recarga el mismo punto: fundido sin girar ni mostrar el cargador
              transitionOptions: (destino: VirtualTourNode, origen?: VirtualTourNode) =>
                origen?.id === destino.id ? { showLoader: false, speed: 900, rotation: false, effect: 'fade' } : {},
            },
          ],
        ],
      })
      const vt = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin)
      const marcadores = viewer.getPlugin<PluginMarcadores>(MarkersPlugin)
      tour.current = vt
      vt.addEventListener('node-changed', ({ node }) => {
        setActual(node.id)
        onCambioRef.current?.(node.id)
        const punto = porClave.get(node.id)
        marcadores.setMarkers(punto ? flechasDe(punto, puntos) : [])
      })
      marcadores.addEventListener('select-marker', ({ marker }) => {
        const destino = (marker.data as { destino?: string } | undefined)?.destino
        if (destino) vt.setCurrentNode(destino)
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

  const ir = (clave: string) => tour.current?.setCurrentNode(clave)
  const cambiarVariante = (clave: string) => {
    setVariante(clave)
    // el punto actual va último: updateNode lo recarga en el momento
    for (const p of [...puntos.filter((p) => p.clave !== actual), ...puntos.filter((p) => p.clave === actual)]) {
      const panorama = panoramaDe(p, clave)
      if (panorama) tour.current?.updateNode({ id: p.clave, panorama })
    }
  }
  return (
    <div className="recorrido">
      <div ref={caja} className="recorrido-visor" />
      {variantes.length > 1 && (
        <div className="recorrido-variantes" role="group" aria-label={t.recorridos.momento}>
          {variantes.map((v) => (
            <button key={v.clave} className={v.clave === variante ? 'activo' : undefined} aria-pressed={v.clave === variante} onClick={() => cambiarVariante(v.clave)}>
              {v.titulo}
            </button>
          ))}
        </div>
      )}
      <div className="recorrido-panel">
        {puntos.length > 1 && (
          <nav className="recorrido-lista" aria-label={t.recorridos.ambientes}>
            {puntos.map((p) => (
              <button
                key={p.clave}
                className={p.clave === actual ? 'activo' : undefined}
                aria-current={p.clave === actual ? 'location' : undefined}
                onClick={() => ir(p.clave)}
              >
                {p.titulo}
              </button>
            ))}
          </nav>
        )}
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
                  onClick={() => ir(p.clave)}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
