---
name: recorrido-360
description: Arma de punta a punta el recorrido 360 hiperrealista de una unidad (tour tipo Street View con panorámicas de Cycles, saltos entre ambientes y plano amoblado) desde el modelo de Blender hasta la web: distribución, equipamiento, luz de interior, render, carga en Payload y verificación. Usar cuando se pida hacer, rehacer, mejorar o revisar el recorrido 360 / tour virtual / panorámicas de las unidades o tipologías, o sus renders interiores.
---

# Recorrido 360 hiperrealista de las unidades

Procedimiento consolidado de cómo se armó el recorrido de la Torre Cityh (unidad A, 8 puntos), con **todos los
errores que se cometieron en el camino** para no repetirlos. La referencia técnica (qué hace cada script y sus
propiedades) está en [`docs/renders-recorrido.md`](../../../docs/renders-recorrido.md): leerla también.

## Objetivo

Un tour por el interior de cada tipología que **parezca una foto**: el comprador gira con el mouse o el dedo, hace
click en las flechas del piso para pasar al ambiente de al lado y ve un plano con dónde está. Referencia de calidad:
los tours de Ipanema Residences / Cetri (interior amoblado, luz natural, ciudad por la ventana). "Funciona" no
alcanza: un interior de cajas con luz de exterior no vende. El usuario pidió explícitamente **dedicarle el tiempo
necesario** para llegar a hiperrealista.

Resultado por recorrido, en `//web/recorridos/<recorrido>/` junto al `.blend`:

- `<punto>.webp`: panorámica equirectangular 6144×3072, Cycles, denoise (300–600 KB c/u).
- `plano.webp`: la unidad desde arriba, cortada a la altura de los ojos, cuadrada, norte arriba, fondo transparente.
- `recorrido.json`: `rumbo`, `x`/`y` en % del plano y `enlaces` por punto.

En la web se ve en la ficha (pestaña *Recorrido*) y en `/recorridos/<recorrido>/<punto>`.

## Mapa de piezas

| Pieza | Qué hace |
| --- | --- |
| `scripts/blender/interior_tipo.py` | Distribución de la unidad tipo (datos en metros, cuadrante A, espejada a B/C/D): tabiques, puertas, solados, **cielorraso**, **dintel sobre ventanas**, muebles en cajas (para plantas/fachadas) y las cámaras `Pano_*` (`RECORRIDO`). Deja la unidad `VESTIR` sin muebles en cajas. UV en metros (`uv_en_metros`). |
| `scripts/blender/bajar_assets_interior.py` | Python común: baja de Poly Haven (CC0) modelos, texturas 2K y el HDRI 8K a `C:/Renders/_assets/polyhaven` (fuera del repo). Idempotente. |
| `scripts/blender/vestir_interior.py` | Materiales con texturas (rearma los `WEB_*` del interior por nombre) y amuebla la unidad: cocina, baño, camas, sillón, sillas, mesa, puertas con marco/picaporte (batiente, corrediza, cerrada), zócalos, cortinas de voile, luminarias. Colección `Vestido` dentro de `Interiores`. |
| `scripts/blender/renders_recorrido.py` | Ambiente interior temporal (HDRI, sol aparte, vidrio real, fachada pintada, luminarias prendidas, ajustes de Cycles) + panorámicas + plano + enlaces por visibilidad. |
| `src/scripts/cargar-recorridos.ts` (`pnpm cargar:recorridos`) | Sube panorámicas y plano a Media, crea/actualiza *Recorridos 360* y lo asigna a tipologías. |
| `src/collections/Recorridos.ts`, `components/proyecto/VisorRecorrido.tsx` | Colección y visor (Photo Sphere Viewer + Virtual Tour, modo GPS con x/y del plano). |
| Esta carpeta: `previa.py`, `encolar_tanda.py` | Vista previa rápida con el mismo ambiente y la tanda final encolada en Blender. |

## Antes de empezar (una vez por máquina / proyecto)

