import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Contenido del admin traducible (localización de Payload, src/lib/localizacion.ts): los campos de texto pasan de
// su tabla a <tabla>_locales. Lo generado por Payload borraba las columnas; acá se copian antes al idioma por
// defecto ('es') para no perder lo cargado. El down hace el camino inverso con lo que haya en castellano.

/** tabla → columnas que se mueven a <tabla>_locales */
export const TRADUCIBLES: [string, string[]][] = [
  ['edificios_caracteristicas', ['texto']],
  ['edificios_config3d_vistas', ['etiqueta']],
  ['edificios_niveles_pois', ['etiqueta']],
  ['edificios_niveles', ['nombre']],
  ['edificios_vistas_disponibilidad', ['etiqueta']],
  ['edificios_galeria', ['epigrafe']],
  ['edificios', ['entrega', 'bajada']],
  ['tipologias_galeria', ['epigrafe']],
  ['tipologias', ['titulo', 'nombre', 'descripcion', 'brochure_id']],
  ['amenities_imagenes', ['epigrafe']],
  ['amenities', ['nombre', 'descripcion']],
  ['recorridos_puntos', ['titulo']],
  ['recorridos', ['nombre']],
  ['avances_de_obra_fotos', ['epigrafe']],
  ['avances_de_obra', ['titulo', 'texto']],
  ['media', ['alt']],
  ['sitio_giro', ['etiqueta']],
  ['sitio_galeria', ['epigrafe']],
  ['sitio_ubicacion_busquedas_cercanas', ['nombre']],
  ['sitio_ubicacion_cercanias', ['categoria', 'tiempo']],
  ['sitio', ['eslogan', 'contacto_horario', 'descripcion', 'legal', 'privacidad', 'brochure_id', 'ubicacion_texto']],
]

