# Recorrido 360 de las unidades (Blender → web)

Recorrido tipo Street View por el interior de una tipología: una panorámica por ambiente, que se gira con el mouse
o el dedo, y flechas en el piso para pasar al ambiente de al lado. Abajo, un plano con los puntos que también sirve
para saltar. Se ve en la ficha (pestaña *Recorrido*) y en `/recorridos/<recorrido>/<punto>`. Lo muestra
`components/proyecto/VisorRecorrido.tsx` (Photo Sphere Viewer + Virtual Tour).

La meta es **imagen hiperrealista**: es la pantalla donde el comprador "entra" a la unidad. Un interior de cajas
con luz de exterior no sirve; por eso el pipeline amuebla la unidad, cambia la luz y los vidrios para verse desde
adentro y renderiza en Cycles a calidad de render de arquitectura.

El procedimiento completo, con los errores que se cometieron al armarlo y cómo evitarlos, está en la skill
[`recorrido-360`](../.claude/skills/recorrido-360/SKILL.md) (con `previa.py` para iterar y `encolar_tanda.py`).

Scripts (en este orden):

1. [`interior_tipo.py`](../scripts/blender/interior_tipo.py): distribución (tabiques, puertas, solados, cielorraso)
   en todos los pisos y las cámaras `Pano_*` de la unidad `RECORRIDO`. Deja la unidad `VESTIR` sin muebles en cajas.
2. [`bajar_assets_interior.py`](../scripts/blender/bajar_assets_interior.py) (una vez, Python común): texturas,
   modelos y HDRI de Poly Haven (CC0) en `C:/Renders/_assets/polyhaven`, fuera del repo (~250 MB).
3. [`vestir_interior.py`](../scripts/blender/vestir_interior.py): materiales con texturas reales y la unidad
   amueblada (cocina, baño, camas, sillón, sillas, puertas con marco, zócalos, cortinas de voile, luminarias).
4. [`renders_recorrido.py`](../scripts/blender/renders_recorrido.py): panorámicas, plano y enlaces.

## 1. Qué sale

En `//web/recorridos/<recorrido>/`, junto al `.blend`:

- `<punto>.webp` por cámara: panorámica equirectangular 2:1 (6144×3072) en Cycles, con denoise.
- `plano.webp`: la unidad vista desde arriba, cortada apenas por debajo de las cámaras, con el norte arriba y fondo
  transparente. Lo que se ve por las ventanas pero no va en el plano (techos vecinos más bajos que el corte,
  vereda, árboles) se saca con `OCULTAR_PLANO` (colecciones o prefijos de objetos). Es **cuadrado** porque la web calcula hacia dónde apunta cada flecha con las posiciones x/y en %.
- `recorrido.json`: por punto, `rumbo` (hacia dónde mira el centro de la panorámica, en grados desde el norte),
  `x`/`y` en el plano y `enlaces`.

Los **enlaces** no se cargan a mano: dos puntos se enlazan si se ven a la altura de la cámara (a través de una
puerta, no de una pared ni de un mueble alto) y están a menos de `DISTANCIA_MAXIMA` (9 m). Si un punto no ve a
ninguno, se enlaza con el más cercano y el log lo avisa: conviene moverlo para que quede en línea con la puerta.

## 2. La distribución

La de la plantilla (`UNIDAD` en `interior_tipo.py`) está pensada para renders interiores: los tabiques que llegan a
la fachada caen **sobre los machones**, nunca en medio de un ventanal (en un render se nota enseguida), y los muebles
tienen medidas reales con circulación. Estar-comedor-cocina en L con dos ventanales al este, pasillo al dormitorio 2,
baño interior con puerta corrediza y principal en la esquina. Cuando llegue la del arquitecto se reemplazan los datos
(`muros`, `solados`, `muebles`, `recorrido`) y los muebles de `vestir_interior.py`.

## 3. Cámaras

- Nombre `Pano_<recorrido>_<punto>`, **fuera de la colección `WEB`**. Ej.: `Pano_unidad-a_living`. `<recorrido>` es
  el slug en el admin; `<punto>`, la clave que va en la URL.
- A la altura de los ojos (1,60 m), en un lugar libre del ambiente, a más de 40 cm de muebles y hojas de puerta. Se
  nivelan solas al renderizar: del giro sólo importa hacia dónde miran, que es el centro de la imagen y la vista con
  la que arranca el punto.
- Propiedades: `titulo` ("Living"), `orden` (el recorrido arranca en el de menor orden), `enlaces` (opcional,
  "living,cocina": pisa el cálculo).
