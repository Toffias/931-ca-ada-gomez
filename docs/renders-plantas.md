# Renders de plantas por piso (Blender → web)

Especificación para generar, desde el modelo de Blender, la **vista aérea de cada piso con el edificio cortado**
(las unidades se ven desde arriba, con paredes y muebles) y la **máscara SVG** que la vuelve clickeable. Es la
pantalla *Plantas* (`/p/<torre>/<piso>`): hover y click sobre cada departamento, color según disponibilidad.

Referencia: PH Balcony (`phbalcony.com/#/t/99/17`). Ahí hay un render por piso (webp 1920×1080) y, arriba, un SVG
del mismo tamaño con un `<polygon>` por depto, dibujado a mano en Illustrator. Acá la máscara la genera el
script desde las cajas `Unidad_*` del modelo, así no hay nada que calcar.

Script: [`scripts/blender/renders_plantas.py`](../scripts/blender/renders_plantas.py) (probado con Blender 5.2 sobre
`cityh_web_v2.blend`: pisos 1–9, cámara solidaria y máscaras alineadas). Convenciones generales del
modelo: [`pipeline-blender.md`](pipeline-blender.md).

---

## 1. Cómo es la vista

- **Cámara en picada** sobre la torre, levemente inclinada: se ve la planta desde arriba y, debajo, un poco de
  fachada de los pisos inferiores y el entorno. No es una planta ortogonal: es una perspectiva aérea.
- **El edificio termina en el piso elegido.** Todo lo de arriba se oculta; las paredes del piso se cortan a
  **1,5 m** de altura, así se ven los ambientes sin que las paredes tapen.
- **La cámara sube con el piso.** Se encuadra una sola vez; para cada piso se desplaza en Z lo mismo que sube el
  nivel. La planta queda **siempre en el mismo lugar y del mismo tamaño** en la imagen. Al cambiar de piso sólo
  cambian las etiquetas y cuánto edificio se ve debajo. Por eso se siente "subir".
- **Niveles especiales** (planta baja, amenities, rooftop) salen con la misma cámara y el mismo corte. En el admin
  se cargan como nivel *Especial* con puntos de interés en lugar de unidades.

## 2. Qué tiene que tener el modelo

Lo que ya pide el pipeline web (pisos, unidades, techo) más **el interior**:

| Requisito | Por qué | Estado en Torre Cityh |
|---|---|---|
| Objetos de piso con `tipo="piso"`, `piso=N`, separados por nivel | ocultar los pisos de arriba y calcular la Z de cada nivel | ✔ `Piso_01…09` |
| Techo con `tipo="techo"` | se oculta siempre | ✔ |
| Cajas `Unidad_<código>` con `tipo="unidad"`, `unidad`, `piso` | de acá sale la máscara (su huella) | ✔ 36 unidades |
| **Interior del piso tipo**: paredes, aberturas, solados por ambiente | es lo que se ve en el render | ✘ hay que modelarlo |
| Paredes **sólidas y cerradas** (manifold, con espesor) | el corte tapa la cara superior con `WEB_Corte`; una pared de una sola cara queda hueca vista desde arriba | – |
| Sin cielorrasos dentro del piso (o como objeto aparte del piso N+1) | si no, tapan la vista | – |
| Muebles (opcional pero recomendado) | lectura de ambientes; PH Balcony los muestra | – |
| Niveles especiales equipados (PB, amenities, rooftop) | se renderizan igual | – |
| Todo el edificio (torre + interiores) en **una colección** (`Edificio`) | el script sólo oculta y corta eso; el entorno queda intacto | – |

### Interiores de arranque: `interior_tipo.py`

Mientras no llegue la distribución del arquitecto, [`scripts/blender/interior_tipo.py`](../scripts/blender/interior_tipo.py)
genera un piso tipo genérico en todos los pisos: núcleo central (palier, escalera de dos tramos, dos ascensores) y
4 unidades de 2 dormitorios en espejo, con estar-comedor-cocina, baño, solados y muebles simples. Crea la colección
`Interiores` (fuera de `WEB`, no va al `.glb`), un objeto por piso y capa (muros, solados, muebles) que comparten
malla, y rehace las cajas `Unidad_*` con la huella en L de cada unidad (sin el núcleo) para que la máscara calce.