const columnas = (cs: string[]) => cs.map((c) => `"${c}"`).join(', ')

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('es', 'en');
  CREATE TABLE "edificios_caracteristicas_locales" (
  	"texto" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_config3d_vistas_locales" (
  	"etiqueta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_niveles_pois_locales" (
  	"etiqueta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_niveles_locales" (
  	"nombre" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_vistas_disponibilidad_locales" (
  	"etiqueta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_galeria_locales" (
  	"epigrafe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "edificios_locales" (
  	"entrega" varchar,
  	"bajada" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "tipologias_galeria_locales" (
  	"epigrafe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "tipologias_locales" (
  	"titulo" varchar,
  	"nombre" varchar,
  	"descripcion" varchar,
  	"brochure_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "amenities_imagenes_locales" (
  	"epigrafe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "amenities_locales" (
  	"nombre" varchar,
  	"descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "recorridos_puntos_locales" (
  	"titulo" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "recorridos_locales" (
  	"nombre" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "avances_de_obra_fotos_locales" (
  	"epigrafe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "avances_de_obra_locales" (
  	"titulo" varchar,
  	"texto" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "media_locales" (
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  CREATE TABLE "sitio_giro_locales" (
  	"etiqueta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "sitio_galeria_locales" (
  	"epigrafe" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "sitio_ubicacion_busquedas_cercanas_locales" (
  	"nombre" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "sitio_ubicacion_cercanias_locales" (
  	"categoria" varchar,
  	"tiempo" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  CREATE TABLE "sitio_locales" (
  	"eslogan" varchar,
  	"contacto_horario" varchar,
  	"descripcion" varchar,
  	"legal" varchar DEFAULT 'Imágenes ilustrativas, no contractuales. Precios y disponibilidad sujetos a cambios.',
  	"privacidad" varchar,
  	"brochure_id" integer,
  	"ubicacion_texto" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  ALTER TABLE "tipologias" DROP CONSTRAINT "tipologias_brochure_id_media_id_fk";
  ALTER TABLE "sitio" DROP CONSTRAINT "sitio_brochure_id_media_id_fk";
  DROP INDEX "tipologias_brochure_idx";
  DROP INDEX "sitio_brochure_idx";
  ALTER TABLE "sitio_texts" ADD COLUMN "locale" "_locales";
  ALTER TABLE "edificios_caracteristicas_locales" ADD CONSTRAINT "edificios_caracteristicas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_caracteristicas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_config3d_vistas_locales" ADD CONSTRAINT "edificios_config3d_vistas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_config3d_vistas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_niveles_pois_locales" ADD CONSTRAINT "edificios_niveles_pois_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_niveles_pois"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_niveles_locales" ADD CONSTRAINT "edificios_niveles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_niveles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_vistas_disponibilidad_locales" ADD CONSTRAINT "edificios_vistas_disponibilidad_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_vistas_disponibilidad"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_galeria_locales" ADD CONSTRAINT "edificios_galeria_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_galeria"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_locales" ADD CONSTRAINT "edificios_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tipologias_galeria_locales" ADD CONSTRAINT "tipologias_galeria_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tipologias_galeria"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tipologias_locales" ADD CONSTRAINT "tipologias_locales_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias_locales" ADD CONSTRAINT "tipologias_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tipologias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "amenities_imagenes_locales" ADD CONSTRAINT "amenities_imagenes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."amenities_imagenes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "amenities_locales" ADD CONSTRAINT "amenities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recorridos_puntos_locales" ADD CONSTRAINT "recorridos_puntos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recorridos_puntos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recorridos_locales" ADD CONSTRAINT "recorridos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recorridos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avances_de_obra_fotos_locales" ADD CONSTRAINT "avances_de_obra_fotos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."avances_de_obra_fotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avances_de_obra_locales" ADD CONSTRAINT "avances_de_obra_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."avances_de_obra"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_giro_locales" ADD CONSTRAINT "sitio_giro_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio_giro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_galeria_locales" ADD CONSTRAINT "sitio_galeria_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio_galeria"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_ubicacion_busquedas_cercanas_locales" ADD CONSTRAINT "sitio_ubicacion_busquedas_cercanas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio_ubicacion_busquedas_cercanas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_ubicacion_cercanias_locales" ADD CONSTRAINT "sitio_ubicacion_cercanias_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio_ubicacion_cercanias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_locales" ADD CONSTRAINT "sitio_locales_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_locales" ADD CONSTRAINT "sitio_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "edificios_caracteristicas_locales_locale_parent_id_unique" ON "edificios_caracteristicas_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_config3d_vistas_locales_locale_parent_id_unique" ON "edificios_config3d_vistas_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_niveles_pois_locales_locale_parent_id_unique" ON "edificios_niveles_pois_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_niveles_locales_locale_parent_id_unique" ON "edificios_niveles_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_vistas_disponibilidad_locales_locale_parent_id_uni" ON "edificios_vistas_disponibilidad_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_galeria_locales_locale_parent_id_unique" ON "edificios_galeria_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "edificios_locales_locale_parent_id_unique" ON "edificios_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "tipologias_galeria_locales_locale_parent_id_unique" ON "tipologias_galeria_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tipologias_brochure_idx" ON "tipologias_locales" USING btree ("brochure_id","_locale");
  CREATE UNIQUE INDEX "tipologias_locales_locale_parent_id_unique" ON "tipologias_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "amenities_imagenes_locales_locale_parent_id_unique" ON "amenities_imagenes_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "amenities_locales_locale_parent_id_unique" ON "amenities_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "recorridos_puntos_locales_locale_parent_id_unique" ON "recorridos_puntos_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "recorridos_locales_locale_parent_id_unique" ON "recorridos_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "avances_de_obra_fotos_locales_locale_parent_id_unique" ON "avances_de_obra_fotos_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "avances_de_obra_locales_locale_parent_id_unique" ON "avances_de_obra_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sitio_giro_locales_locale_parent_id_unique" ON "sitio_giro_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sitio_galeria_locales_locale_parent_id_unique" ON "sitio_galeria_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sitio_ubicacion_busquedas_cercanas_locales_locale_parent_id_" ON "sitio_ubicacion_busquedas_cercanas_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sitio_ubicacion_cercanias_locales_locale_parent_id_unique" ON "sitio_ubicacion_cercanias_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sitio_brochure_idx" ON "sitio_locales" USING btree ("brochure_id","_locale");
  CREATE UNIQUE INDEX "sitio_locales_locale_parent_id_unique" ON "sitio_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "sitio_texts_locale_parent" ON "sitio_texts" USING btree ("locale","parent_id");`)

  for (const [tabla, cs] of TRADUCIBLES) {
    await db.execute(
      sql.raw(
        `INSERT INTO "${tabla}_locales" (${columnas(cs)}, "_locale", "_parent_id") SELECT ${columnas(cs)}, 'es', "id" FROM "${tabla}"`,
      ),
    )
  }
  // los motivos del formulario (text hasMany) quedan en castellano; los emails de avisos no se traducen
  await db.execute(sql`UPDATE "sitio_texts" SET "locale" = 'es' WHERE "path" = 'contacto.motivos'`)

  await db.execute(sql`
  ALTER TABLE "edificios_caracteristicas" DROP COLUMN "texto";
  ALTER TABLE "edificios_config3d_vistas" DROP COLUMN "etiqueta";
  ALTER TABLE "edificios_niveles_pois" DROP COLUMN "etiqueta";
  ALTER TABLE "edificios_niveles" DROP COLUMN "nombre";
  ALTER TABLE "edificios_vistas_disponibilidad" DROP COLUMN "etiqueta";
  ALTER TABLE "edificios_galeria" DROP COLUMN "epigrafe";
  ALTER TABLE "edificios" DROP COLUMN "entrega";
  ALTER TABLE "edificios" DROP COLUMN "bajada";
  ALTER TABLE "tipologias_galeria" DROP COLUMN "epigrafe";
  ALTER TABLE "tipologias" DROP COLUMN "titulo";
  ALTER TABLE "tipologias" DROP COLUMN "nombre";
  ALTER TABLE "tipologias" DROP COLUMN "descripcion";
  ALTER TABLE "tipologias" DROP COLUMN "brochure_id";
  ALTER TABLE "amenities_imagenes" DROP COLUMN "epigrafe";
  ALTER TABLE "amenities" DROP COLUMN "nombre";
  ALTER TABLE "amenities" DROP COLUMN "descripcion";
  ALTER TABLE "recorridos_puntos" DROP COLUMN "titulo";
  ALTER TABLE "recorridos" DROP COLUMN "nombre";
  ALTER TABLE "avances_de_obra_fotos" DROP COLUMN "epigrafe";
  ALTER TABLE "avances_de_obra" DROP COLUMN "titulo";
  ALTER TABLE "avances_de_obra" DROP COLUMN "texto";
  ALTER TABLE "media" DROP COLUMN "alt";
  ALTER TABLE "sitio_giro" DROP COLUMN "etiqueta";
  ALTER TABLE "sitio_galeria" DROP COLUMN "epigrafe";
  ALTER TABLE "sitio_ubicacion_busquedas_cercanas" DROP COLUMN "nombre";
  ALTER TABLE "sitio_ubicacion_cercanias" DROP COLUMN "categoria";
  ALTER TABLE "sitio_ubicacion_cercanias" DROP COLUMN "tiempo";
  ALTER TABLE "sitio" DROP COLUMN "eslogan";
  ALTER TABLE "sitio" DROP COLUMN "contacto_horario";
  ALTER TABLE "sitio" DROP COLUMN "descripcion";
  ALTER TABLE "sitio" DROP COLUMN "legal";
  ALTER TABLE "sitio" DROP COLUMN "privacidad";
  ALTER TABLE "sitio" DROP COLUMN "brochure_id";
  ALTER TABLE "sitio" DROP COLUMN "ubicacion_texto";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "edificios_caracteristicas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_config3d_vistas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_niveles_pois_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_niveles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_vistas_disponibilidad_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_galeria_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "edificios_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tipologias_galeria_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tipologias_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "amenities_imagenes_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "amenities_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recorridos_puntos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "recorridos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "avances_de_obra_fotos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "avances_de_obra_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sitio_giro_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sitio_galeria_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sitio_ubicacion_busquedas_cercanas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sitio_ubicacion_cercanias_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sitio_locales" DISABLE ROW LEVEL SECURITY;
  DROP INDEX "sitio_texts_locale_parent";
  ALTER TABLE "edificios_caracteristicas" ADD COLUMN "texto" varchar;
  ALTER TABLE "edificios_config3d_vistas" ADD COLUMN "etiqueta" varchar;
  ALTER TABLE "edificios_niveles_pois" ADD COLUMN "etiqueta" varchar;
  ALTER TABLE "edificios_niveles" ADD COLUMN "nombre" varchar;
  ALTER TABLE "edificios_vistas_disponibilidad" ADD COLUMN "etiqueta" varchar;
  ALTER TABLE "edificios_galeria" ADD COLUMN "epigrafe" varchar;
  ALTER TABLE "edificios" ADD COLUMN "entrega" varchar;
  ALTER TABLE "edificios" ADD COLUMN "bajada" varchar;
  ALTER TABLE "tipologias_galeria" ADD COLUMN "epigrafe" varchar;
  ALTER TABLE "tipologias" ADD COLUMN "titulo" varchar;
  ALTER TABLE "tipologias" ADD COLUMN "nombre" varchar;
  ALTER TABLE "tipologias" ADD COLUMN "descripcion" varchar;
  ALTER TABLE "tipologias" ADD COLUMN "brochure_id" integer;
  ALTER TABLE "amenities_imagenes" ADD COLUMN "epigrafe" varchar;
  ALTER TABLE "amenities" ADD COLUMN "nombre" varchar;
  ALTER TABLE "amenities" ADD COLUMN "descripcion" varchar;
  ALTER TABLE "recorridos_puntos" ADD COLUMN "titulo" varchar;
  ALTER TABLE "recorridos" ADD COLUMN "nombre" varchar;
  ALTER TABLE "avances_de_obra_fotos" ADD COLUMN "epigrafe" varchar;
  ALTER TABLE "avances_de_obra" ADD COLUMN "titulo" varchar;
  ALTER TABLE "avances_de_obra" ADD COLUMN "texto" varchar;
  ALTER TABLE "media" ADD COLUMN "alt" varchar;
  ALTER TABLE "sitio_giro" ADD COLUMN "etiqueta" varchar;
  ALTER TABLE "sitio_galeria" ADD COLUMN "epigrafe" varchar;
  ALTER TABLE "sitio_ubicacion_busquedas_cercanas" ADD COLUMN "nombre" varchar;
  ALTER TABLE "sitio_ubicacion_cercanias" ADD COLUMN "categoria" varchar;
  ALTER TABLE "sitio_ubicacion_cercanias" ADD COLUMN "tiempo" varchar;
  ALTER TABLE "sitio" ADD COLUMN "eslogan" varchar;
  ALTER TABLE "sitio" ADD COLUMN "contacto_horario" varchar;
  ALTER TABLE "sitio" ADD COLUMN "descripcion" varchar;
  ALTER TABLE "sitio" ADD COLUMN "legal" varchar DEFAULT 'Imágenes ilustrativas, no contractuales. Precios y disponibilidad sujetos a cambios.';
  ALTER TABLE "sitio" ADD COLUMN "privacidad" varchar;
  ALTER TABLE "sitio" ADD COLUMN "brochure_id" integer;
  ALTER TABLE "sitio" ADD COLUMN "ubicacion_texto" varchar;`)

  for (const [tabla, cs] of TRADUCIBLES) {
    const set = cs.map((c) => `"${c}" = l."${c}"`).join(', ')
    await db.execute(
      sql.raw(`UPDATE "${tabla}" t SET ${set} FROM "${tabla}_locales" l WHERE l."_parent_id" = t."id" AND l."_locale" = 'es'`),
    )
  }

  await db.execute(sql`
  DELETE FROM "sitio_texts" WHERE "locale" IS NOT NULL AND "locale" <> 'es';
  DROP TABLE "edificios_caracteristicas_locales" CASCADE;
  DROP TABLE "edificios_config3d_vistas_locales" CASCADE;
  DROP TABLE "edificios_niveles_pois_locales" CASCADE;
  DROP TABLE "edificios_niveles_locales" CASCADE;
  DROP TABLE "edificios_vistas_disponibilidad_locales" CASCADE;
  DROP TABLE "edificios_galeria_locales" CASCADE;
  DROP TABLE "edificios_locales" CASCADE;
  DROP TABLE "tipologias_galeria_locales" CASCADE;
  DROP TABLE "tipologias_locales" CASCADE;
  DROP TABLE "amenities_imagenes_locales" CASCADE;
  DROP TABLE "amenities_locales" CASCADE;
  DROP TABLE "recorridos_puntos_locales" CASCADE;
  DROP TABLE "recorridos_locales" CASCADE;
  DROP TABLE "avances_de_obra_fotos_locales" CASCADE;
  DROP TABLE "avances_de_obra_locales" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "sitio_giro_locales" CASCADE;
  DROP TABLE "sitio_galeria_locales" CASCADE;
  DROP TABLE "sitio_ubicacion_busquedas_cercanas_locales" CASCADE;
  DROP TABLE "sitio_ubicacion_cercanias_locales" CASCADE;
  DROP TABLE "sitio_locales" CASCADE;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "tipologias_brochure_idx" ON "tipologias" USING btree ("brochure_id");
  CREATE INDEX "sitio_brochure_idx" ON "sitio" USING btree ("brochure_id");
  ALTER TABLE "sitio_texts" DROP COLUMN "locale";
  DROP TYPE "public"."_locales";`)
}
