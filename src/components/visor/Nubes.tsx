'use client'

import { Cloud, Clouds } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import { hora } from './hora'

// Nubes alrededor del edificio, más allá de donde llega la cámara (maxDistance = alto × 7), para que nunca la
// atraviesen. Las medidas van en "altos de edificio" y se escalan con el modelo.
const CANTIDAD = 18
const NUBES = Array.from({ length: CANTIDAD }, (_, i) => {
  // pseudoaleatorio fijo: las nubes quedan siempre en el mismo lugar
  const r = (n: number) => {
    const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453
    return x - Math.floor(x)
  }
  return {
    angulo: (i / CANTIDAD) * Math.PI * 2 + r(1) * 0.3,
    radio: 10 + r(2) * 6,
    altura: 2.2 + r(3) * 4,
    ancho: 2.5 + r(4) * 2.5,
    semilla: i + 1,
  }
})

// Textura de "bocanada" generada en un canvas: evita bajar la de drei desde un CDN externo.
function texturaNube() {
  const t = 128
  const c = document.createElement('canvas')
  c.width = c.height = t
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(t / 2, t / 2, 0, t / 2, t / 2, t / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,.75)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, t, t)
  return c.toDataURL('image/png')
}

// La niebla de la escena las lavaba contra el cielo: las nubes ya están lejos y se ven mejor sin ella.
class MaterialNube extends THREE.MeshLambertMaterial {
  constructor(p?: THREE.MeshLambertMaterialParameters) {
    super(p)
    this.fog = false
  }
}

export function Nubes({ tamano, centro }: { tamano: number; centro: THREE.Vector3 }) {
  const textura = useMemo(texturaNube, [])
  const anillo = useRef<THREE.Group>(null)

  // el anillo entero gira muy despacio: las nubes "pasan" sin salir nunca de cuadro. El color y la opacidad según
  // la hora van al material compartido (no a cada <Cloud>, que re-renderizaría todo).
  const material = useRef<THREE.MeshLambertMaterial | null>(null)
  useFrame((_, dt) => {
    const g = anillo.current
    if (!g) return
    g.rotation.y += dt * 0.004
    if (!material.current)
      g.traverse((o) => {
        if ((o as THREE.InstancedMesh).isInstancedMesh) material.current = (o as THREE.InstancedMesh).material as THREE.MeshLambertMaterial
      })
    if (material.current) {
      material.current.color.copy(hora.p.colorNubes)
      material.current.opacity = hora.p.opacidadNubes
    }
  })

  // drei piensa las nubes en unidades de ~10 m; se escala para que acompañen el tamaño del edificio
  const k = tamano / 10

  return (
    <group ref={anillo} position={[centro.x, 0, centro.z]}>
      <Clouds texture={textura} limit={600} material={MaterialNube} frustumCulled={false}>
        {NUBES.map((n) => (
          <group
            key={n.semilla}
            position={[Math.cos(n.angulo) * n.radio * tamano, n.altura * tamano, Math.sin(n.angulo) * n.radio * tamano]}
            scale={k}
          >
            <Cloud
              seed={n.semilla}
              segments={30}
              bounds={[n.ancho * 10, 4, n.ancho * 5]}
              volume={n.ancho * 9}
              smallestVolume={0.35}
              growth={3}
              speed={0.08}
              fade={0}
            />
          </group>
        ))}
      </Clouds>
    </group>
  )
}
