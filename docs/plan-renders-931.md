# Cañada de Gómez 931 — plan de renders a partir de las referencias

Material que mandó el cliente (Male Group S.A.), guardado en [`docs/referencias/`](referencias/). Es la **fuente de
verdad** para el modelo 3D y todo lo que sale de Blender: cada render nuestro se compara contra estas imágenes.

| Archivo | Qué es | Tamaño |
|---|---|---|
| `fachada-dia-desde-izquierda.jpg` | Fachada de día, cámara a la izquierda (se ve la medianera izquierda) | 1600×1563 |
| `fachada-dia-desde-derecha.jpg` | Fachada de día, cámara a la derecha, con autos en la vereda | 1570×1600 |
| `fachada-atardecer.jpg` | Misma toma que la izquierda, al atardecer con luces encendidas | 1269×1240 |
| `acceso-peatonal.jpg` | Detalle del acceso: listones negros, columna "931", panel de madera | 1448×1086 |
| `plano-planta-baja.jpg` | Planta baja, opción 2 (anteproyecto) | 1206×815 |
| `plano-pisos-1-a-4.jpg` | Planta tipo pisos 1 a 4, opción 2 (anteproyecto) | 1206×813 |

## 1. Qué dicen las referencias

**Lote y volumen.** Entre medianeras, frente de **8,66 m** (8,36 entre ejes de muros + muros) y **19,70 m** de
fondo (19,50 del otro lado: el lote no es un rectángulo perfecto). Edificado 15,70 m; atrás, patio de 4,00/3,80 m
(sólo en PB; en los pisos es vacío). **PB + 4 pisos**, con un remate de losa en voladizo arriba. Balcones de 1,40 m
sobre la línea municipal en los pisos.

**Unidades (9, igual que los 9 medidores de gas del plano).**

| Código propuesto | Dónde | Tipología | Cubierta | Descubierta | Total |
|---|---|---|---|---|---|
| `PB` | Planta baja, fondo | 4 ambientes con patio | 90,50 m² | patio 31,30 m² | 121,80 m² |
| `1A`…`4A` | Pisos 1–4, lado izquierdo (visto desde la calle) | 3 ambientes con balcón | 69,50 m² | balcón 6,80 m² | 76,30 m² |
| `1B`…`4B` | Pisos 1–4, lado derecho | 2 ambientes con balcón | 49,00 m² | balcón 4,90 m² | 53,90 m² |

Lado izquierdo/derecho sale de cruzar la PB del plano con el render: los dormitorios de la PB (borde de arriba del
plano) quedan detrás de los listones negros, a la izquierda; el hall de acceso (borde de abajo) va con la puerta, a la
derecha. Entonces el 3 ambientes es el balcón de **baranda de vidrio** y el 2 ambientes el de **antepecho macizo
crema**. **A confirmar con el cliente** (también los códigos de unidad).

**Núcleo.** Escalera + ascensor de 1,65×1,65 al centro; en PB, hall de acceso, portería, tanque de bombeo y
medidores sobre la línea municipal.

**Fachada (de los renders).**

- Izquierda: balcones corridos con revoque **gris texturado**, baranda de **vidrio con parantes negros**, cielorrasos
  claros con spots embutidos (y tira LED cálida en el canto de losa en la versión atardecer), macetas con plantas.
- Centro: franja vertical de **listones de madera** del piso 1 al remate.
- Derecha: balcones con **antepecho macizo crema** (revoque fino texturado), carpinterías negras, plantas colgantes.
- Remate: losa gris en voladizo sobre las dos mitades. Laterales (medianeras que asoman) en gris/crema liso.
- PB: **listones verticales negros** delante de un ventanal, jardinera baja, **columna de piedra negra** con el
  número "931" en metal, acceso retirado con hall iluminado cálido y **panel de listones de madera** a la derecha.
- Entorno: vecinos de 1–2 plantas (casa con techo de tejas negras y portón negro a la izquierda; casa crema con
  balaustrada y portón de madera a la derecha), árboles de vereda, vereda de adoquín gris, calle de asfalto.

**Lo que no está en el material** (pedir o suponer y marcarlo): alturas (supongo 2,90 m piso a piso, PB 3,20 m),
contrafrente, terraza/azotea, orientación (dónde está el norte), qué Cañada de Gómez es (calle de Rosario o de
CABA), interiores, amenities (no parece haber).

## 2. Cómo se usan en la web

Hay dos caminos y conviene hacer los dos en orden: **primero las imágenes del cliente tal cual, después lo
generado**.

### Fase A — Sitio con las imágenes del cliente (sin Blender)

Sale en días y ya se ve el proyecto real. **Hecha** (`src/seed/index.ts`, assets en `src/seed/assets/ca931/`).
Supone el frente al sur; las medianeras (este y oeste) no salen como fachadas.

1. Pasar los renders a `.webp` y sumarlos al seed (`src/seed/assets/`), reemplazando la Torre Cityh:
   - Portada / póster de la intro: `fachada-dia-desde-izquierda`.
   - Noche: `fachada-atardecer`.
   - Galería: las cuatro fotos (incluido `acceso-peatonal`).
2. Plantas 2D: recortar de cada plano la unidad (PB, A, B) como `planta-<tipologia>-2d.png`, sin el rótulo de Male
   Group pero manteniendo el disclaimer de anteproyecto en *Textos → Legal*.
3. Cargar edificio, 3 tipologías y 9 unidades con las superficies de la tabla.
4. Secciones visibles: apagar amenities (y recorridos hasta tener la Fase C).

### Fase B — Modelo 3D calcado de las referencias

El modelo se arma **sobre las fotos**: cada referencia va de fondo de una cámara y el volumen se ajusta hasta que
coincida.

