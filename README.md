# Plantilla edificio 3D · Suris Code

Base para sitios de desarrollos inmobiliarios: **una web por proyecto**, que puede tener varias torres. Recorrido
edificio → piso → unidad con plantas, disponibilidad en fachada, ficha de unidad, consultas, amenities, galería,
recorridos 360, ubicación y un **visor 3D interactivo**. Los datos se administran desde **Payload CMS**.

El objetivo funcional es el spec *Template web interactiva de edificios* (secciones A–Q). Mientras no existan los
renders de Blender, plantas y fachadas se dibujan como **esquemas generados desde el `.glb`** (las cajas `Unidad_*`);
cuando llegan el render y su máscara SVG se cargan en el admin y los mismos componentes los usan.

**Stack:** Next.js 16 · Payload 3.90 · React 19 · React Three Fiber 9 / drei 10 · Three.js 0.186 · Zustand ·
SQLite (local) o PostgreSQL (producción).

## Arranque rápido

```bash
pnpm install
cp .env.example .env        # generá un PAYLOAD_SECRET propio
pnpm seed                   # usuario admin + Torre Cityh de ejemplo (36 unidades)
pnpm dev
```

- Sitio: http://localhost:3000 · Planta: http://localhost:3000/p/torre-cityh/5 · 3D: http://localhost:3000/3d/torre-cityh
- Admin: http://localhost:3000/admin (usuario del `.env`, por defecto `admin@example.com` / `cambiar123`)

`pnpm seed:fresh` borra edificios, tipologías, unidades, amenities, avances, consultas y archivos y vuelve a cargar el
ejemplo. `pnpm test` corre los tests de la geometría de los esquemas (vitest).

## Qué incluye

**Admin (Payload, en español)**

| Sección | Para qué |
|---|---|
| Proyecto → Edificios | Cada torre: textos, **modelo 3D (.glb)**, visor, **niveles especiales con puntos de interés**, renders cenitales y máscaras, vistas por orientación y franja de pisos, portada y galería |
| Proyecto → Tipologías | A1, B1…: superficies, ambientes, extras, foto, planta 3D, galería, recorrido y brochure. La ficha de cada unidad hereda de acá |
| Proyecto → Unidades | Código (igual al del modelo), piso, estado, tipología, precio; los datos vacíos se toman de la tipología |
| Contenido → Proyecto | Marca (logo, colores, tipografía, **tema por defecto**: oscuro, claro o automático; cada visitante lo cambia desde la barra superior y queda guardado en su navegador), **secciones visibles**, contacto, textos legales y de privacidad, intro, vistas del Giro 360, galería, video, ubicación |
| Contenido → Amenities · Recorridos 360 · Avances de obra | Contenido de esas secciones |
| Ventas → Consultas | Leads de "Consultar precio", la ficha y Contacto, con su origen, página e idioma |

Cuando alguien cambia algo en el admin, las páginas se regeneran solas (`src/hooks/revalidar.ts`).

**Sitio** (todas las pantallas comparten un marco con menú lateral, volver, QR de la pantalla con PDF y pantalla completa)

| Pantalla | Ruta |
|---|---|
| Intro | `/` |
| Giro 360 | `/giro/[vista]` |
| Planta de un piso o nivel especial | `/p/[torre]/[piso]` (`?u=5B` resalta una unidad) |
| Ficha de unidad | `/u/[torre]/[codigo]/[pestaña]/[n]` (planta, galeria, vistas, tour) |
| Disponibilidad en fachada | `/disponibilidad/[vista]` |
| Modo 3D | `/3d/[torre]` (`/edificios/[slug]` redirige acá) |
| Amenities, Galería, Recorridos | `/amenities/[slug]/[n]`, `/galeria/[n]`, `/recorridos/[slug]/[punto]` |
| Video, Avance de obra, Ubicación, Contacto | `/video`, `/obra`, `/ubicacion/[info o ilustrado]`, `/contacto` |

La disponibilidad se sirve aparte en `/api/disponibilidad` y el sitio la refresca cada minuto. Las secciones apagadas en
el admin (o sin contenido) desaparecen del menú y dan 404.

**Renders y máscaras.** Cada vista acepta un render y una máscara SVG con el mismo `viewBox`, con un
`<path data-unidad="5B">` por unidad (o `data-torre="slug"`, `data-poi="clave"`). Sin eso se usa el esquema:
`src/lib/esquemas/` (planta y fachada desde el `.glb`); `src/lib/escenas.ts` decide cuál usar.