1. **GPU en Cycles.** En la máquina del usuario (RX 6700 XT) estaba en *Ninguno* y renderizaba con la CPU sin avisar.
   Chequear con el MCP: `bpy.context.preferences.addons["cycles"].preferences.compute_device_type`. Si es `NONE`,
   **pedir permiso** (es una preferencia de Blender, persiste) y poner `HIP` (AMD) / `OPTIX` o `CUDA` (NVIDIA),
   `refresh_devices()`, `use=True` sólo en la GPU, `bpy.ops.wm.save_userpref()`, y `scene.cycles.device = "GPU"`.
   Confirmar en pleno render que la GPU trabaja: PowerShell
   `Get-Counter '\GPU Engine(*)\Utilization Percentage'` filtrando `pid_<blender>` → `engtype_compute` ~90 %.
2. **Trabajar en una copia del .blend** (el usuario eligió `cityh_recorrido.blend` junto a `cityh_plantas.blend`):
   `bpy.ops.wm.save_as_mainfile(filepath=...)` una vez, y después `save_mainfile()` antes de cada tanda. El archivo
   original no se toca.
3. **Assets**: `python scripts/blender/bajar_assets_interior.py` (~250 MB; descargar requiere permiso del usuario:
   decirle fuente, tamaño y carpeta). Para elegir otro asset: la API `https://api.polyhaven.com/assets?t=models|textures|hdris`
   (categorías, tags, `dimensions` en mm = tamaño real de la textura) y miniaturas en
   `https://cdn.polyhaven.com/asset_img/thumbs/<slug>.png?width=512`. Mirar las miniaturas **antes** de elegir.
4. **Blender de la Microsoft Store**: no se puede lanzar `blender -b` desde la consola; todo va por el Blender abierto
   con el MCP (`execute_blender_code`, `result` tiene que ser un **dict**). Las llamadas cortan a ~60 s: los renders
   largos van encolados (`encolar_tanda.py`). En esta sesión el sandbox **sí** pudo leer y escribir en el scratchpad
   (`%LOCALAPPDATA%\Temp\claude\…`); si en otra falla, usar carpetas bajo `C:\Renders\…`.

## Procedimiento

### 1. Distribución que resista un render interior

Editar `UNIDAD` en `interior_tipo.py` (o reemplazarla por la del arquitecto). Reglas aprendidas:

- **Tabiques que llegan a la fachada, siempre sobre un machón** (entre ventanas). La distribución original tenía dos
  tabiques cortando ventanales al medio: desde adentro es lo primero que delata una arquitectura imposible. Medir las
  ventanas del modelo antes (islas de `WEB_Vidrio` en el `Piso_NN`, ver "Diagnóstico" abajo) y anotarlas en un
  comentario. En Cityh: norte x 0,42–2,09 / 2,89–4,57 / 5,20–6,87; este y 0,73–2,13 / 2,69–4,09 / 4,69–6,09.
- **Caras reales de los muros**: el muro va centrado en su línea. Medianera de 0,20 → la cara está en 0,20, no en 0;
  núcleo de 0,25 → cara en `NX + 0,125`. Los muebles se apoyan en la cara, no en la línea (al principio quedaron
  15 cm metidos en la medianera).
- **Muebles con medidas reales y circulación** (≥ 60 cm de paso). El sillón de 1,81 m no entraba sin tapar una
  puerta: probar el amoblamiento en planta antes de modelar.
- **Hojas de puerta**: una hoja batiente abierta hacia adentro partió el baño de 3 m² al medio → **corrediza** en
  baños chicos. Elegir de qué lado cuelga cada hoja para que no quede pegada a una cámara ni choque con placares.
  La puerta de **entrada va cerrada** (desde adentro no se ve el palier).
- **Superficies en el mismo plano salen negras en Cycles** (se tapan la luz): el cerámico de la cocina pisaba la madera
  (se subió 2 mm y además se sacó la superposición); el cielorraso coincidía con la base del piso de arriba del modelo
  (se bajó 1 cm). Nunca dos caras coplanares.
- **Cielorraso**: el modelo no tenía; desde adentro se veía la cara de abajo del piso de madera del departamento de
  arriba (techo marrón). `interior_tipo.py` agrega losa + cielorraso con el hueco de la escalera.
