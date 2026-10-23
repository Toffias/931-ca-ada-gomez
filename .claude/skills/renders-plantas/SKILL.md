---
name: renders-plantas
description: Genera desde Blender los renders de plantas por piso (vista aérea con el edificio cortado en el piso elegido, la cámara sube con el piso) y sus máscaras SVG de unidades para la pantalla Plantas de la web. Usar cuando se pida armar, revisar o regenerar las imágenes de plantas por piso, la vista "tipo PH Balcony", renders cenitales o máscaras data-unidad desde el modelo 3D.
---

# Renders de plantas por piso

La spec completa (requisitos del modelo, cámara, look, salida, checklist) está en `docs/renders-plantas.md`:
**leela entera antes de empezar**. El script es `scripts/blender/renders_plantas.py`. Esta skill es el procedimiento.

## Resultado esperado

Por cada piso N: `piso-NN.webp` (2560×1440) + `piso-NN.svg` (mismo viewBox, `<polygon data-unidad="…">` por
unidad) en `//web/plantas/` junto al `.blend`, más `plantas.json`. Se cargan en *Admin → Edificios → Plantas →
Niveles* (render cenital + máscara). La web los consume por `src/lib/escenas.ts → escenaNivel` y
`src/lib/escena/mascara.ts`, así que no hace falta tocar código para verlos.

## Procedimiento

1. **Conectar con Blender.** Usar el MCP de Blender (`execute_blender_code`). Si no responde en `localhost:9876`,
   pedirle al usuario que abra el `.blend` de **render** (no el `_web`) y prenda el servidor del add-on MCP. La
   versión de la Microsoft Store no se puede ejecutar desde la consola (`blender.exe` → permission denied,
   `blender-launcher.exe -b` se desprende sin salida) ni con `execute_blender_code_for_cli`: con esa instalación todo
   pasa por el Blender abierto.
   - Si el add-on está instalado pero no hay servidor: *Preferences → System → Network → Allow Online Access* (sin
     eso el arranque automático se saltea) y *Preferences → Add-ons → MCP → Start MCP Bridge Server*.
   - Blender de la Store corre en un sandbox que **no ve `%LOCALAPPDATA%\Temp`** (el scratchpad de Claude): los
     archivos que tenga que leer o escribir van bajo `C:\Renders\…` o dentro del repo, y el código se le pasa inline.
   - Si Blender abrió sin archivo (escena por defecto), se puede abrir el `.blend` con `bpy.ops.wm.open_mainfile`.
     Nunca guardar (`save_mainfile`) sin que el usuario lo pida: las pruebas se hacen en memoria.

2. **Diagnóstico del modelo** contra la tabla de requisitos de la spec (§2). Con un script que devuelva `result`:
   - pisos: objetos `tipo="piso"` con `piso`, y su Z mínima (tienen que subir de forma pareja);
   - unidades: `tipo="unidad"`, `unidad`, `piso`; códigos repetidos; unidades sin piso;
   - techo `tipo="techo"`;
   - **interiores**: ¿hay paredes interiores y solados por piso? Si el edificio es sólo fachada + cajas (como la
     Torre Cityh de ejemplo), avisarlo y ofrecer dos caminos: el interior genérico de
     `scripts/blender/interior_tipo.py` (propuesta base, se ajusta editando `NUCLEO`/`UNIDAD` en metros; medir antes
     la cara interior de la fachada y el espesor de losa cortando un `Piso_NN` con `bmesh.ops.bisect_plane`) o el
     plan de §2 para modelar el definitivo. No generar interiores sin que el usuario lo pida;
   - instancias de colección que crucen el plano de corte (el corte no las recorta);
   - la colección que agrupa torre + interiores (el `COLECCION_EDIFICIO` del script);
   - si ya existe la cámara `Render_Planta` y su propiedad `piso`.
   Presentar el resultado como lista corta: qué está listo, qué falta y qué decide el usuario.

3. **Cámara.** Si no existe, proponer una siguiendo §3: sobre un piso tipo del medio, inclinación ≈ 25° desde la
   vertical, lente 35–50 mm, alineada con la fachada principal, planta en ~55 % del alto y unidades dentro del 70 %
   central. Crearla fuera de la colección `WEB` y cargarle `piso = <referencia>`. Mostrarle al usuario una captura
   del encuadre (`render_viewport_to_path` o `get_screenshot_of_area_as_image`) antes de seguir.

