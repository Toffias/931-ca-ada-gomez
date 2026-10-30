# CLAUDE.md

Guía para trabajar en este repo con IA. Es un **template repository**: cada proyecto inmobiliario nuevo se crea desde
acá ("Use this template" en GitHub) y se configura con la checklist de abajo. Lo general del stack está en
[`README.md`](README.md); acá van las decisiones y convenciones propias de la plantilla.

## Qué es (y qué no)

- **Una web = un proyecto inmobiliario**, que puede tener **varias torres** (colección `Edificios`). No es
  multi-tenant: no agregar selección de proyecto, dominios por cliente ni nada parecido.
- Referencia funcional: spec *Template web interactiva de edificios* (pantallas A–Q), calcado de Ipanema Residences
  y Cetri 5ta Avenida.
- **Etapa 1 (hecha): todo lo que se resuelve por código, sin renders.** Donde el spec pide un render, el componente
  acepta la imagen + máscara SVG del admin y, si no hay, dibuja un **esquema generado desde el `.glb`**
  (`src/lib/esquemas/`, elegido en `src/lib/escenas.ts`). Al llegar los renders se cambia el fondo, no el componente.
- Ubicación: mapa y Street View de Google como **iframes de "Insertar un mapa", sin API key** (el admin pega el
  código; `src/lib/google-maps.ts` sólo acepta `www.google.com/maps/embed`). *Búsquedas de cercanías*
  ("supermercado cerca de <dirección>", un chip cada una) con la **Maps Embed API**: necesitan
  `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` (pública, restringida por dominio) y sin ella no aparecen. La lista de
  cercanías del panel sigue curada en el admin, sin Places API. Las mismas vistas están en la ficha (modo Ubicación).
- Leads: se guardan en Payload (colección `Consultas`) y cada una se avisa por mail (`src/lib/aviso-consulta.ts`,
  vía `after()`) a *Proyecto → Contacto → Emails que reciben las consultas* (o al email de contacto). Mails con
  **Resend** si hay `RESEND_API_KEY`; si no, `src/lib/email-consola.ts` los imprime en la consola del server.
- Blog (colección `Articulos`, con borradores, y `Autores`): lo carga el cliente para SEO/GEO. `/blog` y `/blog/<slug>` se dibujan
  enteros en el servidor con canonical/hreflang, Open Graph y JSON-LD (`BlogPosting`, `BreadcrumbList`, `FAQPage`,
  en `src/lib/datos-estructurados.ts`). También van al sitemap y a `/llms.txt`; `robots.ts` deja pasar a los
  rastreadores de IA. Como las demás secciones, se apaga en *Secciones visibles* y sin notas publicadas no aparece.
- Fuera de alcance por ahora: mapa interactivo con API de Google (estilo por tema, pins propios), CRM de leads,
  mail de confirmación al visitante, analítica, storage externo, `generar_assets.py`.

## Comandos

```bash
pnpm dev                 # http://localhost:3000 · admin en /admin
pnpm seed                # admin del .env + Torre Cityh de ejemplo (no pisa lo existente)
pnpm seed:fresh          # borra contenido y vuelve a cargar el ejemplo
pnpm exportar:snapshot   # foto del contenido actual (base + archivos) en snapshot/
pnpm seed:snapshot       # la carga en la base de DATABASE_URL (con "fresh" reemplaza lo que haya)
pnpm typecheck           # correr siempre después de cambios
pnpm test                # vitest: geometría de los esquemas
pnpm generate:types      # después de tocar colecciones/globals → actualiza src/payload-types.ts
pnpm generate:importmap  # si se agregan componentes custom al admin
pnpm payload run <archivo.ts>   # scripts sueltos contra la base (borrarlos después)
```

`pnpm lint` falla por `@eslint/eslintrc` faltante (conocido). En el panel de preview el server se llama `dev`
(`.claude/launch.json`).

## Convenciones de código

- **Código en castellano**: nombres de archivos, componentes, variables, clases CSS y labels del admin.
  Rioplatense en la UI ("Consultá", "Elegí").
