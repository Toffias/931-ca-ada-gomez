# Cañada de Gómez 931 — plan de renders a partir de las referencias

Material que mandó el cliente (Male Group S.A.), guardado en [`docs/referencias/`](referencias/). Es la **fuente de
verdad** para el modelo 3D y todo lo que sale de Blender: cada render nuestro se compara contra estas imágenes.

| Archivo | Qué es | Tamaño |
|---|---|---|
| `fachada-dia-desde-izquierda.jpg` | Fachada de día, cámara a la izquierda (se ve la medianera izquierda) | 1600×1563 |
| `fachada-dia-desde-derecha.jpg` | Fachada de día, cámara a la derecha, con autos en la vereda | 1570×1600 |
| `fachada-atardecer.jpg` | Misma toma que la izquierda, al atardecer con luces encendidas | 1269×1240 |
| `acceso-peatonal.jpg` | Detalle del acceso: listones negros, columna "931", panel de madera | 1448×1086 |
| `plano-planta-baja.jpg` | Planta baja (anteproyecto, versión corregida) | 1103×735 |
| `plano-pisos-1-a-4.jpg` | Planta tipo pisos 1 a 4 (anteproyecto, versión corregida) | 1113×770 |
| `plano-azotea.jpg` | Azotea: sala de máquinas del ascensor y salida de la escalera | 1109×772 |

## 1. Qué dicen las referencias

**Lote y volumen.** Entre medianeras, frente de **8,66 m** (8,36 entre ejes de muros + muros) y **19,70 m** de
fondo (19,50 del otro lado: el lote no es un rectángulo perfecto). Edificado 15,70 m; atrás, patio de 4,00/3,80 m
(sólo en PB; en los pisos es vacío). **PB + 4 pisos**, con un remate de losa en voladizo arriba. Balcones de 1,40 m
sobre la línea municipal en los pisos.

**Planos corregidos (29/10).** El cliente mandó versiones nuevas de PB y planta tipo (las de la "opción 2" tenían
errores) y la azotea. Cambios: en el 3 ambientes el estar pasa de 6,60 a 6,20 m de fondo y el baño 1 se corre hacia
adelante, con un placard del termo eléctrico entre el estar y el baño; en el 2 ambientes el termo va en un placard
entre la heladera y el baño; en la PB el dormitorio 1 se retira 0,70 m de la línea municipal y deja una expansión
de 1,60 m² detrás de los listones. Los balcones pasan a 5,01 (A) y 3,50 m (B) con 0,30 entre ellos, que es lo que ya
mostraban las fotos para el lado A (la franja de madera de las fotos sigue midiendo ~1 m). La azotea suma la sala de
máquinas del ascensor (2,68 m de ancho, contra la medianera derecha) y la salida de la escalera.

**Unidades (9, igual que los 9 medidores de gas del plano).**

| Código propuesto | Dónde | Tipología | Cubierta | Descubierta | Total |
|---|---|---|---|---|---|
| `PB` | Planta baja, fondo | 4 ambientes con patio | 89,00 m² | patio 31,30 m² + expansión 1,60 m² | 121,90 m² |
| `1A`…`4A` | Pisos 1–4, lado izquierdo (visto desde la calle) | 3 ambientes con balcón | 69,50 m² | balcón 6,90 m² | 76,40 m² |
| `1B`…`4B` | Pisos 1–4, lado derecho | 2 ambientes con balcón | 49,00 m² | balcón 4,30 m² | 53,30 m² |

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

**Disponibilidad: hecha.** Las cámaras `Render_Fachada_1/2` (copias de `Ref_Izquierda/Derecha`) calculan la máscara
sobre las fotos del cliente; se corre `renders_fachadas.py --camaras N --solo-mascaras` una por vez, con la
resolución de cada foto. Las máscaras están en `src/seed/assets/ca931/mascara-*.svg` y el seed las carga como
*Edificio → Disponibilidad → Vistas* (Frente y Frente derecha) con las fotos de fondo. Para que no se pinten las
unidades a través de las medianeras, la tolerancia va en 0,10 m (las cajas de unidad están por delante de vidrios
y barandas) y las losas cubren todo el fondo.