- En la **primera** cámara va la configuración del proyecto (`interior_tipo.py` la conserva al rehacer las cámaras):

  | Propiedad | Qué es | En la plantilla |
  | --- | --- | --- |
  | `escala` | metros por unidad de Blender (la del admin) | 8 |
  | `hdri` | foto 360 de cielo y ciudad que ilumina y se ve por las ventanas | `portland_landing_pad_8k.hdr` |
  | `hdri_giro` | grados: qué parte de la ciudad cae en cada ventana | 180 |
  | `sol` | fuerza del sol de la escena (el del HDRI se recorta) | 3 |
  | `sol_rumbo`, `sol_altura` | de dónde viene el sol (grados); sin ellas, del HDRI | 110, 32 |
  | `exposicion` | exposición del interior | 2 |
  | `ocultar` | colecciones que no van | el entorno modelado entero |

- Arranque rápido con el interior genérico: `interior_tipo.py` con `RECORRIDO = "5A"` crea ocho cámaras en esa
  unidad (ingreso, cocina, living, pasillo, dormitorio, baño y dos en el principal), en línea con las puertas. Las
  unidades B, C y D son espejo: cada letra lleva su propio recorrido.

## 4. Luz y ambiente (lo que hace `renders_recorrido.py`, todo temporal)

- **Afuera, el HDRI**: el barrio modelado se ve de maqueta desde una ventana; se oculta (`ocultar`) y por las
  ventanas se ve la foto. En un proyecto real conviene una foto 360 tomada con dron **desde la altura del piso**.
- **Sol aparte**: el HDRI se recorta a `LIMITE_HDRI` para iluminar (se sigue viendo entero) y el sol de la escena se
  pone en `sol_rumbo`/`sol_altura`, así entra por las ventanas del estar sin cambiar lo que se ve afuera.
- **Vidrios de fachada → vidrio real** (transparente para sombras y luz difusa: sin eso no entra el sol).
- Sin las tiras luminosas de la fachada (`INVISIBLES`), la cara interior de los muros de fachada pintada como las
  paredes, y lo que la malla de fachada tiene más de `FACHADA_ESPESOR` hacia adentro, invisible.
- **Luminarias prendidas**: las luces con la propiedad `luz_recorrido` (baño, espejo, pasillo, bajo alacena, mesas
  de luz) se encienden sólo acá; en plantas y fachadas quedan apagadas.
- Cycles con rebotes de interior, sin cáusticas, muestreo adaptativo (`MUESTRAS` 384, umbral 0,02) y OpenImageDenoise
  con albedo y normales. AgX Base Contrast.

## 5. Correr

```text
blender -b archivo.blend --python scripts/blender/renders_recorrido.py -- [opciones]
  --recorridos unidad-a   sólo esos
  --puntos living,bano    sólo esas panorámicas (el JSON sale igual con todos)
  --solo-datos            no renderiza (segundos): para revisar posiciones y enlaces
  --sin-plano             no renderiza el plano
  --prueba                al 25 % y con 64 muestras
```

Con el Blender de la Store todo va por el Blender abierto (Scripting → Run, o el MCP como en la skill
`renders-plantas`). Primero `--solo-datos` y mirar el log de enlaces; después `--prueba`. Una panorámica final tarda
~12 min en una RX 6700 XT (con 1024 muestras, ~40 min, sin diferencia visible): activar la GPU en *Preferencias →
Sistema → Cycles*. Desde el MCP, la tanda va encolada con `bpy.app.timers` para no cortar por tiempo.

## 6. Cargar en la web

```bash
pnpm cargar:recorridos "<carpeta con recorrido.json>" [<slug-de-la-torre> <tipologías A1,A2>] [solo-datos]
```

Crea o actualiza *Admin → Recorridos 360* (plano + puntos) y, si se pasan, se lo asigna a esas tipologías. Los
títulos que ya se editaron en el admin se respetan. La sección **Recorridos** tiene que estar prendida en
*Proyecto → Secciones visibles* para que aparezca en la ficha.

## 7. Cuándo volver a correrlo

Cambió el interior, una cámara o la luz. Si sólo se movió una cámara, alcanza con `--solo-datos` y
`pnpm cargar:recorridos … solo-datos` (rumbo, posición y enlaces, sin volver a subir las imágenes). Si se corre de
nuevo `interior_tipo.py`, después hay que correr `vestir_interior.py` (el primero vuelve a los colores planos).