- **Sitio en castellano e inglés** (idiomas en `src/lib/idiomas.ts`). El de defecto va sin prefijo (`/giro/0`) y el
  resto con el suyo (`/en/giro/0`); `src/proxy.ts` reescribe a `app/(frontend)/[idioma]/…`, recuerda la elección en
  una cookie y, la primera vez, sigue al navegador. **Ningún texto fijo en los componentes**: todo va en
  `src/textos/es.ts` y su par `en.ts` (el tipo `Textos` obliga a tener las mismas claves). Se leen con
  `useTextos()` / `useIdioma()` en cliente (`components/ui/ProveedorIdioma`) y `textosServidor()` /
  `idiomaActual()` en el servidor (`src/lib/idioma-servidor.ts`, vía `next/root-params`). Server Actions y Route
  Handlers no ven el idioma: se manda explícito (campo oculto `idioma` en el formulario de consulta) y, si leen
  contenido del admin, se envuelven con `enIdioma(idioma, …)` (como `/api/folleto`).
  Precios, fechas y medidas con `LOCALE[idioma]` (`src/lib/formato.ts`). Datos sin nombre en el admin (niveles,
  vistas) se rotulan en la pantalla con `src/lib/etiquetas.ts`, no en `datos.ts`/`escenas.ts`.
- **Contenido del admin traducible** (localización de Payload, `src/lib/localizacion.ts`, idiomas = `IDIOMAS`):
  el admin tiene un selector de idioma arriba y cada texto visible en la web (nombres, descripciones, epígrafes,
  etiquetas, textos legales, brochures) se carga por idioma con `localized: true`. Lo que falta en inglés se
  muestra en castellano (fallback). `datos.ts` lee todo con `locale: await idiomaActual()`. Un campo traducible
  obligatorio no lleva `required` (exigiría completarlo en cada idioma y pone NOT NULL en `_locales`): va
  `validate: obligatorioEnDefecto`. No se traducen códigos, slugs, direcciones, nombres propios (proyecto, torres,
  lugares de cercanías), la orientación de las unidades (se usa para cruzar con las vistas) ni los emails.
  Campo que pasa a traducible = migración que copie lo existente a `<tabla>_locales` antes de borrar la columna
  (ver `src/migrations/20260929_193113_idiomas_contenido.ts`); la generada por Payload lo pierde.
- CSS **a mano**, sin Tailwind ni CSS-in-JS: `src/app/(frontend)/estilos.css` (tokens, base, visor), `sitio.css`
  (pantallas), `blog.css` (listado y nota del blog) y `landing.css` (El proyecto y Amenities: páginas con scroll; el movimiento sale de la variable `--p`
  que escribe `components/landing/Desplazamiento`, sin librerías de animación). Clases en castellano (`.ficha-etiqueta`, `.boton-icono`). Breakpoints: 1100 px y **820 px** (celular).
- **Colores sólo con tokens** (`var(--texto)`, `var(--superficie)`, `rgb(var(--tinta) / .08)`…), nunca hex/rgba
  sueltos en la UI, porque hay tema claro y oscuro. Excepción: lo que va encima de fotos o video usa colores fijos
  (`--texto-imagen`).
- Tema: `<html data-tema="claro|oscuro" data-tema-defecto="…">`. El admin elige el default
  (*Proyecto → Marca → Tema por defecto*: oscuro, claro, automático); el visitante lo alterna y queda en
  `localStorage`. El script anti-destello está en `src/lib/tema.ts`. Probar todo cambio visual **en ambos temas**.
- Datos: siempre a través de `src/lib/datos.ts` (Payload → props planas con `cache()`), tipos en `src/lib/tipos.ts`.
  Rutas armadas con `useRutas()` / `rutasServidor()` (`src/lib/rutas.ts`, ya llevan el prefijo del idioma), nunca
  strings a mano.
- Al editar en el admin, las páginas se revalidan con `src/hooks/revalidar.ts`: toda colección/global nueva que
  afecte al sitio tiene que engancharlo.
- La disponibilidad (estado/precio) se sirve aparte en `/api/disponibilidad` y se refresca en cliente. Nunca mandar
  precios marcados como ocultos al navegador.