**Plantas por piso: fotorrealistas.** Interiores calcados de los planos (`scripts/blender/interior_ca931.py`: muros
con vanos, solados por ambiente, núcleo, escalera, muebles fijos) y vestidos con `vestir_ca931.py` (texturas y
modelos de Poly Haven bajados con `bajar_assets_interior.py`, muebles de detalle de `vestir_interior.py`, HDRI).
Los dos corren dentro de `modelar_ca931.py` (`VESTIR = True`). Cambios del modelo para poder cortarlo: los pisos son
medianeras y contrafrente con ventanas (no cajas macizas), las cajas `Unidad_*` siguen la planta en L sin el núcleo
común, y la PB tiene una platea para medir el corte igual que en los pisos. Cámara `Render_Planta` (en
Referencias): piso 2, 25° desde la vertical, 50 mm, frente abajo, `altura_corte = 2.0` (1,5 m sobre el piso
terminado: el nivel de cada `Piso_NN` es el fondo de su losa), fondo blanco. Tanda: 2560×1440, Cycles 256 muestras.
Revisadas contra las cotas del plano: en A se entra por el hall (el muro estar/palier es ciego y lleva el rack), la
isla con pileta y banquetas del lado del estar, el baño 2 es en suite por el vestidor y las camas apoyan la cabecera
en la medianera (principal) o en el muro con B (dormitorio 2), igual que la de B; en B la cocina es en L; en la PB la
isla tiene las banquetas del lado del comedor y el fondo derecho es baño 2 (1,50) + paso con placard (1,80) +
dormitorio 3 (3,20) con la cama contra la medianera.

**Noche: en el modo 3D.** La web sólo usa la noche en el visor (no hay lugar para un render de noche aparte; la
galería ya tiene el atardecer del cliente). Ajustado contra `fachada-atardecer`: spots y tiras LED con menos fuerza
(el visor las multiplica ×6), vidrios de PB en `WEB_Vidrio_Local` (brillo cálido detrás de los listones y en el
hall) y `banadores = False` en el techo, porque los bañadores de fachada del visor quemaban los cielorrasos de los
balcones. Comparación en `docs/referencias/comparaciones/noche-3d.webp`. De paso se arregló el visor en desarrollo:
StrictMode preparaba el modelo dos veces y la noche se aplicaba a materiales que no estaban en pantalla.

**Fotorrealismo.** En el visor 3D: texturas reales por material (`convenciones.ts`: revoques gris, claro y crema
con su tinte, madera de roble en `public/texturas/madera`, piedra negra), oclusión ambiental GTAO en compu
(`Ambiente.tsx`), sol del sudoeste como en las fotos (`solAzimut = -125`) y cielorrasos que brillan cálidos de
noche. Renders de Cycles con `scripts/blender/renders_ca931.py`: durante el render cambia los `WEB_*` por PBR
(revoque, roble, piedra, hormigón, asfalto y vidrio real a través del que se ven los interiores vestidos), pone
plantas de Poly Haven, luces reales en spots e interiores, y separa la luz (HDRI) del cielo que ve la cámara
(degradado azul de día, naranja y azul al atardecer); al terminar restaura todo, el `.glb` no cambia.

**Correcciones de fachada (revisión con el usuario).** El frente detrás de los balcones es pared y vidrio
(`frente()`: ventanal, pared, ventana de cocina y pared en el 3 ambientes; pared y ventanal en el 2 ambientes, en
`WEB_Revoque_Muro`). En la esquina izquierda, balcones y voladizo del remate no llegan al borde: dejan 50 cm de pared
al ras (`ALETA`) y esa esquina va en gris oscuro de arriba a abajo, en el frente y en una franja del lateral
(`esquina()`); en la esquina derecha, lo mismo con 35 cm (`ALETA_DER`) para el balcón crema del 2 ambientes y el
remate. Los dos laterales llevan franjas gris oscuro verticales en la esquina del frente y en la del
contrafrente, con gris claro en el medio (`laterales()`, de piso a piso para que las losas no las corten); el resto
del remate toma el gris claro del lateral. Las cajas no se enciman en caras coplanares: en Cycles salían manchas. Las vetas del revoque y de la madera van
verticales (UV de caras verticales con la U hacia arriba; en el visor, `girar` en la regla de textura).

