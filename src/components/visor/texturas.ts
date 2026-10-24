import * as THREE from 'three'

/**
 * Texturas PBR aplicadas por proyección triplanar: no necesitan UVs en el modelo.
 * Cada material que coincide con una regla de TEXTURAS (convenciones.ts) recibe color, relieve (normal)
 * y rugosidad según su posición en el mundo, más un "desgaste" opcional: suciedad cerca del suelo
 * y chorreados bajo cada losa, que es lo que más ayuda a que una pared deje de verse plástica.
 */

export type ReglaTextura = {
  patron: RegExp
  /** carpeta en /public con color.jpg, normal.jpg y rugosidad.jpg */
  carpeta: string
  /** metros que ocupa un tile de la textura */
  escala: number
  /** intensidad del relieve (1 = como viene la textura) */
  normal?: number
  /**
   * 'completo': la textura reemplaza el color del material (se multiplica por `tinte` si se indica).
   * 'detalle': se conserva el color/mapa del material y la textura sólo suma variación y relieve.
   */
  modo?: 'completo' | 'detalle'
  tinte?: string
  desgaste?: boolean
  /** gira la textura 90° en las caras verticales (vetas o manchas de la foto que tienen que ir de arriba a abajo) */
  girar?: boolean
}

export type Desgaste = {
  /** altura del suelo (m) y hasta dónde sube la suciedad */
  suelo: number
  alturaSuciedad: number
  /** grilla de pisos para los chorreados bajo cada losa */
  alturaPrimerPiso: number
  alturaPiso: number
  intensidad: number
}

const cache = new Map<string, { color: THREE.Texture; normal: THREE.Texture; rug: THREE.Texture }>()
const loader = new THREE.TextureLoader()

function cargar(carpeta: string, anisotropia: number) {
  const hit = cache.get(carpeta)
  if (hit) return hit
  const t = (archivo: string, srgb: boolean) => {
    const tex = loader.load(`${carpeta}/${archivo}`)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    tex.anisotropy = anisotropia
    return tex
  }
  const set = { color: t('color.jpg', true), normal: t('normal.jpg', false), rug: t('rugosidad.jpg', false) }
  cache.set(carpeta, set)
  return set
}

const GLSL_COMUN = /* glsl */ `
uniform sampler2D tTriColor, tTriNormal, tTriRug;
uniform float uTriEscala, uTriNormal, uTriDetalle, uTriDesgaste, uTriGirar;
uniform vec3 uTriTinte;
uniform float uSuelo, uAltSuciedad, uZ0, uFH;
varying vec3 vTriPos;
varying vec3 vTriNorm;

vec3 triPesos(vec3 n) { vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z); }

vec4 triMuestra(sampler2D t, vec3 p, vec3 n) {
  vec3 w = triPesos(n);
  vec3 s = sign(n);
  vec2 uvX = vec2(p.z * s.x, p.y) / uTriEscala;
  vec2 uvY = vec2(p.x * s.y, p.z) / uTriEscala;
  vec2 uvZ = vec2(-p.x * s.z, p.y) / uTriEscala;
  if (uTriGirar > 0.5) { uvX = uvX.yx; uvZ = uvZ.yx; }
  return texture2D(t, uvX) * w.x + texture2D(t, uvY) * w.y + texture2D(t, uvZ) * w.z;
}

// suciedad: 1 = limpio, menor = más sucio
float triDesgaste(vec3 p, vec3 n) {
  if (uTriDesgaste <= 0.0) return 1.0;
  float vertical = 1.0 - smoothstep(0.35, 0.75, abs(n.y));
  float base = 1.0 - smoothstep(uSuelo, uSuelo + uAltSuciedad, p.y);
  float h = abs(n.x) > abs(n.z) ? p.z : p.x;
  // chorreados: la rugosidad muestreada muy estirada en vertical da rayas
  float rayas = texture2D(tTriRug, vec2(h / uTriEscala * 2.3, p.y / uTriEscala * 0.04)).r;
  rayas = smoothstep(0.72, 0.95, rayas);
  float fz = uFH > 0.0 ? fract((p.y - uZ0) / uFH) : 0.0;
  float bajoLosa = uFH > 0.0 && p.y > uZ0 ? pow(fz, 3.0) : 0.0;          // justo debajo de la losa superior
  float chorreado = rayas * (0.35 + 0.65 * (1.0 - fz)) * step(uZ0, p.y);
  float sucio = 0.22 * base + 0.14 * bajoLosa + 0.18 * chorreado;
  return 1.0 - uTriDesgaste * vertical * sucio;
}
`