- La distribución son datos en metros al principio del script: `NUCLEO` y `UNIDAD` (cuadrante A, se espeja a B, C
  y D según `CUADRANTES`). Para otro edificio se ajustan `X_INT`/`Y_INT` (cara interior de la fachada), el núcleo y
  los ambientes.
- Se puede correr varias veces: borra y rehace `Interiores`.
- En la cámara `Render_Planta`: `colecciones = "WEB_Torre, Interiores"` (o la colección de la torre que use el
  proyecto).

### Interiores definitivos: cómo modelarlos sin multiplicar el trabajo

1. Modelá **un piso tipo** completo (paredes con espesor, marcos, puertas, pisos de madera y cerámica, muebles
   low-poly) en su propia colección, por ejemplo `Interior_Tipo_A`.
2. Para cada piso: **duplicado vinculado** (`Alt+D`) subido a su nivel, con la propiedad `piso = N` en cada objeto.
   Comparten malla (el `.blend` no crece) y el script corta cada copia por separado.
3. Si hay más de un piso tipo (A en 1–10, B en 11–20), un interior por tipo.
4. **No uses instancias de colección** (Empty → *Instance Collection*) para interiores: se ocultan bien por piso,
   pero el corte no las puede recortar. Si ya las tenés, *Object → Apply → Make Instances Real*.
5. Las cajas `Unidad_*` tienen que envolver el departamento **hasta el filo exterior de sus muros y balcones**: la
   máscara es su huella proyectada. Si una unidad tiene forma de L, armá la caja con dos cubos en una misma malla
   (el script proyecta cada cara inferior a media altura del corte y une las piezas en un solo contorno, con la
   etiqueta en la pieza más grande).

### Materiales para el render

Este render es aparte del `.glb` web: puede usar Cycles, nodos procedurales y lo que haga falta.

- Interiores claros y neutros (blanco / gris cálido). Solados diferenciados por ambiente (madera en estar y
  dormitorios, cerámica en baños y cocina). PH Balcony usa interiores casi blancos y sin texturas fuertes.
- **`WEB_Corte`**: material de la cara superior de las paredes cortadas. Un gris medio o el color de acento oscuro
  da el efecto de "planta de arquitectura". Si no existe, la cara toma el material de la pared.
- Vidrios de fachada: sin reflejos fuertes desde arriba (roughness alta o transparencia), así no tapan el interior.

## 3. Cámara `Render_Planta`

Va **fuera de la colección `WEB`**, así el exportador no la toma como vista del visor 3D.

| Parámetro | Valor | Nota |
|---|---|---|
| Nombre | `Render_Planta` | configurable en el script (`CAMARA`) |
| Propiedad `piso` | el piso sobre el que se encuadró | se toma de referencia para subir o bajar la cámara |
| Resolución | **2560 × 1440** (16:9) al 100 % | el admin genera los tamaños menores |
| Lente | 35–50 mm | más tele = menos deformación de la planta, menos fachada visible |
| Inclinación | 20–35° respecto de la vertical (rotación X ≈ 20–35° mirando hacia abajo) | 0° = planta pura; PH Balcony anda cerca de 25° |
| Orientación | alineada con una fachada (la planta derecha, no en diagonal) | la fachada principal hacia abajo de la imagen |
| Encuadre | la planta ocupa **~55 % del alto**, centrada | queda aire para ver torre y entorno |
| Zona segura | todas las unidades dentro del **70 % central** del ancho | en celular (820 px) el visor recorta los costados |

Cómo encuadrar: elegí el piso de referencia (uno tipo, del medio), ocultá a mano lo de arriba, ubicá la cámara
(*View → Cameras → Set Active Object as Camera*, `Ctrl+Alt+0` desde la vista) y guardá. Después el script hace el
resto para todos los pisos.

## 4. Luz y entorno

- Sol alto (elevación 50–65°, rotación X del sol ≈ 30°), ángulo 2–4° para sombras suaves: desde arriba un sol bajo
  llena la planta de sombras de paredes.