- **Dintel sobre ventanas**: entre la cabeza de las ventanas (2,27 m) y el techo la fachada no tenía muro: desde
  adentro era una franja negra hacia la fachada exterior. `interior_tipo.py` agrega un revestimiento de 2 cm en todo
  el perímetro desde `CABEZAL_VENTANAS` hasta el cielorraso.
- **Puntos de cámara** (`UNIDAD["recorrido"]`, en orden: el primero es donde arranca el tour):
  - a 1,60 m (`ALTURA_OJO`), en espacio libre: **≥ 40 cm de muebles y hojas, ≥ 80 cm de cortinas y ventanas**
    (el principal a 54 cm de la fachada salió con media panorámica de cortina);
  - cada punto en **línea recta con otro a través de una puerta** (a la altura de los ojos), si no queda aislado;
    si el vano es angosto, correr los dos puntos hasta que la recta pase por el medio de la puerta;
  - un ambiente con forma de L o angosto necesita dos puntos (el principal: "entrada" y "frente a la cama");
  - `mira` = hacia dónde arranca la vista: a lo lindo del ambiente (la ventana, la cama, la mesada).

### 2. Correr `interior_tipo.py` y después `vestir_interior.py`

Siempre en ese orden (el primero vuelve los materiales a color plano). Desde el MCP:

```python
exec(open(r"<REPO>\scripts\blender\interior_tipo.py", encoding="utf-8").read(), {"__name__": "__main__"})
ruta = r"<REPO>\scripts\blender\vestir_interior.py"
exec(open(ruta, encoding="utf-8").read(), {"__name__": "__main__", "__file__": ruta})  # necesita __file__
```

`interior_tipo.py` **conserva la configuración del proyecto** de la primera cámara al rehacerlas (`hdri`, `hdri_giro`,
`sol`, `sol_rumbo`, `sol_altura`, `exposicion`, `ocultar`, …). Si se agrega una propiedad nueva, sumarla a `claves`
ahí o se pierde en cada corrida.

Criterios de `vestir_interior.py` (y por qué):

- **Materiales por nombre**: se rearman los `WEB_*` del interior (piso, pared, cerámico, madera, telas, sanitario) con
  texturas en UV en metros (`uv_en_metros` en `interior_tipo.py`, proyección de caja): mejora también plantas y
  fachadas del mismo archivo.
- **Color parejo + relieve de la textura (`color_fijo`)** para pinturas, telas y revestimientos: las fotos de Poly
  Haven traen estampados y tintes que arruinan el look (`beige_wall_001` dejaba las paredes beige, `wool_boucle` es
  **a cuadros**, `rough_linen` es azul, `marble_01` es beige con placas enormes). De la textura se usa rugosidad y
  normal; el color lo decide el script. Blanco de pared: 0,80 (un blanco real en foto no es 1).
- **El catálogo de muebles de Poly Haven es casi todo clásico/antiguo** (capitoné, tallados): sillón, sillas, mesa,
  camas, placares, mesas de luz, cocina y baño se **modelan** por script (cajas con chaflán, almohadones con
  `Pieza.almohadon`, grupos girados con `with p.en(x, y, giro, z, inclinar)`). De Poly Haven: plantas, lámpara
  colgante, cuadros, jarrones, mesa ratona, mesa auxiliar, bol y el sillón individual (retapizado: se le cambia el
  material `…_pillow` por uno con `caja=True`, proyección de caja en coordenadas del objeto, porque su UV es un atlas).
- **Negro y cuero apagan el ambiente**: evitar muebles oscuros grandes; paleta clara con acentos (terracota, salvia).
- **Rutas de texturas de los modelos**: al hacer append, Blender reescribe la ruta relativa respecto del archivo
  abierto; "corregirla" sumándole la carpeta dio `_assets\_assets\…` (magenta en el render). Se reasigna **por nombre
  de archivo** a `<modelo>/textures/<basename>`. Al rehacer, se purgan materiales e imágenes huérfanos que vengan de
  `ASSETS` (sólo esos).
- **Luminarias**: potencia en W "reales" dividida por `ESCALA²` (la escena está en unidades de 8 m: sin dividir, una
  luz de 45 W quema todo). Quedan `hide_render` y con la propiedad `luz_recorrido`: el render del recorrido las
  prende; plantas y fachadas no. Valores que funcionaron: plafón de baño 6 W, espejo LED 2 W, spot de pasillo 10 W,
  bajo alacena 20 W, lámparas de noche 8 W (puntuales, pantalla translúcida).