- Links que llevan "más adentro" del edificio (Intro → Plantas, Giro → Plantas, planta → ficha/amenity/tour) usan
  `components/ui/EnlaceProfundo` (zoom hacia el enlace, `src/lib/transiciones.ts`); volver y el logo usan
  `tipo="salir"`. Girar entre fachadas en Disponibilidad usa `tipo="izquierda"|"derecha"` (sólo rota el
  lienzo, como las caras de un prisma). Los demás cambios laterales (otro piso, otra foto) quedan con `Link` común.
- Three.js sólo se carga en `/3d` (`next/dynamic`, sin SSR). No importar nada de `components/visor` en otras pantallas.
- Comentarios breves, en castellano, explicando el porqué.

## Contrato con el modelo 3D (Blender → `.glb`)

Detalle en [`docs/pipeline-blender.md`](docs/pipeline-blender.md); nombres configurables en
`src/components/visor/convenciones.ts`.

- Unidades: cajas `Unidad_<código>` con extras `tipo="unidad"`, `unidad="5B"`, `piso=5`. El código tiene que ser
  **idéntico** al de *Payload → Unidades* (único por torre).
- Pisos con extras `tipo="piso"`, `piso=N`; techo `tipo="techo"`; cámaras `Cam_*`; faroles en `Faroles`.
- Materiales `WEB_*`; sus nombres activan texturas (`TEXTURAS`) y emisión día/noche (`REGLAS_EMISION`).
- Z arriba en Blender (el exportador pasa a Y arriba). Escala en *Edificio → Modelo 3D → Escala* (metros por unidad).
- Máscaras SVG de renders: mismo `viewBox` que la imagen, `<path data-unidad="5B">` / `data-torre="slug"` /
  `data-poi="clave"`.
- Renders de plantas por piso (vista aérea cortada, cámara que sube con el piso) + máscaras: spec en
  [`docs/renders-plantas.md`](docs/renders-plantas.md), script `scripts/blender/renders_plantas.py`, skill
  `renders-plantas`.
- Tomas fijas de Disponibilidad (render + máscara de unidades visibles, desde varios ángulos): spec en
  [`docs/renders-fachadas.md`](docs/renders-fachadas.md), script `scripts/blender/renders_fachadas.py`, carga con
  `pnpm cargar:fachadas`. Interior genérico de arranque (núcleo + 4 unidades en espejo): `scripts/blender/interior_tipo.py`.
- Recorrido 360 por tipología, **hiperrealista** (panorámicas desde cámaras `Pano_<recorrido>_<punto>` + plano +
  enlaces calculados por visibilidad): spec en [`docs/renders-recorrido.md`](docs/renders-recorrido.md). Orden:
  `interior_tipo.py` → `vestir_interior.py` (materiales con texturas y unidad amueblada; assets de Poly Haven con
  `bajar_assets_interior.py`, fuera del repo) → `renders_recorrido.py` (HDRI, sol aparte, vidrio real, luminarias) →
  `pnpm cargar:recorridos`. Procedimiento paso a paso y errores a no repetir: skill `recorrido-360`. En el visor,
  `rumbo` es hacia dónde mira el centro de la panorámica (desde el norte) y el
  plano va cuadrado y con el norte arriba.

## Proyecto nuevo desde esta plantilla — qué configurar

Cuando el usuario arranca un proyecto nuevo, recorrer esta lista y preguntar lo que falte. Marcar en la sección
**Este proyecto** de abajo lo que ya quedó definido.