export function aplicarTextura(
  mat: THREE.MeshStandardMaterial,
  regla: ReglaTextura,
  desgaste: Desgaste | null,
  anisotropia = 8,
) {
  if (mat.userData.triplanar) return
  mat.userData.triplanar = true
  const set = cargar(regla.carpeta, anisotropia)
  const detalle = regla.modo === 'detalle'
  if (!detalle) mat.color.set(regla.tinte ?? '#ffffff')

  const uniforms = {
    tTriColor: { value: set.color },
    tTriNormal: { value: set.normal },
    tTriRug: { value: set.rug },
    uTriEscala: { value: regla.escala },
    uTriGirar: { value: regla.girar ? 1 : 0 },
    uTriNormal: { value: regla.normal ?? 1 },
    uTriDetalle: { value: detalle ? 1 : 0 },
    uTriDesgaste: { value: regla.desgaste && desgaste ? desgaste.intensidad : 0 },
    uTriTinte: { value: new THREE.Color(regla.tinte ?? '#ffffff') },
    uSuelo: { value: desgaste?.suelo ?? 0 },
    uAltSuciedad: { value: desgaste?.alturaSuciedad ?? 1.5 },
    uZ0: { value: desgaste?.alturaPrimerPiso ?? 0 },
    uFH: { value: desgaste?.alturaPiso ?? 0 },
  }

  const previo = mat.onBeforeCompile
  mat.onBeforeCompile = (shader, renderer) => {
    previo?.call(mat, shader, renderer)
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTriPos;\nvarying vec3 vTriNorm;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vTriPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTriNorm = normalize(mat3(modelMatrix) * objectNormal);`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMUN}`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec3 nW = normalize(vTriNorm);
          vec3 cTri = triMuestra(tTriColor, vTriPos, nW).rgb;
          // variación a gran escala: rompe la repetición del tile
          vec3 mediaTri = textureLod(tTriColor, vec2(0.5), 12.0).rgb;
          float macro = dot(triMuestra(tTriColor, vTriPos * 0.137, nW).rgb, vec3(0.333)) / max(dot(mediaTri, vec3(0.333)), 0.02);
          diffuseColor.rgb *= mix(1.0, macro, uTriDetalle > 0.5 ? 0.25 : 0.45);
          if (uTriDetalle > 0.5) {
            // sólo variación: la textura dividida por su color medio
            diffuseColor.rgb *= mix(vec3(1.0), cTri / max(mediaTri, vec3(0.02)), 0.55);
          } else {
            diffuseColor.rgb *= cTri * uTriTinte;
          }
          diffuseColor.rgb *= triDesgaste(vTriPos, nW);
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness;
        {
          float rTri = triMuestra(tTriRug, vTriPos, normalize(vTriNorm)).r;
          // 'completo': la textura manda; 'detalle': sólo modula la rugosidad del material
          roughnessFactor = clamp(uTriDetalle > 0.5 ? roughness * (0.75 + 0.5 * rTri) : rTri, 0.04, 1.0);
        }`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          // triplanar con mezcla "whiteout" (Ben Golus) en espacio mundo
          vec3 nW = normalize(vTriNorm);
          vec3 w = triPesos(nW);
          vec3 s = sign(nW);
          vec2 uvX = vec2(vTriPos.z * s.x, vTriPos.y) / uTriEscala;
          vec2 uvY = vec2(vTriPos.x * s.y, vTriPos.z) / uTriEscala;
          vec2 uvZ = vec2(-vTriPos.x * s.z, vTriPos.y) / uTriEscala;
          if (uTriGirar > 0.5) { uvX = uvX.yx; uvZ = uvZ.yx; }
          vec3 tX = texture2D(tTriNormal, uvX).xyz * 2.0 - 1.0;
          vec3 tY = texture2D(tTriNormal, uvY).xyz * 2.0 - 1.0;
          vec3 tZ = texture2D(tTriNormal, uvZ).xyz * 2.0 - 1.0;
          tX.xy *= uTriNormal; tY.xy *= uTriNormal; tZ.xy *= uTriNormal;
          tX.x *= s.x; tY.x *= s.y; tZ.x *= -s.z;
          tX = vec3(tX.xy + nW.zy, abs(tX.z) * nW.x);
          tY = vec3(tY.xy + nW.xz, abs(tY.z) * nW.y);
          tZ = vec3(tZ.xy + nW.xy, abs(tZ.z) * nW.z);
          vec3 nMundo = normalize(tX.zyx * w.x + tY.xzy * w.y + tZ.xyz * w.z);
          vec3 nVista = normalize((viewMatrix * vec4(nMundo, 0.0)).xyz);
          normal = nVista * faceDirection;
        }`,
      )
  }
  const clavePrevia = mat.customProgramCacheKey?.bind(mat)
  mat.customProgramCacheKey = () => `tri-${regla.carpeta}-${detalle ? 'd' : 'c'}-${clavePrevia ? clavePrevia() : ''}`
  mat.needsUpdate = true
}