- **Cortinas de voile** recogidas a los costados de cada ventana, **25 filas** de altura con onda pareja (con 5 filas
  se veían quiebres horizontales), a 13 cm de la fachada, material translúcido + transparente 0,6.
- **Detalles que "venden"**: zócalos en todas las caras, marcos de puerta, picaportes, tiradores, grifería, serigrafía
  de las hornallas (sin ella el vitrocerámico refleja las alacenas y se lee como acero), toallero con toalla, libros,
  cuadros sobre el sillón y la cabecera.

### 3. Configurar la luz (propiedades de la primera cámara `Pano_*`)

Valores finales de Cityh: `escala 8`, `hdri C:\Renders\_assets\polyhaven\hdris\portland_landing_pad_8k.hdr`,
`hdri_giro 180`, `sol 3`, `sol_rumbo 110`, `sol_altura 32`, `exposicion 2`,
`ocultar "WEB_Entorno, Entorno_Edificios, Entorno_Suelo, Entorno_Arboles, Entorno_Faroles"`.

Lo que se aprendió:

- **La exposición de la escena estaba en −1,6** (ajustada para el exterior) y el mundo al 10 %: el interior salía
  casi negro. Interior con sol: ~+2; sin sol, +4 o +5 (una cámara real expone el interior 4–5 pasos más y deja las
  ventanas quemadas: está bien). Medir el brillo de un recorte de pared con PIL en vez de adivinar.
- **Por la ventana, el barrio modelado se ve de maqueta** (cajas con ventanas pintadas) y al ocultar sólo los vecinos
  quedan manzanas vacías blancas. Lo que funcionó: **ocultar todo el entorno modelado** y dejar que el HDRI sea la
  ciudad. En un proyecto real: foto 360 con dron **desde la altura del piso**.
- **Elegir el HDRI mirando por la ventana**: probar 4 giros (0/90/180/270) con previas chicas de la misma ventana y
  quedarse con el que muestra ciudad linda (el giro 0 de portland mostraba una obra en construcción).
- **Sol aparte del HDRI**: el sol del HDRI (brillo ~11 000) entraba donde no convenía y con sombras blandas. El script
  recorta el HDRI a `LIMITE_HDRI` 30 **sólo para la luz** (la cámara lo ve entero) y apunta la lámpara de sol de la
  escena a `sol_rumbo`/`sol_altura` (elegidos para que entre por los ventanales del estar: haces en el piso y el
  voile). Sin `sol_rumbo`, lo toma del píxel más brillante del HDRI.
- **Convención de coordenadas verificada con renders de prueba** (no suponerla):
  - panorámica de Blender: el centro de la imagen es hacia donde mira la cámara y el este queda a la derecha
    (con la cámara al norte, un objeto al este cae en u ≈ 0,75);
  - textura de entorno de Cycles: `u = 0,5 − atan2(y, x) / 2π`; con el nodo Mapping girado `g` grados, el rumbo
    (desde el norte, horario) de una dirección del HDRI es el de giro 0 más `g` (en portland: 126° + giro);
  - visor (Photo Sphere Viewer): `sphereCorrection.pan = −rumbo` y `defaultYaw = rumbo` del punto inicial. Con
    `+rumbo` (lo que había) las flechas apuntaban mal. Verificación: en el visor, la puerta del baño y la flecha a la
    cocina quedaron a 187° y 182°.
- **Vidrio**: el de la fachada es opaco y oscuro (para verse de afuera). El script lo cambia por vidrio real
  **transparente para rayos de sombra y difusos** (Light Path → Mix con Transparent): con cáusticas apagadas, un
  vidrio que refracta no deja entrar sol ni cielo.
- **La malla de fachada tiene cosas adentro de la torre**: tiras `WEB_Luz_Interior` (para que brille de noche) y sus
  cajas de `WEB_Fachada`, metidas en el cielorraso de las unidades (se veían como vigas). El script hace invisibles
  las tiras y todo lo de `WEB_Fachada` a más de `FACHADA_ESPESOR` (0,15 m; con 0,6 quedaban piezas) de los vidrios, y
  pinta como pared lo de adentro de los vidrios.
