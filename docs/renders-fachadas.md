# Renders de disponibilidad (Blender → web)

Tomas **fijas** de la torre desde varios ángulos, con cada unidad pintada según su estado (disponible, reservada,
vendida). Es la pantalla *Disponibilidad* (`/disponibilidad/<torre>-<vista>`): hover, click a la ficha, filtros y
flechas para girar alrededor del edificio. Es lo mismo que el modo 3D, pero con imágenes: carga al instante, anda en
cualquier celular y se ve con la calidad del render (Cycles, entorno, luz). El 3D queda para quien quiere recorrer.

Script: [`scripts/blender/renders_fachadas.py`](../scripts/blender/renders_fachadas.py). Convenciones del modelo:
[`pipeline-blender.md`](pipeline-blender.md).

## 1. Qué sale

Por cada cámara `Render_Fachada_*`: `vista-<n>.webp` (resolución de la escena, 2560×1440 recomendado) +
`vista-<n>.svg` (mismo `viewBox`, un `<polygon data-unidad="5B">` por unidad **visible**) en `//web/fachadas/`, y
`fachadas.json` con el orden y la etiqueta de cada vista.

La máscara no se dibuja: se calcula. Por cada píxel (grilla de `PASO` px) se tira un rayo contra lo que se
renderiza y otro contra las cajas `Unidad_*`. El píxel es de la unidad si su caja aparece antes que lo opaco o
hasta `TOLERANCIA` metros detrás (vidrio y carpintería van por delante de la caja). Así cada polígono ya viene
recortado por lo que lo tapa: otra torre, el núcleo, un balcón. Las instancias (hojas de árboles, faroles) no tapan.

## 2. Qué tiene que tener el modelo

- Cajas `Unidad_<código>` con `tipo="unidad"`, `unidad`, `piso` (las mismas del `.glb`), que lleguen **hasta el filo
  interior de la fachada**. Si la fachada está más de `TOLERANCIA` (1,2 m) por delante de la caja, subir la
  tolerancia en la cámara.
- El resto del contrato de siempre: ver `pipeline-blender.md`.

## 3. Cámaras

- Nombre `Render_Fachada_<n>`, **fuera de la colección `WEB`** (no son vistas del visor 3D). El orden del nombre es el
  orden de las flechas: conviene que den la vuelta a la torre en un sentido.
- Propiedad `etiqueta` (lo que se lee en la web: "Noreste", "Vista al río"…).
- Propiedades opcionales (en la primera cámara): `escala` (la del admin), `colecciones` (las de la torre, p. ej.
  `WEB_Torre, Interiores`), `despejar` (metros, ver abajo), `ocultar` (colecciones que no van, p. ej. la copia del
  entorno para web), `torre` (slug, para `data-torre` en máscaras con varias torres), `tolerancia`.
- **Despeje**: todo lo que está a menos de `despejar` metros (20 por defecto) de la torre y sobresale del suelo
  (casas y edificios vecinos, árboles) se oculta en estas tomas, así ninguna unidad queda tapada. Calles y veredas
  quedan. Un objeto más grande que la zona (un entorno unido en una sola malla) no se oculta: el log lo avisa.
  `despejar = 0` lo apaga.
- Arranque rápido: `--crear-camaras 4` crea cuatro en las diagonales (NE, SE, SO, NO), a 30° de elevación y lente
  35 mm, con la torre en la mitad del alto del cuadro y el barrio alrededor (como la vista Aérea del 3D). Cada una muestra dos fachadas, así toda unidad aparece en alguna. Quedan en
  la escena para ajustarlas a mano; se guardan sólo si guardás el `.blend`.
- Tomas tipo dron (como las de referencia) mejor que frontales: se lee el volumen y dos caras a la vez.

## 4. Correr

```text
blender -b archivo.blend --python scripts/blender/renders_fachadas.py -- [opciones]
  --crear-camaras 4   cámaras en las diagonales (en memoria)
  --camaras 1,3       sólo esas
  --solo-mascaras     no renderiza (segundos): para validar
  --prueba            al 25 %
```

Con el Blender de la Store todo va por el Blender abierto (Scripting → Run, o el MCP como en la skill
`renders-plantas`). Siempre `--solo-mascaras` + superponer el SVG sobre un render de prueba antes de la tanda.

## 5. Cargar en la web

```bash
pnpm cargar:fachadas "<carpeta con fachadas.json>" <slug-de-la-torre>
```

Completa *Admin → Edificios → Disponibilidad → Vistas* (etiqueta + render + máscara). También se cargan a mano.
Prioridad en la pantalla: vistas del Giro con máscara de unidades (todas las torres juntas) → vistas de
Disponibilidad de cada torre → esquema de fachadas generado desde el `.glb`.

## 6. Cuándo volver a correrlo

Cambió el modelo, una cámara o se agregaron unidades. Si cambió sólo la disponibilidad, **no**: los colores los pone
la web con los datos del admin.