**Entorno calcado de las fotos** (`scripts/blender/entorno_ca931.py`, en WEB y liviano también para el visor): casa
izquierda con garaje de portón negro, alero de tejas, terraza con balaustrada y jardín con muro, pilares y reja;
casa derecha con portón de madera, ventanas con arco y postigos, balcón con balaustrada y techo de tejas a cuatro
aguas; resto de la cuadra con cornisas y ventanas; tazas de árboles en la vereda. En los renders, árboles con hojas,
arbustos y faroles de las plantillas de la Torre Cityh (`C:/Renders/Ejemplos/Edificio 3`), con las hojas llevadas a
tamaño real, y materiales propios (tejas con hiladas, nogal, revoques crema y blanco). Falta: árboles más
irregulares y autos (no hay modelos en la máquina).

**Recorridos 360** (`scripts/blender/recorrido_ca931.py`, corre al final de `modelar_ca931.py`): uno por tipología,
en una unidad de muestra (3 ambientes en el 2A, 2 ambientes en el 3B, planta baja), sobre los mismos interiores de
las plantas. Para verse desde adentro, en esa unidad suma lo que desde arriba no se nota: pintura en la cara
interior de fachada, medianeras y contrafrente (por fuera son revoques), cielorraso blanco y vigas, zócalos,
dinteles, puertas con marco (la de entrada cerrada, corredizas en los baños chicos), cocina con bajo mesada,
alacenas, anafe y bacha, baños con revestimiento, ducha con mampara y sanitarios suspendidos, placards, racks con
tele, cortinas de voile y rollers, luminarias. Los muebles en cajas de esa unidad se reemplazan
(`Recorrido_Muebles_NN`). La losa adentro baja sólo 10 cm (`LOSA_CIELO`): cielorraso a 2,40 en los pisos, con vigas
sobre el frente y el contrafrente que tapan la junta. Por el ventanal se ve la vereda de enfrente: la misma cuadra
girada 180° sobre el eje de la calle (en las tomas de fachada no está). Afuera de eso, el HDRI de Poly Haven
(`portland_landing_pad`, con torres): **lo ideal es una foto 360 tomada en el lote a la altura de un primer piso**.
Desde la sesión de Blender: `previa()` (perspectiva en ~15 s con el mismo ambiente) y `tanda()` (renders_recorrido
encolado; ~15 min por panorámica de 6144 × 3072 en la RX 6700 XT). El seed los carga desde
`src/seed/assets/ca931/recorridos/<recorrido>/` y prende la sección.

**Terminaciones interiores (las pasó el cliente, 29/10, con fotos de referencia de cocina y baño).** Piso de madera
(porcelanato símil madera en tablas: la textura `wood_floor` ya lo es); cocina con muebles laqueados taupe y perfil
gola de aluminio, mesada de granito negro pulido con desayunador en cascada hasta el piso, bacha gris, anafe a gas
gris con horno negro abajo y revestimiento símil mármol blanco veteado entre mesada y alacenas; baños en porcelanato
gris piedra de 60 × 120 en paredes y piso, vanitory de roble suspendido de dos cajones con mesada gris y bacha bajo
mesada, espejo con LED perimetral, inodoro de apoyo con mochila, mampara con perfil negro y lluvia negra; aberturas
negras (carpinterías y manijas). Están en `recorrido_ca931.py` (`materiales_recorrido`, `bajo_mesada`, `vanitory`,
`inodoro`, `ducha`); granito, mármol y porcelanato son procedurales, sin texturas nuevas.

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
