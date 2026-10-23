---
name: video-promo
description: Arma un video promocional de la web interactiva (16:9 para web/LinkedIn/YouTube y 9:16 para Reels/TikTok) grabando el sitio real con Playwright y montándolo como "plano secuencia": la web vive en una pantalla flotante que se mueve entre escenas, con títulos animados, música sintetizada al compás y cierre de marca. Usar cuando se pida un video promo, demo, teaser, reel, spot o video de lanzamiento de la web o de un proyecto inmobiliario, o rehacer/ajustar uno existente (textos, tomas, ángulos, duración, formato).
---

# Video promocional de la web

Procedimiento con el que se hicieron los videos de `https://constructoras.apzsoftware.online` (Torre Cityh) para
venderle el producto a constructoras: **promo_v2.mp4** (16:9, 50 s) y **promo_v2_vertical_reels.mp4** (9:16, 38 s).
Todo es código propio: la web real grabada, sin maquetas ni screen recording a mano, y sin licencias de terceros.

Carpeta de trabajo (fuera del repo, los clips pesan): `C:\Renders\video-promo\`. Los scripts de referencia están en
[`scripts/`](scripts/): copiarlos a la carpeta de trabajo y trabajar ahí.

### Serie de verticales (3 para celular)

| # | Archivo | Concepto |
|---|---|---|
| 1 | `promo_v2_vertical_reels.mp4` (38 s) | Recorrido de funciones: "¿Cómo se vende un edificio que todavía no existe?" |
| 2 | `promo_vertical_2_showroom24h.mp4` (29 s) | **Showroom 24 h**: un comprador a las 23:40 (reloj 18:00→23:40), el edificio pasa de día a noche, elige la 8B y ve el precio (zoom a la tarjeta), recorre living y dormitorio, completa el formulario de consulta y a la desarrolladora le llegan dos notificaciones. Música propia **`musica_noche.py`** (lo-fi: piano eléctrico FM, batería con swing, vinilo, tic-tac del reloj, toques, tipeo y campanita en los avisos, sincronizados con las marcas de `clips_v2b/*.json`), 104 BPM. |
| 3 | `promo_vertical_3_antes_ahora.mp4` (29 s) | **Antes / Ahora en dos mitades**. Primera mitad, todo en gris: "Así se vendía un edificio." y cuatro mockups dibujados en el escenario que se **apilan** (PDF de 38 MB, precios "por privado", planos sueltos por mail, pedir turno). En la bisagra la pila se cae, vuelve el color y sube el celular: "Ahora, todo en un solo lugar". Después la web real seguida (giro, fachada sudeste con la 3C, planos 2D→3D, 360, 3D coloreado). Música **`musica_v3.py`**, chill acústica: guitarra criolla Karplus-Strong, kalimba, colchón de senoidales y percusión suave que entra en el "ahora"; en el "antes" suena en Si menor y apagada, y en el "ahora" en Re mayor. **La primera versión en pares (antes/ahora alternados, música de espera + house) no le gustó al usuario**: quedó en `*_v3_pares.*`. |

Idea que quedó sin usar: "Una unidad, a fondo" (todo sobre una unidad, lento y emotivo).

Cada video nuevo lleva su propio `guion_<x>.py` (con `SUF`, `VERT` y `MUSICA`: acordes, raíz, semilla, qué escenas
abren cada capa, `dings`), `escenario_<x>.html` y `capture_<x>.py` (salida `clips<SUF>/`). Se arma con
`GUION=guion_v2b python armar.py extraer|render`, `GUION=guion_v2b python musica.py` y
`VERT=1 ESC=escenario_v2b.html python muestras.py …`. **Cada video con su propia música**: cambiar sólo acordes y tempo en `musica.py` suena al mismo tema (el usuario lo notó); hacer otro generador con otros instrumentos, como `musica_noche.py`. **Formulario de consulta en una toma**: bloquear todo POST
(`page.route`) y el `submit` antes de tocar "Enviar", para no crear leads reales en producción; cortar la escena en
el toque y lo que sigue (la notificación) se dibuja en el escenario. Tomas del 360 con saltos entre puntos: mejor
una toma por punto navegando directo a la URL (el toque en el plano chico cayó en otro punto).

## Fuentes de inspiración

1. **onetake** — https://github.com/feitangyuan/onetake. Skill de Claude para videos de lanzamiento "de una sola
   toma". De ahí salen las ideas que usamos:
   - **Cada escena nace de la anterior**: nada de diapositivas que se reemplazan. La transición es la parte que más
     se diseña (un elemento se transforma y lleva la mirada a lo siguiente).
   - Interfaz reconstruida/mostrada en HTML y **render determinista cuadro a cuadro** con Playwright + ffmpeg.
   - Hoja de escenas con duraciones que varían mucho entre sí (al menos 4×) y la mecánica de cada transición
     escrita de antemano; movimientos con curvas de aceleración medidas.
   - Sonido pensado junto con la imagen (golpes y barridos en los cortes).
   - Revisión antes de mostrarle el video a nadie.

   **Licencia PolyForm Noncommercial 1.0.0: prohíbe uso comercial.** Un video para vender la web es comercial, así
   que **no instalar ni copiar su código**: se tomaron sólo las ideas y se escribió todo desde cero.
2. **Post de X de @RaphaelAubryy** — https://x.com/RaphaelAubryy/status/2104502744010629269. Sobre cómo armar un video
   promocional de una web con la ayuda de Claude. **No se pudo leer** (X devuelve 402 sin sesión): si el usuario pega
   el texto, sumar acá lo que aporte.

## Resultado y piezas

| Pieza | Qué hace |
|---|---|
| `capture.py` | Graba cada toma 16:9 (1920×1080) de la web en producción: Chrome real con Playwright, cursor falso coreografiado (movimiento con curva y arco, onda al hacer click). Salida `clips/<toma>.mp4` + `<toma>.json` con marcas de tiempo (click, hover, fin). |
| `capture_movil.py` | Lo mismo en **modo celular** (432×768 CSS, DPR 2,5 = 1080×1920), con toques reales por CDP e indicador de dedo. Salida `clips_v/`. |
| `guion.py` / `guion_v.py` | La hoja de escenas: toma, desde qué segundo, velocidad, cuántos pulsos dura, encuadre de la pantalla, textos, `foco` (zoom a un punto), `grupo` (escenas que comparten un solo título). |
| `escenario.html` / `escenario_v.html` | El "estudio": fondo con luces de marca, la pantalla flotante con perspectiva, títulos que entran por máscara, fundido con zoom entre tomas, cierre con logo. `window.render(t)` dibuja el instante `t`. |
| `armar.py` | `extraer`: corta cada escena de su toma a 30 fps, a la velocidad pedida, y escribe `linea.js`. `render`: dibuja el escenario cuadro a cuadro y codifica con la música. Con `VERT=1` hace la vertical. |
| `musica.py` | Música y efectos sintetizados con numpy (96 BPM, La menor): colchón, bajo, bombo, hi-hat, arpegio, barridos en cada corte, subida y golpe sobre el logo. `VERT=1` → `musica_v.wav`. |
| `muestras.py` | Dibuja instantes sueltos del escenario en una hoja (revisar diseño sin renderizar todo). |
| `hoja.py` | Tira de miniaturas de cada toma grabada (`DIR=clips_v` para las verticales). |
| `explorar360.py` | Recorre las panorámicas del recorrido 360 con el zoom al mínimo, girando de a pasos, para elegir ángulos. |

Requisitos: Python con `playwright`, `Pillow`, `numpy`, `scipy`; ffmpeg; Chrome instalado (se usa
`channel='chrome'`, no hace falta `playwright install`).

## Procedimiento

### 1. Guion antes que nada

Preguntar formato (16:9, 9:16 o ambos), duración, audio (música + textos por defecto: funciona sin sonido en redes)
y con qué marca se firma el cierre. Después escribir la secuencia de escenas con **un mensaje por escena**. La que
funcionó:

| Escena | Toma | Mensaje |
|---|---|---|
| Gancho | — (fondo de marca) | "¿Cómo se vende un edificio que todavía no existe?" — la pantalla aparece chica detrás del texto y crece |
| Intro | portada, click en Entrar | "Mostralo antes de construirlo." |
| Giro | flechas del Giro 360 (día → aérea → noche) | "Renders que enamoran." |
| Disponibilidad | fachada: hover por 3 unidades libres, **click** en la última → tarjeta con precio | "Disponibilidad en vivo." |
| Plantas | piso 5: hover, **click en 5C → tarjeta → Ingresar** (entra a la ficha) | "Elegí el piso. Elegí la unidad." |
| Ficha | de la **misma unidad** (5C): Planta 2D → 3D | "Planos 2D y 3D." |
| Recorrido 360 | 2–3 tramos (Ingreso → Living → Dormitorio) con un solo título | "Entrá a la unidad antes de que esté terminada." (el mensaje central: darle más tiempo) |
| Modo 3D | activar "Colorear edificio", botones Aérea y Principal | "El edificio en 3D." |
| Y además | amenities, ubicación, obra (1,25 s c/u, chips que se prenden) | "Todo el proyecto, en un solo lugar." |
| Cierre | la portada se desenfoca, entra el logo | lema + URL + "Pedí tu demo" |

Textos en rioplatense, cortos, una palabra de acento en naranja (`<em>`).

### 2. Reconocimiento

- Capturar todas las pantallas de la web (1920×1080 y, para la vertical, en modo celular) y verlas en una hoja.
  Elegir **qué unidad** usar consultando `/api/disponibilidad`: una **Disponible** muestra precio en la tarjeta; una
  reservada muestra "no disponible", que vende menos.
- Selectores útiles: unidades `.forma[aria-label*="Unidad 5C,"]` (el aria-label trae el estado: filtrar por
  `Disponible`), flechas `.giro-flecha.der`, tarjeta de unidad `.popover-unidad .boton.primario` (Ingresar),
  puntos del plano del 360 `.recorrido-punto[aria-label="Living"]`, pisos del 3D `.fila-piso`, interruptores
  `label.interruptor` con texto, botones de cámara `get_by_role('button', name='Aérea')`.
- Recorrido 360: correr `explorar360.py` y elegir los puntos y la dirección de giro que muestran ambientes enteros
  (en Cityh: Ingreso mirando al living, Living con sillón + ventanales + cocina, Dormitorio principal con cama y
  ventanal). **Con el zoom al mínimo** (rueda hacia afuera antes de grabar) la imagen es mucho más amplia.

### 3. Grabar

```bash
python capture.py                      # todas las tomas 16:9, o: python capture.py fachada planta
python capture_movil.py                # tomas verticales
python hoja.py 8 fachada planta        # revisar (DIR=clips_v para las verticales)
```

Cada toma: navegar y esperar la carga **fuera** de la grabación, grabar, coreografiar, cortar. Revisar la hoja de
cada toma antes de seguir: si algo quedó mal (cámara adentro del edificio, mirando una pared), se repite sólo esa.

### 4. Montar y revisar

```bash
python armar.py extraer                # corta escenas según el guion
python muestras.py 2.3 8.5 13.5 22 27  # cuadros sueltos del escenario
python musica.py
python armar.py render                 # ~2 min, sale video_sin_audio.mp4 (con música si existe musica.wav)
VERT=1 python armar.py extraer && VERT=1 python musica.py && VERT=1 python armar.py render
```

Revisar siempre con cuadros alrededor de **cada corte** (±0,3 s): ahí aparecen los saltos, los negros y los
fundidos rotos. Recién después mandar el video al usuario (con `SendUserFile`; más de 30 MB no llega al celular:
recomprimir la vertical con `-crf 19`).

## Reglas de diseño

- **Plano secuencia**: la pantalla con la web nunca sale de cuadro; entre escenas cambia de encuadre (costado
  izquierdo/derecho con leve giro en Y, pantalla completa) interpolando 0,9 s, y la toma nueva entra con un fundido
  corto (0,32 s) con zoom y desenfoque. El gancho hace crecer la pantalla desde atrás del texto.
- **Cortes al compás**: cada escena dura un número entero de pulsos (96 BPM → 0,625 s); la música se genera desde
  el mismo guion, así barridos y golpes caen en los cortes.
- **Clicks que se vean**: después de un click que abre algo (tarjeta de unidad), hacer **zoom de cámara** hacia eso
  (`foco` en el guion) para que se lea el precio. En la vertical no hace falta: en el celular la tarjeta ya ocupa
  media pantalla.
- **Continuidad de datos**: si una escena entra a la ficha de una unidad, la escena siguiente muestra esa misma
  unidad.
- Texto encima de la toma sólo con velo oscuro (degradé) y **nunca encima de texto de la web**: si choca, mover el
  título (arriba, sobre el cielo) o meter la toma en la pantalla flotante.
- Logo de marca sobre fondo oscuro: versión clara (`armar.py` la genera: todo lo que no es el acento → blanco).
- Vertical (Reels): zonas seguras, nada de texto arriba de 230 px ni debajo de 1920 − 420 px; títulos arriba y el
  celular flotando abajo. Duración ideal ~30–40 s.

## Errores que ya se cometieron (no repetir)

- **Grabar el monitor con `gdigrab`**: el usuario usa ese monitor y otra ventana (un video en pantalla completa)
  tapó a Chrome; se perdieron 7 de 10 tomas. Grabar **siempre con el screencast de CDP** (`Page.startScreencast`,
  ~100 fps a 1080p), que captura lo que dibuja Chrome sin importar lo que haya en pantalla, con
  `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion`.
- **El screencast no manda cuadros cuando la página está quieta**: el final estático de la toma se pierde. Hay que
  dar al último cuadro la duración hasta el `fin` y, como el demuxer `concat` de ffmpeg **ignora la duración de la
  última entrada**, repetir el último archivo en la lista. Síntoma: clips más cortos que su `fin` y escenas con
  cuadros faltantes.
- Encoder que falla (`Error while opening encoder`): algún cuadro de otro tamaño; forzar `scale=W:H,setsar=1`.
- `drawtext` de ffmpeg se cuelga en este Windows (fontconfig): rotular miniaturas con PIL.
- `playwright install` no hace falta: `channel='chrome'` usa el Chrome instalado.
- **Modo 3D**: arrastrar para orbitar mete la cámara adentro del edificio (ventanas negras en primer plano). Usar
  los **botones de cámara** del visor (Principal, Aérea…), que vuelan suave.
- **Recorrido 360**: arrastres largos terminan mirando paredes; revisar ángulos con `explorar360.py`. En modo
  celular el deslizamiento táctil casi no gira el visor: usar arrastre de **mouse** (el indicador de dedo lo sigue).
  Al saltar entre puntos aparece "Cargando…": partir el recorrido en tramos (`grupo`) y dejar afuera la carga.
- Click en una unidad **reservada**: la tarjeta dice "no disponible". Elegir una disponible.
- Carga del plano 3D en la ficha: ~0,1 s de negro. `sin_negros=True` en la escena repite el cuadro anterior.
- Mapa de Ubicación: arranca en blanco; tomar la escena desde que cargó (~1 s después del click).
- Al derivar el escenario vertical del horizontal, quedó apuntando a `cuadros/` en vez de `cuadros_v/`: todo se veía
  recortado. Chequear rutas `_v` (cuadros, `linea_v.js`, `musica_v.wav`).
- La escena que interpola desde el encuadre oculto arranca con opacidad 0: si el gancho ya mostró la pantalla,
  forzar opacidad 1 en la escena siguiente (si no, parpadea).
- Textos laterales que pisan la pantalla flotante: con la pantalla al 63,5 % y ±262 px quedan ~450 px para el
  texto (títulos de 66 px).

## Para otro proyecto

- `capture.py`: `B` (URL del sitio), unidades y selectores de cada toma.
- `guion*.py`: textos, qué unidad, tiempos (`desde` y `vel` salen de las marcas de `<toma>.json`).
- `armar.py`: `LOGO` (o variable de entorno) y colores en `escenario*.html` (`--naranja`, luces del fondo).
- `musica.py`: tempo y acordes si se quiere otro clima. Si el cliente tiene un tema con licencia, reemplazar
  `musica.wav` y listo.