**Modo 3D** (`/3d/[torre]`), el visor Three.js:
  - órbita con límites, vistas tomadas de las cámaras de Blender;
  - hover y clic sobre unidades, el mismo popup que en planta y fachada (Ingresar → ficha);
  - lista de pisos: al elegir uno, los de arriba se vuelven translúcidos;
  - filtros por dormitorios y "sólo disponibles", "colorear edificio" por estado;
  - día/noche con ventanas encendidas, faroles, bañadores de fachada y bloom;
  - responsive (panel inferior en celulares).

**Texturas realistas.** Revoque, hormigón, piedra, baldosa de vereda y asfalto se aplican por proyección
triplanar según la posición en el mundo, así que el modelo no necesita UVs. Suman relieve, rugosidad, variación a gran
escala y desgaste (suciedad en la base y chorreados bajo cada losa). Qué material usa cada textura se define en
`TEXTURAS` dentro de `components/visor/convenciones.ts` (`escala` = metros por tile). Se apagan por edificio
desde el admin (*Modelo 3D → Texturas realistas*).

El visor se carga con `next/dynamic` (sin SSR) sólo en `/3d`: el resto del sitio no descarga Three.js
(Photo Sphere Viewer, que trae su propio Three, sólo se baja en los recorridos 360).

### Texturas

Fotos escaneadas de [Poly Haven](https://polyhaven.com), licencia **CC0** (dominio público: uso comercial libre, sin
atribución obligatoria; igual las citamos). En `public/texturas/<material>/`: `color.jpg` (sRGB), `normal.jpg`
(convención OpenGL, la de Three.js) y `rugosidad.jpg` (grises), 1024 px, repiten sin costuras; ~3 MB en total.