- **Fondo**: dos looks, propiedad `fondo` de la cámara (o `--fondo` al correr el script):
  - **`blanco`**: sólo el edificio, sin entorno. Se oculta todo lo que no está en las colecciones del edificio
    (las luces quedan) y el render sale **con transparencia** (webp RGBA). La web pone detrás el fondo del tema:
    casi blanco en claro, oscuro en oscuro, sin bordes al alejar el zoom. Para blanco puro, *Proyecto → Marca →
    Fondo tema claro* = `#ffffff`. Con `sombra = 1` (sólo Cycles) agrega un suelo *shadow catcher* para que la
    sombra del edificio caiga sobre el fondo; va apagado porque con el sol de costado queda un bloque oscuro que
    distrae. Referencia: la vista de plantas de Cetri 5ta Avenida.
  - **`realista`** (defecto): el edificio en su entorno. Sin foto, usa el entorno modelado de la escena. Con
    **`foto_entorno`** (ruta a una ortofoto o render aéreo del terreno, relativa al `.blend` con `//`), oculta el
    entorno modelado y pone la foto de suelo, centrada en el edificio: `foto_entorno_metros` = lado mayor que cubre
    en el terreno, `foto_entorno_giro` = grados si su norte no coincide con +Y. Usar imágenes con licencia para uso
    comercial (del cliente, un vuelo propio o un proveedor de ortofotos): las capturas de Google Earth/Maps no.
    Referencia: Ipanema Residences.
- En `realista` el entorno se atenúa solo: el script arma un compositor temporal que aísla el edificio con
  Cryptomatte y aclara y desatura el resto (`atenuar_entorno`, `DESATURAR_ENTORNO`, `COLOR_BRUMA`; 0 = sin bruma).
  Con foto conviene una bruma suave (0,2–0,35); 0,6 deja el entorno lavado y gris.
  `desenfocar_entorno` desenfoca sólo el entorno, como una foto con poca profundidad de campo: la torre queda
  nítida y resalta. El desenfoque se normaliza por la máscara, así el color del edificio no deja halo alrededor.
- **Volúmenes de niebla fuera** (`OCULTAR`, por defecto `Bruma*`): en Cycles, con la cámara arriba, tapan el sol y
  oscurecen toda la planta. EEVEE casi no los muestra, así que el problema aparece recién en la tanda final.
- Las cajas `Unidad_*` se ocultan siempre, estén en la colección que estén: su material transparente engaña en
  EEVEE, pero Cycles las dibuja opacas encima de los departamentos.
- Motor: EEVEE para probar encuadre y look, **Cycles** para la tanda final (con denoise; 64–128 muestras alcanzan).

## 5. Salida

El script escribe junto al `.blend`, en `//web/plantas/`:

```
piso-01.webp   piso-01.svg
piso-02.webp   piso-02.svg
…
plantas.json   ← qué unidades salieron en cada máscara, tamaño y cámara
```

Máscara (mismo `viewBox` que la imagen en píxeles, un elemento por unidad):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440" data-piso="5">
  <polygon data-unidad="5A" data-cx="980.2" data-cy="640.5" points="812,560 1102,560 1110,742 806,742"/>
  <polygon data-unidad="5B" data-cx="…" data-cy="…" points="…"/>   <!-- unidad en L: un solo contorno -->
