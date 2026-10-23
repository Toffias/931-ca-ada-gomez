'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

import { calcularHora, direccionSol, hora, type ParametrosHora } from './hora'
import { Nubes } from './Nubes'
import { useVisor } from './store'

type Props = { solElevacion: number; solAzimut: number; tamano: number; centro: THREE.Vector3 }

const DOMO_NOCHE = {
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uOpacidad;
    varying vec3 vDir;
    void main() {
      float h = clamp(vDir.y, -0.1, 1.0);
      vec3 c = mix(vec3(0.227, 0.247, 0.388), vec3(0.078, 0.141, 0.290), smoothstep(0.0, 0.18, h));
      c = mix(c, vec3(0.020, 0.043, 0.122), smoothstep(0.18, 0.75, h));
      gl_FragColor = vec4(c, uOpacidad);
    }`,
}

function crearDomo(radio: number, opacidad: number) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radio, 32, 16),
    new THREE.ShaderMaterial({
      ...DOMO_NOCHE,
      uniforms: { uOpacidad: { value: opacidad } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    }),
  )
  m.renderOrder = -1 // antes que el resto de lo transparente (nubes, vidrios)
  return m
}

const _dir = new THREE.Vector3()
function configurarCielo(cielo: Sky, p: ParametrosHora, azimut: number) {
  const u = cielo.material.uniforms
  u.turbidity.value = p.turbidez
  u.rayleigh.value = p.rayleigh
  u.mieCoefficient.value = p.mie
  u.mieDirectionalG.value = 0.85
  u.cloudCoverage.value = 0 // las nubes son las de <Nubes>
  u.sunPosition.value.copy(direccionSol(p.elevacion, azimut, _dir))
}

/**
 * Mapas de entorno de día, atardecer y noche, generados una sola vez. Cambiar entre texturas del mismo tamaño no
 * recompila los shaders (a diferencia de volver a armar <Environment> como antes).
 */
function useEntornos(elevacionDia: number, azimut: number) {
  const gl = useThree((s) => s.gl)
  const entornos = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const escena = new THREE.Scene()
    const cielo = new Sky()
    cielo.scale.setScalar(50)
    escena.add(cielo)
    const p = { ...hora.p, colorSol: new THREE.Color(), colorHemi: new THREE.Color(), niebla: new THREE.Color(), colorNubes: new THREE.Color() }
    const desde = (h: number) => {
      configurarCielo(cielo, calcularHora(h, elevacionDia, p), azimut)
      return pmrem.fromScene(escena, 0, 0.1, 100)
    }
    const dia = desde(0)
    const atardecer = desde(0.5)
    escena.remove(cielo)
    const domo = crearDomo(40, 1)
    escena.add(domo)
    const noche = pmrem.fromScene(escena, 0, 0.1, 100)
    cielo.geometry.dispose()
    cielo.material.dispose()
    domo.geometry.dispose()
    domo.material.dispose()
    pmrem.dispose()
    return { dia, atardecer, noche }
  }, [gl, elevacionDia, azimut])
  useEffect(() => () => Object.values(entornos).forEach((rt) => rt.dispose()), [entornos])
  return entornos
}

export function Ambiente({ solElevacion, solAzimut, tamano, centro }: Props) {
  const { gl, scene } = useThree()
  const entornos = useEntornos(solElevacion, solAzimut)

  // alcance de sombras y niebla proporcional al tamaño del edificio
  const alcance = Math.max(40, tamano * 2.4)
  const sol = useMemo(() => {
    const l = new THREE.DirectionalLight('#fff0dc', 4.2)
    l.target.position.set(centro.x, 0, centro.z)
    l.castShadow = true
    l.shadow.mapSize.set(2048, 2048)
    l.shadow.bias = -0.0004
    l.shadow.normalBias = 0.03
    Object.assign(l.shadow.camera, { left: -alcance, right: alcance, top: alcance, bottom: -alcance, near: 1, far: alcance * 5 })
    l.shadow.camera.updateProjectionMatrix()
    return l
  }, [alcance, centro])

  const cielo = useMemo(() => new Sky(), [])
  const domo = useMemo(() => crearDomo(1, 0), [])
  const hemi = useMemo(() => new THREE.HemisphereLight('#bcd3ff', '#3a3228', 0.25), [])
  const niebla = useMemo(() => new THREE.Fog('#b9c7d8', 1, 2), [])
  useEffect(() => {
    scene.fog = niebla
    return () => {
      scene.fog = null
      scene.environment = null
    }
  }, [scene, niebla])
  useEffect(() => () => {
    cielo.geometry.dispose()
    cielo.material.dispose()
    domo.geometry.dispose()
    domo.material.dispose()
  }, [cielo, domo])

  // Antes que todo lo demás (prioridad -1): avanza la hora hacia la de la barrita y calcula los parámetros que leen
  // el modelo y las nubes en el mismo cuadro.
  useFrame((_, dt) => {
    const objetivo = useVisor.getState().hora
    const h = Math.abs(objetivo - hora.actual) < 0.001 ? objetivo : THREE.MathUtils.damp(hora.actual, objetivo, 5, dt)
    hora.actual = h
    const p = calcularHora(h, solElevacion)

    configurarCielo(cielo, p, solAzimut)
    ;(domo.material as THREE.ShaderMaterial).uniforms.uOpacidad.value = p.domo
    domo.visible = p.domo > 0.002

    // la luz del sol no baja de 6°: sombras largas al atardecer, pero nunca desde abajo del piso
    direccionSol(Math.max(p.elevacion, 6), solAzimut, _dir)
    sol.position.copy(_dir).multiplyScalar(alcance * 1.8).add(centro)
    sol.intensity = p.sol
    sol.color.copy(p.colorSol)

    hemi.intensity = p.hemi
    hemi.color.copy(p.colorHemi)
    niebla.color.copy(p.niebla)
    niebla.near = tamano * 8
    niebla.far = tamano * 36
    gl.toneMappingExposure = p.exposicion
    scene.environment = entornos[p.entorno].texture
    scene.environmentIntensity = p.intensidadEntorno
  }, -1)

  return (
    <>
      <primitive object={cielo} scale={tamano * 110} />
      <primitive object={domo} scale={tamano * 90} />

      {/* aparte: la textura de las nubes carga async y no tiene que frenar el resto de la escena */}
      <Suspense fallback={null}>
        <Nubes tamano={tamano} centro={centro} />
      </Suspense>

      <primitive object={hemi} />
      <primitive object={sol} />
      <primitive object={sol.target} />
      <Render />
    </>
  )
}

/**
 * Render final. En compu: oclusión ambiental (GTAO), las sombras de contacto bajo balcones, losas y rincones que
 * más delatan un 3D, y bloom para las luces de noche. En celular, render directo salvo que haga falta bloom.
 */
function Render() {
  const { gl, scene, camera, size } = useThree()
  const conAO = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 821px) and (pointer: fine)').matches, [])
  const { composer, bloom } = useMemo(() => {
    const c = new EffectComposer(gl)
    const b = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0, 0.35, 0.92)
    c.addPass(new RenderPass(scene, camera))
    if (conAO) {
      const ao = new GTAOPass(scene, camera, size.width, size.height)
      // en metros: rincones y aleros de ~1 m, sin oscurecer paredes enteras
      ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.5, scale: 1, samples: 16 })
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 })
      ao.blendIntensity = 0.85
      c.addPass(ao)
    }
    c.addPass(b)
    c.addPass(new OutputPass())
    return { composer: c, bloom: b }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, conAO])

  useEffect(() => composer.setSize(size.width, size.height), [composer, size])
  useEffect(() => () => composer.dispose(), [composer])

  // prioridad 1: toma el control del render de R3F. El primer cuadro pasa igual por el composer para compilar el
  // bloom al cargar y no la primera vez que se hace de noche.
  const estado = useMemo(() => ({ calentado: false }), [composer])
  useFrame(() => {
    bloom.strength = hora.p.bloom
    bloom.enabled = bloom.strength > 0.003 || !estado.calentado
    if (conAO || !estado.calentado || bloom.enabled) composer.render()
    else gl.render(scene, camera)
    estado.calentado = true
  }, 1)
  return null
}
