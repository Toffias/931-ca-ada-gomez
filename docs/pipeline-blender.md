# Pipeline Blender → web

Cómo preparar un edificio en Blender para que la plantilla lo muestre con pisos, unidades, vistas y modo noche.
Probado con Blender 5.2. El ejemplo completo es `cityh_web.blend` (Torre Cityh).

## 1. Trabajá sobre una copia para web

El archivo de render (Cycles, materiales procedurales, bruma, árboles con miles de hojas) no sirve tal cual.
Guardá una copia (`<proyecto>_web.blend`) y armá una colección **`WEB`** con sólo lo que va al navegador.

## 2. Escala y orientación

- Ideal: modelar en **metros** (1 unidad = 1 m) y cargar `escala = 1` en el admin.
- Si el modelo viene en otra escala, poné en *Edificio → Modelo 3D → Escala* cuántos metros vale una unidad
  (la Torre Cityh usa 8).
- Z arriba en Blender; el exportador lo convierte a Y arriba.

## 3. Nombres y propiedades personalizadas

Las propiedades se cargan en *Object Properties → Custom Properties* y viajan al `.glb` como *extras*.

| Qué | Nombre del objeto | Propiedades |
|---|---|---|
| Piso del edificio | libre (ej. `Piso_05`) | `tipo = "piso"`, `piso = 5` |
| Techo | libre | `tipo = "techo"` |
| Unidad (depto) | `Unidad_5B` | `tipo = "unidad"`, `unidad = "5B"`, `piso = 5` |
| Cámara de vista | `Cam_Principal`, `Cam_Aerea`… | – |
| Faroles (opcional) | `Faroles` | `luces = [x,y,z, x,y,z, …]` en coordenadas de Blender |

**Unidades:** son cajas (una malla simple por depto) que envuelven el volumen de cada unidad, un poco más grandes
que la fachada. Son invisibles en la web: sirven para detectar el mouse y pintar el estado.
El código (`5B`) es el mismo que se carga en *Payload → Unidades → Código*.

**Pisos:** si el edificio es una sola malla (modificadores Array/Mirror), aplicá los modificadores y separá por altura
(en el ejemplo se hizo con un script por bandas de Z). Hace falta para "abrir" el edificio al elegir un piso.

Otros prefijos que el visor reconoce (se cambian en `src/components/visor/convenciones.ts`):

- `Vecinos*`, `Arboles*`, `Entorno*`: tapan el mouse (no se selecciona una unidad detrás de un edificio vecino).
- `Calzada*`, `Veredas*`, `Demarcacion*`, `Cordones*`, `Parque*`, `Suelo*`: no proyectan sombra.

## 4. Materiales

- Sólo **Principled BSDF** con valores fijos o **texturas de imagen**. Los nodos procedurales (Noise, Voronoi, Brick,
  ColorRamp…) no se exportan: hornealos a imagen o reemplazalos por un color.
- Nombres `WEB_*`. Algunos nombres activan comportamientos de día/noche (`REGLAS_EMISION` en `convenciones.ts`):
  - `…Vidrio_Local…`: vidrio de locales, semitransparente y con brillo cálido de noche.
  - `…Marquesina…`, `…Farol…`: luces que se intensifican de noche.
  - `…Fachada_Vecinos…`: fachadas con textura emisiva de ventanas (sólo de noche).
- El material indicado en *Ventanas encendidas de noche* (por defecto `WEB_Vidrio`) recibe ventanas encendidas al azar
  con un shader; se configuran altura del piso 1, alto de piso y ancho de ventana en metros.

### Texturas en la web

No hace falta hornear texturas de paredes y suelo: el visor aplica revoque, hormigón, piedra, baldosas y asfalto por
proyección triplanar según el **nombre del material** (`TEXTURAS` en `convenciones.ts`: `…Fachada…`, `…Losa…`,
`…Piedra…`, `…Vereda…`, `…Asfalto…`). Alcanza con que el material tenga un nombre que coincida y un color base.

## 5. Peso

- Objetivo: **menos de 10 MB** (el ejemplo pesa 0,4 MB).
- Árboles y vegetación en low-poly; unir por material los objetos del entorno (menos llamadas de dibujo).
- Texturas de 512–2048 px; el exportador comprime la geometría con Draco.

## 6. Exportar

Abrí `scripts/blender/exportar_web.py` en la pestaña *Scripting* y ejecutalo. Valida las convenciones
(códigos repetidos, unidades sin piso, materiales procedurales, cámaras mal nombradas) y exporta
`//web/edificio.glb` junto al `.blend`.

Para los renders de plantas por piso (vista aérea con el edificio cortado + máscara SVG de unidades) ver
[`renders-plantas.md`](renders-plantas.md).

Después: *Admin → Edificios → Modelo 3D* → subir el `.glb`. Las unidades nuevas se cargan en *Unidades*
(o con un seed a partir de los extras del modelo, ver `src/seed/index.ts`).