| Material | Asset | Tile | Autores |
|---|---|---|---|
| revoque | [painted_plaster_wall](https://polyhaven.com/a/painted_plaster_wall) | 2 m | Amal Kumar |
| hormigon | [concrete_wall_008](https://polyhaven.com/a/concrete_wall_008) | 2,71 m | Charlotte Baglioni, Dario Barresi |
| piedra | [granite_tile](https://polyhaven.com/a/granite_tile) | 2,3 m | Charlotte Baglioni |
| baldosa | [large_square_pattern_01](https://polyhaven.com/a/large_square_pattern_01) | 3 m | Rob Tuytel |
| asfalto | [asphalt_02](https://polyhaven.com/a/asphalt_02) | 3 m | Rob Tuytel |

- Se bajan en 1K (color, `nor_gl`, rugosidad) y se convierten con `python scripts/texturas/importar_polyhaven.py`
  (`--crudo <carpeta>` si ya tenés los PNG). Para cambiar un material, editá `SETS` en ese script y la `escala` en
  `TEXTURAS` con las dimensiones de la ficha del asset.
- El color de revoque y hormigón está calibrado a un tono neutro (ganancia por canal en lineal, conserva el detalle):
  el `tinte` de cada regla define el color final de la fachada.
- Respaldo procedural (incluye la baldosa de 9 panes) en `public/texturas-procedurales/`, generado con
  `python scripts/texturas/generar.py`. Para volver a usar una, apuntá `carpeta` a `/texturas-procedurales/<material>`.
  Esa carpeta no la usa el visor: se puede sacar de `public/` antes de un deploy.

## Estructura

```
src/
  collections/        Edificios, Tipologias, Unidades, Amenities, Recorridos, AvancesDeObra, Consultas, Media, Users
  globals/Sitio.ts    datos del proyecto (marca, secciones, contacto, textos, intro, giro, ubicación)
  hooks/revalidar.ts  regenerar páginas al editar
  seed/               datos y assets de ejemplo (torre-cityh.glb, renders)
  lib/                datos (Payload → props), escenas, esquemas (geometría desde el .glb), rutas, idiomas, navegación, store
  textos/             textos fijos del sitio: es.ts (referencia) y en.ts
  proxy.ts            idioma por URL (/en/…), cookie y Accept-Language
  app/(frontend)/     estilos, server action de consultas, /api/disponibilidad
  app/(frontend)/[idioma]/        layout raíz (un árbol por idioma)
  app/(frontend)/[idioma]/(app)/  todas las pantallas, dentro del marco de navegación
  app/(payload)/      admin y API de Payload (generado)
  components/escena/  VisorEscena: render o esquema + formas clickeables (planta, fachada, giro, mapa)
  components/proyecto/  pantallas (planta, ficha, giro, fachada, galerías, obra, recorridos), marco, consulta, QR
  components/visor/   escena R3F: Visor, Modelo, Ambiente, ControlCamara, store, convenciones
  components/ui/      UnitPopover, Galeria, Modal, Icono, PanelPisos, BarraVistas
scripts/blender/      exportar_web.py (valida convenciones y exporta el GLB)
scripts/texturas/     importar_polyhaven.py (texturas CC0) y generar.py (procedurales de respaldo)
public/texturas/      revoque, hormigon, piedra, baldosa, asfalto (color / normal / rugosidad)
public/texturas-procedurales/  respaldo procedural con la misma estructura
docs/                 pipeline-blender.md
public/draco/         decodificador Draco (sin depender de CDNs)
```

## Nuevo proyecto con esta plantilla

Este repo es un **template repository** de GitHub. Para arrancar un desarrollo nuevo:

1. En GitHub, **Use this template → Create a new repository** (privado) y clonalo.
2. `pnpm install` y creá el `.env` desde `.env.example` con un `PAYLOAD_SECRET` nuevo, la base y la URL del sitio.
   Cambiá `name` y `description` en `package.json`.
3. **Blender:** prepará la copia web del modelo siguiendo [`docs/pipeline-blender.md`](docs/pipeline-blender.md)
   y exportá con `scripts/blender/exportar_web.py`. Si usa otros nombres, ajustá `components/visor/convenciones.ts`.
4. **Seed:** reemplazá la Torre Cityh de `src/seed/` por el proyecto real (o usala sólo como demo) y corré `pnpm seed`.
5. **Admin → Proyecto:** nombre, logo, colores, tipografía, tema por defecto, secciones, contacto y textos.
6. **Admin → Edificios:** uno por torre; subir el `.glb` y un render de portada; ajustar escala, sol y vistas;
   agregar niveles especiales (planta baja, amenities, rooftop) con sus puntos de interés.
7. **Admin → Tipologías y Unidades:** una unidad por cada `Unidad_<código>` del modelo.
8. Completá la sección **Este proyecto** de [`CLAUDE.md`](CLAUDE.md) con lo que se definió (torres, secciones,
   hosting, particularidades del cliente).

La lista completa de lo que hay que configurar, y las convenciones del código, están en [`CLAUDE.md`](CLAUDE.md):
es la guía que lee la IA, pero sirve igual para personas.

## Producción

- **Base de datos:** `DATABASE_URL=postgres://…` (se detecta sola). Para levantar una local: `docker compose up -d`.
  En Postgres, antes del primer deploy: `pnpm payload migrate:create` y en el deploy `pnpm payload migrate`.
- **Archivos:** en local se guardan en `/media`. En producción usá un storage externo (plugin oficial de S3 / R2 /
  Vercel Blob de Payload) porque los servidores sin disco persistente los pierden.
- **Build:** `pnpm build` necesita acceso a la base (pre-renderiza la home). `pnpm start` para servir.
- **Email:** configurá un adaptador de email de Payload si querés avisos de nuevas consultas (hoy los leads sólo se
  guardan en Payload; el email al equipo comercial y el webhook a CRM quedan para una etapa siguiente).

## Límites conocidos y próximos pasos

- La iluminación es en tiempo real; para acercarse al render de Cycles, hornear luz/AO en Blender (UVs limpias).
- El modelo de ejemplo es simple: para un proyecto comercial conviene más detalle (balcones, carpinterías, planta baja).
- Pendiente, necesita assets de Blender: renders del Giro con videos de transición, cenitales por planta tipo,
  máscaras SVG, plantas 3D por tipología y panoramas 360 (el `generar_assets.py` del spec).
- Pendiente, por código: mapa interactivo en Ubicación, email y CRM para los leads, analítica configurable por proyecto,
  contenido del admin en inglés (localización de campos de Payload; hoy sólo se traducen los textos fijos).
- `pnpm lint` falla por una dependencia faltante (`@eslint/eslintrc`); ya pasaba antes de esta etapa.

Los datos y el edificio de ejemplo son ficticios.