4. **Configurar.** Lo propio del proyecto va como propiedades de la cámara `Render_Planta` (`piso`, `escala` = la
   del admin, `colecciones`, `altura_corte`, `torre`, `atenuar_entorno`, `fondo`, `foto_entorno`; tabla en §6 de
   la spec), no editando el script. **Preguntar el fondo** (§4): `blanco` (sólo el edificio, transparente, la web
   pone el fondo del tema) o `realista` (entorno modelado o `foto_entorno`: pedirle al usuario la ortofoto con
   licencia, nunca bajar capturas de Google). Si el entorno modelado es pobre (cajas grises), `realista` sin foto
   se ve mal: recomendar `blanco`, vestir el entorno (techos con pretil y equipos, asfalto, árboles de vereda) o
   conseguir la foto. Lo habitual es sacar **las dos tandas** (`--fondo blanco` y `--fondo realista`, misma cámara)
   y cargar ambas: el admin elige cuál se ve en *Edificio → Plantas → Fondo de las plantas*. Si el proyecto usa otros nombres de propiedades en los objetos, ajustarlos en el script y en
   `convenciones.ts` de manera coherente.

5. **Validar sin renderizar.** Correr en el Blender abierto con `--solo-mascaras`. Desde el MCP, cargar el script
   como módulo para poder pisar la configuración sin editar el archivo:

   ```python
   import sys, io, contextlib
   ns = {"__name__": "renders_plantas"}          # así no corre main() solo
   exec(open(r"C:\Renders\<repo>\scripts\blender\renders_plantas.py", encoding="utf-8").read(), ns)
   ns["COLECCION_EDIFICIO"] = "WEB_Torre"; ns["ESCALA"] = 8.0; ns["SALIDA"] = r"C:\Renders\<carpeta>"
   sys.argv = ["blender", "--", "--solo-mascaras"]
   buf = io.StringIO()
   with contextlib.redirect_stdout(buf):
       ns["main"]()
   result = {"log": buf.getvalue()}
   ```

   Revisar el log: unidades por piso, avisos de objetos que no se pueden cortar o unidades fuera de cuadro.
   Para revisar sin esperar Cycles, cambiar en memoria `scene.render.engine = "BLENDER_EEVEE"`. Si la colección de
   render convive con la separada por pisos (como en `cityh_web_v2.blend`), ocultar **sólo sus mallas**: sus luces
   (el `Sol`) iluminan la escena.

6. **Prueba de look.** `--prueba` (piso de referencia al 25 %), o `--pisos` con un piso bajo, uno medio y uno alto
   para comprobar que la planta no se mueve. Superponer el SVG sobre el webp (PIL: `ImageDraw.polygon` con los
   `points` de cada `data-unidad`), armar una tira comparativa y mostrársela al usuario: tiene que calzar cada
   polígono y no verse nada por encima del corte. Iterar cámara, corte, luz y
   materiales con el usuario **antes** de la tanda completa: la tanda en Cycles tarda.

   Antes de la tanda, una prueba **en Cycles** a baja resolución (25 %, 32 muestras, segundos con GPU): hay
   problemas que EEVEE esconde (volúmenes de niebla que tapan el sol, cajas con material transparente). Desde el
   MCP, un render de más de ~1 minuto corta la llamada por tiempo aunque Blender siga: esperar a que aparezca
   `plantas.json` en la carpeta de salida (se escribe al final) en lugar de relanzar.

7. **Tanda completa.** Con el ok del usuario. Si son muchos pisos, conviene que la corra él (Scripting → Run o
   consola con Blender de blender.org) porque bloquea la interfaz. Nunca mezclar imágenes de dos encuadres.

8. **Cargar y verificar.** `pnpm cargar:plantas "<carpeta con plantas.json>" <slug>` (`src/scripts/cargar-plantas.ts`)
   sube imagen y máscara de cada piso a Media y completa *Edificio → Plantas → Niveles* sin tocar nombre, tipo ni
   POIs. Por defecto saltea los pisos sin unidades (sus POIs están ubicados sobre otra imagen) y **no borra** los
   archivos anteriores; opciones como palabras sueltas: `incluir-especiales`, `borrar-anteriores` (`payload run`
   se come las `--banderas`). Antes de cargar, confirmar que los SVG **no** tengan `data-torre` (en plantas rompe el
   resaltado). Si el script de carga no imprime nada, falta el `await main()` de nivel superior: `payload run`
   termina el proceso apenas importa el archivo. Verificar en el preview (`dev`) `/p/<torre>/<piso>` en **tema claro
   y oscuro**: hover, click a la ficha y colores de disponibilidad. Correr `pnpm typecheck` si se tocó código.

9. Recorrer el checklist de aceptación de la spec (§8) y reportar qué quedó OK y qué no.

## Criterios que no se negocian

- Cámara solidaria al piso: mismo encuadre para todos los niveles; la planta no se mueve al cambiar de piso.
- `viewBox` de la máscara = tamaño en píxeles del render; códigos idénticos a Payload.
- El `.blend` no queda modificado por el script (restaura todo); cualquier cambio del modelo, con permiso.
- Texto de la web y comentarios en castellano rioplatense, como el resto del repo.