- Cycles: 384 muestras máx., adaptativo 0,02, OIDN con albedo+normal, rebotes de interior (difusos 8), sin cáusticas,
  clamp indirecto 10, AgX Base Contrast. **1024 muestras no se distinguen y tardan 2,5×** (39 min vs 15 por
  panorámica en la RX 6700 XT).

### 4. Iterar con vistas previas (no con panorámicas)

`previa.py` (en esta carpeta) renderiza una perspectiva de 960×540 con el mismo ambiente en ~10–14 s:

```python
ns = {"REPO": r"C:\Renders\plantilla-edificio-3d", "CARPETA": r"<carpeta>", "NOMBRE": "10_living",
      "PUNTO": (4.4, 1.2), "MIRA": (7.2, 4.2), "MUESTRAS": 128, "LENTE": 16, "ALTURA": 1.45}
exec(open(r"<REPO>\.claude\skills\recorrido-360\previa.py", encoding="utf-8").read(), ns)
```

Hacer **hasta 3 previas por llamada** (6 cortaron por tiempo). Ver el PNG con Read. Revisar cada ambiente con la
lista de control de abajo antes de lanzar la tanda. Para comparar variantes (exposición, giro del HDRI, dos
opciones de entorno), pisar globales con `EXTRA` y armar un mosaico con PIL.

Para diagnosticar algo raro en la imagen, **tirar rayos** con `scene.ray_cast(depsgraph, origen, dirección)`:
- el índice de cara es del objeto **evaluado** (`ob.evaluated_get(dg).data.polygons[i]`), no de `ob.data`;
- saltear lo que no se renderiza (`hide_render`, cajas `Unidad_*`, `Cube` escondido, voile) y seguir el rayo;
- así se encontraron las vigas (cajas de fachada), el hueco sobre las ventanas y el cielorraso coplanar.

### 5. Revisar posiciones y enlaces (segundos)

```python
import sys; argv = sys.argv; sys.argv = ["blender", "--", "--solo-datos"]
exec(open(r"<REPO>\scripts\blender\renders_recorrido.py", encoding="utf-8").read(), {"__name__": "__main__"})
sys.argv = argv
```

El log muestra `rumbo` y enlaces de cada punto. Todos tienen que tener al menos uno y el grafo tiene que ser conexo.
Los muebles altos también cortan la visión (cocina ↔ dormitorio se perdió al amueblar): está bien si el recorrido
sigue conexo. Si un punto queda aislado, moverlo (el script lo engancha al más cercano y avisa, pero se ve raro).

### 6. Tanda final encolada

```python
ns = {"REPO": r"C:\Renders\plantilla-edificio-3d", "FIN": r"<carpeta>\fin_tanda.txt", "ARGS": []}
exec(open(r"<REPO>\.claude\skills\recorrido-360\encolar_tanda.py", encoding="utf-8").read(), ns)
```

- ~15 min por panorámica, ~2 h los 8 puntos + plano (1 min). Avisarle al usuario que Blender queda ocupado.
- Seguir desde Bash con un bucle de a 10 min (`until [ -f FIN ]` / fecha de los `.webp`); **no** usar `sleep`
  suelto. No mandar nada al MCP mientras renderiza (se cuelga hasta que termina).
- Mientras tanto, revisar cada panorámica que sale (reducida a 1536×768 con PIL, y un recorte al 100 %) y anotar
  arreglos; rehacer sólo esos puntos con `ARGS: ["--puntos", "bano,pasillo"]`. Si cambió algo que se ve en el plano
  (piso del baño, muebles), no pasar `--sin-plano`.

### 7. Cargar y verificar en la web

```bash
pnpm cargar:recorridos "<…>/web/recorridos/unidad-a" <slug-torre> A2,B2,C1,C2,D1,D2 borrar-anteriores
```

- `borrar-anteriores` borra de Media las panorámicas reemplazadas (sólo usarlo si las anteriores son de pruebas).
  `solo-datos` actualiza rumbo, posición y enlaces sin subir imágenes (sirve para reasignar tipologías).