</svg>
```

- `data-unidad` = código **idéntico** al de *Payload → Unidades* (único por torre).
- `data-cx`/`data-cy` = dónde va la etiqueta; si falta, la web usa el centroide.
- `data-torre` sólo si en el script se completa `TORRE`: para imágenes con varias torres a la vez, **nunca en
  plantas** (la pantalla de plantas busca cada forma por el código solo; con `data-torre` se rompen el resaltado y
  el salto a la unidad).
- Peso: webp calidad 88 ≈ 300–600 KB por piso a 2560 px.

## 6. Correr el script

1. Configuración: lo propio de cada proyecto va como **propiedades personalizadas de la cámara `Render_Planta`**, así
   el `.blend` queda listo y el script no se edita:

   | Propiedad | Ejemplo (Torre Cityh) | Default del script |
   |---|---|---|
   | `piso` | `5` | – (obligatoria) |
   | `escala` | `8.0` | `1.0` |
   | `colecciones` | `"WEB_Torre, Interiores"` | `"Edificio"` |
   | `altura_corte` | `1.5` | `1.5` |
   | `torre` | vacío (sólo imágenes con varias torres) | vacío |
   | `atenuar_entorno` | `0.3` | `0.6` (sólo `realista`) |
   | `fondo` | `"blanco"` o `"realista"` | `"realista"` |
   | `foto_entorno` | `"//entorno/ortofoto.jpg"` | vacío (entorno modelado) |
   | `foto_entorno_metros` | `400` | `400` |
   | `foto_entorno_giro` | `0` | `0` |
   | `sombra` | `0` | `0` (sólo `blanco`, en Cycles) |
   | `desaturar_entorno` | `0.15` | `0.6` (sólo `realista`) |
   | `desenfocar_entorno` | `0.004` | `0` (sólo `realista`): radio del desenfoque en fracción del ancho; 0,004 suave, 0,01 marcado |
   | `ocultar` | `"WEB_Entorno"` | vacío: colecciones que no van en estos renders (p. ej. la copia del entorno para el visor web, que se superpone con la de render) |

   El resto (`FORMATO`, `CALIDAD`, `OCULTAR`, `COLOR_BRUMA`…) está al principio de `renders_plantas.py`.
2. **Prueba de encuadre sin render**: `--solo-mascaras`. Escribe los SVG en segundos; abrilos encima de un render de
   prueba para chequear que calcen.
3. **Prueba de look**: `--prueba` renderiza sólo el piso de referencia al 25 %.
4. Tanda completa, desde la consola para no trabar la interfaz:

```bash
blender -b "cityh_render.blend" --python scripts/blender/renders_plantas.py -- --pisos 1-9
```

El script trabaja con copias temporales recortadas y al terminar las borra y restaura visibilidad y cámara; el `.blend` queda como estaba.

> Blender instalado desde la Microsoft Store no se deja ejecutar desde la consola (`blender.exe` da *permission
> denied* y `blender-launcher.exe -b` se desprende sin salida). Con esa instalación, correlo desde la pestaña
> *Scripting* o instalá la versión portable/instalador de blender.org para la tanda en consola.

## 7. Cargar en la web

Automático: `pnpm cargar:plantas "<carpeta con plantas.json>" <slug de la torre>` sube todo y completa los niveles
(saltea los pisos sin unidades y no borra archivos anteriores; opciones `incluir-especiales` y `borrar-anteriores`).
Lee el `fondo` de `plantas.json`: los `blanco` van a *Render cenital (blanco)* y los `realista` a *Render cenital
(realista)*, sin tocar el otro. Conviene cargar las dos tandas y elegir en *Edificio → Plantas → Fondo de las
plantas*; si un nivel no tiene el elegido, muestra el otro. Comparten la máscara, así que las dos tandas tienen que
salir de la misma cámara (si cambió el encuadre, re-renderizar las dos).

A mano: *Admin → Edificios → (torre) → Plantas → Niveles*, una fila por piso con

- **Piso**: N (0 = planta baja, −1 = subsuelo).
- **Tipo**: *Con unidades* (o *Especial* para amenities / rooftop, con sus puntos de interés en %).
- **Render cenital (realista)** y/o **(blanco)**: `piso-NN.webp` de cada tanda. **Máscara SVG**: `piso-NN.svg`.

Sin render cargado, la web sigue mostrando el esquema generado desde el `.glb`: se puede subir piso por piso.
Revisar en `/p/<torre>/<piso>` en **tema claro y oscuro**: hover, click a la ficha y colores de disponibilidad.
El selector de fondo es por torre: todos los pisos se ven con el mismo fondo (salvo los que no tengan ese render).

## 8. Checklist de aceptación

- [ ] Todos los pisos tienen el mismo encuadre: al pasar de un piso al siguiente la planta no se mueve.
- [ ] No se ve nada por encima del corte (losas, techo, cielorrasos, pisos superiores).
- [ ] Las caras cortadas de las paredes están cerradas (sin huecos ni caras negras).
- [ ] Cada unidad del piso aparece en `plantas.json` y su polígono calza sobre el depto en la imagen.
- [ ] Ningún polígono se come la circulación común ni el depto vecino más que el espesor de un muro.
- [ ] Las unidades quedan dentro de la zona segura (se ven en celular).
- [ ] Códigos de la máscara = códigos en Payload (`5B`, no `05B` ni `Unidad_5B`).
- [ ] Interior claro, sin reflejos de vidrio que tapen ambientes.
- [ ] Fondo `blanco`: nada del entorno en cuadro y el borde de la imagen no se nota en tema claro ni oscuro.
- [ ] Fondo `realista`: la foto de entorno calza con la ubicación real (calles, norte) y la bruma no la deja gris.

## 9. Cuándo volver a correrlo

- Cambió el modelo (interiores, fachada, cajas de unidad) → tanda completa.
- Cambió sólo un código de unidad → `--solo-mascaras` (no hace falta re-renderizar).
- Cambió la cámara → tanda completa. Nunca mezclar imágenes de dos encuadres distintos.
