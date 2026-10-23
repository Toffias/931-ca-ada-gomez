import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_articulos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articulos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__articulos_v_published_locale" AS ENUM('es', 'en');
  CREATE TABLE "articulos_preguntas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "articulos_preguntas_locales" (
  	"pregunta" varchar,
  	"respuesta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "articulos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"portada_id" integer,
  	"slug" varchar,
  	"fecha" timestamp(3) with time zone,
  	"autor" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_articulos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "articulos_locales" (
  	"titulo" varchar,
  	"resumen" varchar,
  	"contenido" jsonb,
  	"seo_titulo" varchar,
  	"seo_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articulos_v_version_preguntas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_articulos_v_version_preguntas_locales" (
  	"pregunta" varchar,
  	"respuesta" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_articulos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_portada_id" integer,
  	"version_slug" varchar,
  	"version_fecha" timestamp(3) with time zone,
  	"version_autor" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__articulos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__articulos_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_articulos_v_locales" (
  	"version_titulo" varchar,
  	"version_resumen" varchar,
  	"version_contenido" jsonb,
  	"version_seo_titulo" varchar,
  	"version_seo_descripcion" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "sitio_locales" ALTER COLUMN "legal" DROP DEFAULT;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articulos_id" integer;
  ALTER TABLE "sitio" ADD COLUMN "secciones_blog" boolean DEFAULT true;
  ALTER TABLE "articulos_preguntas" ADD CONSTRAINT "articulos_preguntas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos_preguntas_locales" ADD CONSTRAINT "articulos_preguntas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articulos_preguntas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "articulos" ADD CONSTRAINT "articulos_portada_id_media_id_fk" FOREIGN KEY ("portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articulos_locales" ADD CONSTRAINT "articulos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v_version_preguntas" ADD CONSTRAINT "_articulos_v_version_preguntas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articulos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v_version_preguntas_locales" ADD CONSTRAINT "_articulos_v_version_preguntas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articulos_v_version_preguntas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_parent_id_articulos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articulos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_version_portada_id_media_id_fk" FOREIGN KEY ("version_portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v_locales" ADD CONSTRAINT "_articulos_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articulos_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "articulos_preguntas_order_idx" ON "articulos_preguntas" USING btree ("_order");
  CREATE INDEX "articulos_preguntas_parent_id_idx" ON "articulos_preguntas" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "articulos_preguntas_locales_locale_parent_id_unique" ON "articulos_preguntas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "articulos_portada_idx" ON "articulos" USING btree ("portada_id");
  CREATE UNIQUE INDEX "articulos_slug_idx" ON "articulos" USING btree ("slug");
  CREATE INDEX "articulos_updated_at_idx" ON "articulos" USING btree ("updated_at");
  CREATE INDEX "articulos_created_at_idx" ON "articulos" USING btree ("created_at");
  CREATE INDEX "articulos__status_idx" ON "articulos" USING btree ("_status");
  CREATE UNIQUE INDEX "articulos_locales_locale_parent_id_unique" ON "articulos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articulos_v_version_preguntas_order_idx" ON "_articulos_v_version_preguntas" USING btree ("_order");
  CREATE INDEX "_articulos_v_version_preguntas_parent_id_idx" ON "_articulos_v_version_preguntas" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_articulos_v_version_preguntas_locales_locale_parent_id_uniq" ON "_articulos_v_version_preguntas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_articulos_v_parent_idx" ON "_articulos_v" USING btree ("parent_id");
  CREATE INDEX "_articulos_v_version_version_portada_idx" ON "_articulos_v" USING btree ("version_portada_id");
  CREATE INDEX "_articulos_v_version_version_slug_idx" ON "_articulos_v" USING btree ("version_slug");
  CREATE INDEX "_articulos_v_version_version_updated_at_idx" ON "_articulos_v" USING btree ("version_updated_at");
  CREATE INDEX "_articulos_v_version_version_created_at_idx" ON "_articulos_v" USING btree ("version_created_at");
  CREATE INDEX "_articulos_v_version_version__status_idx" ON "_articulos_v" USING btree ("version__status");
  CREATE INDEX "_articulos_v_created_at_idx" ON "_articulos_v" USING btree ("created_at");
  CREATE INDEX "_articulos_v_updated_at_idx" ON "_articulos_v" USING btree ("updated_at");
  CREATE INDEX "_articulos_v_snapshot_idx" ON "_articulos_v" USING btree ("snapshot");
  CREATE INDEX "_articulos_v_published_locale_idx" ON "_articulos_v" USING btree ("published_locale");
  CREATE INDEX "_articulos_v_latest_idx" ON "_articulos_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_articulos_v_locales_locale_parent_id_unique" ON "_articulos_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articulos_fk" FOREIGN KEY ("articulos_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_articulos_id_idx" ON "payload_locked_documents_rels" USING btree ("articulos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articulos_preguntas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articulos_preguntas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articulos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "articulos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articulos_v_version_preguntas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articulos_v_version_preguntas_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articulos_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_articulos_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "articulos_preguntas" CASCADE;
  DROP TABLE "articulos_preguntas_locales" CASCADE;
  DROP TABLE "articulos" CASCADE;
  DROP TABLE "articulos_locales" CASCADE;
  DROP TABLE "_articulos_v_version_preguntas" CASCADE;
  DROP TABLE "_articulos_v_version_preguntas_locales" CASCADE;
  DROP TABLE "_articulos_v" CASCADE;
  DROP TABLE "_articulos_v_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_articulos_fk";
  
  DROP INDEX "payload_locked_documents_rels_articulos_id_idx";
  ALTER TABLE "sitio_locales" ALTER COLUMN "legal" SET DEFAULT 'Imágenes ilustrativas, no contractuales. Precios y disponibilidad sujetos a cambios.';
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articulos_id";
  ALTER TABLE "sitio" DROP COLUMN "secciones_blog";
  DROP TYPE "public"."enum_articulos_status";
  DROP TYPE "public"."enum__articulos_v_version_status";
  DROP TYPE "public"."enum__articulos_v_published_locale";`)
}