1. **Repo y entorno**
   - `package.json`: `name` y `description`.
   - `.env` desde `.env.example`: `PAYLOAD_SECRET` nuevo y aleatorio, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`,
     `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` propios. **La IA no lee ni escribe contraseñas**: las carga el usuario.
   - Email: cuenta de Resend con el dominio del cliente verificado; `RESEND_API_KEY`, `EMAIL_REMITENTE`
     (ej. `consultas@dominio.com`) y `EMAIL_REMITENTE_NOMBRE` en el `.env` (los carga el usuario). Sin key, los
     mails (avisos de consultas, reset de contraseña) se imprimen en la consola de `pnpm dev`.
2. **Modelo 3D**: `.glb` exportado con `scripts/blender/exportar_web.py`; si usa otros nombres, ajustar
   `convenciones.ts` (prefijos, reglas de texturas y emisión).
3. **Seed** (`src/seed/index.ts` y `src/seed/assets/`): reemplazar Torre Cityh por el proyecto real o dejarlo sólo
   como demo. El test `src/lib/esquemas/esquemas.test.ts` lee `seed/assets/torre-cityh.glb`: si se borra, apuntarlo
   al `.glb` nuevo.
4. **Admin → Contenido → Proyecto (global `Sitio`)**
   - Marca: nombre, eslogan, logo, color de acento, fondos de tema oscuro y claro, tipografía, **tema por defecto**.
   - Desarrolladora, contacto (teléfono, WhatsApp, email, showroom, horario, motivos de consulta).
   - **Secciones visibles** (disponibilidad, amenities, recorridos, galería, video, obra, ubicación, modo 3D, blog).
   - Textos: descripción, legal/disclaimer, política de privacidad, brochure.
   - Intro (video/póster), vistas del Giro 360 (render + máscara + videos de transición), video, ubicación.
5. **Admin → Edificios**: uno por torre (slug = parámetro de la URL), `.glb`, escala, sol, vistas, niveles
   especiales con puntos de interés, renders cenitales y máscaras, vistas por orientación y franja de pisos.
6. **Admin → Tipologías y Unidades**: una unidad por cada `Unidad_<código>` del modelo.
7. **Contenido**: Amenities, Recorridos 360 (propio con panoramas o iframe externo), Avances de obra, notas del Blog.
8. **Idiomas**: por defecto castellano + inglés. Si el cliente no quiere inglés, dejar sólo `'es'` en `IDIOMAS`
   (`src/lib/idiomas.ts`); si pide otro, sumarlo ahí, en `LOCALE` y con su diccionario en `src/textos/`. El admin
   toma los mismos idiomas: cambiarlos cambia el enum `_locales` de la base (migración). Revisar que el tono de
   `en.ts` le sirva al cliente y cargar en el admin la versión en inglés de los textos (selector de idioma arriba
   de cada documento; lo que quede vacío se ve en castellano).
9. **Estilo**: si el cliente pide algo que no sale del admin, tocar tokens en `estilos.css` (ambos temas).
10. **Producción**: Postgres (`DATABASE_URL=postgres://…` + migraciones), storage externo para `/media`,
   dominio en `NEXT_PUBLIC_SITE_URL`. Ver "Producción" en el README.

## Este proyecto

Completar al crear un proyecto desde la plantilla (en el repo template queda así):

- Proyecto: *Cañada de Gómez 931* (Male Group S.A.). Material del cliente en `docs/referencias/`, plan en
  [`docs/plan-renders-931.md`](docs/plan-renders-931.md). Fases A, B y C hechas: seed con sus renders, el modelo de
  Blender (`scripts/blender/modelar_ca931.py` → `blender/ca931_web.blend`, fuera del repo) con cámaras `Ref_*`
  calzadas sobre las fotos, Disponibilidad sobre las fotos, plantas por piso, noche y recorridos 360 por tipología
  (`recorrido_ca931.py`). En Blender se trabaja con `scripts/blender/sesion_ca931.py`.
- Torres: `canada-de-gomez-931` (PB + 4 pisos entre medianeras; unidades `PB`, `1A`…`4A` 3 amb, `1B`…`4B` 2 amb)
- Tema por defecto: oscuro
- Idiomas: castellano (defecto) e inglés
- Secciones apagadas: amenities, video, obra, ubicación y blog (sin material todavía); recorridos se prende sola si
  el seed trae panorámicas
- Producción (hosting, base, storage, dominio): VPS Hostinger (pm2 `constructoras`, puerto 3003), Postgres local,
  `media/` en disco del VPS, `https://constructoras.apzsoftware.online`. Deploy por GitHub Actions y contenido con
  `scripts/deploy/subir-snapshot.sh`: ver [`docs/deploy.md`](docs/deploy.md).
- Particularidades de este cliente: planos corregidos el 29/10 (PB con expansión, termo en placard, azotea) y
  terminaciones interiores que definió el cliente (granito negro, muebles taupe, porcelanato gris piedra, aberturas
  negras): ver *Planos corregidos* y *Terminaciones interiores* en `docs/plan-renders-931.md`.