**Hecha.** `scripts/blender/modelar_ca931.py` arma toda la escena (en Blender abierto, por el MCP: la versión de la
Store no corre por línea de comandos) y se guarda en `blender/ca931_web.blend` (fuera del repo). Exportado a
`src/seed/assets/ca931/edificio.glb` (0,09 MB). Lo que salió del calce:

- Cámaras `Ref_Izquierda` y `Ref_Derecha` resueltas por mínimos cuadrados con 8–10 esquinas de cada foto (cámara
  nivelada con shift: son tomas de arquitectura de dos puntos de fuga). Error medio 1,7 % y 2,1 % del ancho; no
  baja más porque los renders del cliente no son del todo coherentes entre sí (las alturas de piso varían entre
  tomas). `Ref_Atardecer` reusa la izquierda, sin calce propio.
- Alturas medidas en la foto: **PB 3,30 m, pisos 2,75 m, remate 1,35 m** sobre la azotea (total ≈ 15,65 m).
- La franja de madera **no está centrada** en las fotos (x ≈ 0,7–1,7 m desde el eje del lote, hacia la derecha),
  mientras que el plano marca balcones de 3,50 + 1,36 + 3,50 simétricos. El modelo sigue la foto; A y B se separan
  en el borde izquierdo de la franja, que deja anchos en la proporción de sus superficies.
- Columna del 931 en x 0,15–1,05, acceso 1,05–2,35 y panel de madera 2,35–3,93 (también medidos en la foto).
- Las tomas del cliente están hechas desde más lejos que el ancho real de la calle (~25 m de la línea municipal):
  la cuadra de enfrente está en `Vecinos_Enfrente`, que no sale en los renders.

1. **Modelado por medidas** (`ca931.blend`, metros, `escala = 1`): lote, muros, losas, balcones, núcleo con los
   valores del plano. Pisos separados (`tipo="piso"`), cajas `Unidad_PB`, `Unidad_1A`… `Unidad_4B` hasta el filo
   interior de la fachada.
2. **Calce de cámara** (fSpy o a mano, con la imagen como *Camera Background* al 50 %): una cámara
   `Ref_Izquierda` y una `Ref_Derecha` que reproduzcan esas tomas. Criterio: cantos de losa, franja de madera y
   columna 931 caen sobre la imagen con error < 1 % del ancho. Si no calzan, se corrige el modelo (las alturas que
   faltan salen de acá), no la cámara.
3. **Materiales `WEB_*`** sacados con cuentagotas de las referencias: `WEB_Revoque_Gris`, `WEB_Revoque_Crema`,
   `WEB_Madera_Listones`, `WEB_Piedra_Negra`, `WEB_Metal_Negro`, `WEB_Vidrio_Baranda`, `WEB_Cielorraso` (spots y
   tira LED → regla de emisión noche en `convenciones.ts`). Paleta anotada en este doc cuando se defina.
4. **Entorno** liviano: dos vecinos por lado en volumen simple con el color de las fotos, árboles de vereda, vereda y
   calzada. Para web, en colecciones `Vecinos*`, `Arboles*`, `Veredas*`, `Calzada*`.
5. Exportar con `scripts/blender/exportar_web.py` → `.glb` del edificio. Revisar el test de esquemas
   (`src/seed/assets/torre-cityh.glb`) para que apunte al nuevo.

### Fase C — Renders generados, validados contra las referencias

| Salida | Script | Cómo se ata a las referencias |
|---|---|---|
| **Disponibilidad**: render + máscara | `renders_fachadas.py` | Las cámaras `Render_Fachada_*` son las de calce. Primero `--solo-mascaras`: **la máscara se calcula sobre el render del cliente** (mismo encuadre, mismo `viewBox` que la imagen). Si el cliente lo acepta, la pantalla usa sus renders de fondo y nuestras máscaras; si no, renderizamos nosotros con la misma cámara. |
| Vistas de la intro / Giro | `renders_fachadas.py` | Entre medianeras no hay vuelta completa: 4 vistas = frente izquierda, frente derecha, dron frontal alto, dron de contrafrente (patio). Las dos primeras son las de referencia. |
| **Plantas por piso** | `renders_plantas.py` | PB y planta tipo. Encima del render, el plano del cliente al 50 %: muros y aberturas tienen que coincidir. |
| Recorrido 360 | `interior_tipo.py` → `vestir_interior.py` → `renders_recorrido.py` | 3 amb y 2 amb (y PB si hay tiempo). El interior sale del plano; el estilo (cálido, madera, gris) de lo que se ve por los ventanales de los renders. Seguir la skill `recorrido-360`. |
| Noche | mismo `.blend`, luces y emisión | Comparar contra `fachada-atardecer`: spots en cielorrasos, LED en cantos de losa, hall cálido. |

**Control de calidad de cada render:** ponerlo al lado (o encima, en diferencia) de la referencia con la misma
cámara y revisar: proporciones, colores de cada material, cantidad de listones, ubicación del número 931, plantas y
luces. Se guarda la comparación en `docs/referencias/comparaciones/` para mostrársela al cliente.

## 3. Orden y qué falta del cliente

1. **Confirmar con el cliente**: lado de cada tipología, códigos de unidad, alturas, si la "opción 2" es la
   definitiva, orientación, dirección exacta, si podemos usar sus renders en la web (y en alta resolución: los que
   llegaron son ~1600 px, poco para portada a pantalla completa) y el logo de Male Group en vectorial.
2. Fase A (seed + admin + secciones). Actualizar *Este proyecto* en `CLAUDE.md` y `package.json`.
3. Fase B (modelo + calce de cámaras + export).
4. Fase C: máscaras de Disponibilidad sobre los renders del cliente → plantas → noche → recorridos.