- Respeta los títulos editados en el admin y el orden de `recorrido.json`.
- **Si no se ve en la web**: (1) la sección *Recorridos* tiene que estar prendida en *Proyecto → Secciones visibles*
  (en el seed de ejemplo viene **apagada**: es lo primero que preguntó el usuario); (2) la unidad tiene que ser de una
  tipología asignada; (3) recargar (revalidate 60 s; el cargador corre fuera de Next y no revalida).
- Para probar con la sección apagada: prenderla con un script temporal de `payload run` y **devolverla a como estaba**
  (memoria "no pisar datos del admin"). **Borrar el script temporal en el acto**: uno (`_tmp-secciones.ts`) terminó
  en un commit del usuario.
- Verificar en el navegador a 1440×810 (`resize_window`), en `/recorridos/<r>/<punto>` y en la ficha: arranca en el
  primer punto mirando a `mira`, flechas sobre las puertas, click salta, plano con el punto activo. La captura puede
  tardar en salir la primera vez (textura de 6K): reintentar. Volver el viewport a `desktop` al terminar.

## Lista de control visual (antes de la tanda y con cada panorámica)

- [ ] Nada negro que no deba: techo, franja sobre ventanas, pisos (coplanares), ambientes sin luz (baño interior).
- [ ] Nada quemado: baño/pasillo con luces bajas; paredes con textura visible.
- [ ] Sin "vigas" ni cajas en el cielorraso (restos de la malla de fachada).
- [ ] Vidrio transparente con reflejo; afuera, ciudad creíble (HDRI), sin manzanas vacías ni maqueta.
- [ ] Sol entrando por las ventanas del estar (haces en piso y cortinas).
- [ ] Ningún tabique cortando una ventana; puertas con marco; entrada cerrada.
- [ ] Muebles con proporciones reales, telas lisas (sin cuadros ni estampados), sin cuero negro dominante.
- [ ] Cámaras lejos de cortinas, hojas y placares; cada ambiente arranca mirando algo lindo.
- [ ] Texturas sin magenta (rutas bien), sin estiramiento (UV en metros).
- [ ] Plano: paredes cortadas en negro, piso visible, fondo transparente.

## Errores de código que ya se corrigieron (no reintroducir)

- `Cambios.fijar` guardaba `valor.copy()` de cualquier cosa con `copy()`: con un **dato de Blender** (el mundo) lo
  duplicó y "restauró" la copia (`World.002`, el original sin usuarios). Copiar sólo `Matrix/Vector/Euler/Color/
  Quaternion`. Si pasa, volver `scene.world` al original y borrar las copias huérfanas.
- Editar archivos con Python en Windows en modo texto escribe **CRLF**: el repo es LF → abrir y escribir con
  `newline=""`. Los heredocs de Bash con comillas triples se rompen: escribir el parche a un `.py` y correrlo.
- `--sin-plano` dejaba `"plano": null` en el JSON aunque la imagen existiera (el cargador no la subía).
- `awk length` cuenta bytes: para buscar líneas > 120 caracteres usar Python.

## Luz cinematográfica (haces de sol, momentos del día)

`renders_recorrido.py` acepta `haces`, `polvo` y `aire_caja` en la primera cámara, y el visor, `variantes` (día /
atardecer / noche). Qué valores funcionaron, qué no (el polvo en imagen fija) y cuánto cuesta: skill de usuario
`luz-cinematografica`. Leerla antes de tocar la luz.

## Alcance y pendientes

- Hecho sólo la unidad A. Las B, C y D son espejo: cada tipología distinta necesita su recorrido (~2 h de render).
  En la plantilla, el recorrido "Unidad A" quedó asignado a todas las tipologías (pedido del usuario).
- El seed no crea recorridos: si se quiere que la plantilla lo traiga, sumar panorámicas y plano a `src/seed/assets`.
- La pantalla Plantas quedó con la distribución vieja: regenerar los renders de plantas desde `cityh_recorrido.blend`.
- Pendiente del visor: el aro que sigue al cursor sobre el piso (como el tour de referencia).
