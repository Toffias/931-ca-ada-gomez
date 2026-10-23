import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Blog: autores como colección (antes texto suelto en cada nota) y categoría de la nota.
// Generada en dos pasadas (drizzle preguntaba si autor_id era un rename) y unida a mano.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "autores_perfiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "autores" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"foto_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "autores_locales" (
  	"cargo" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "articulos_locales" ADD COLUMN "categoria" varchar;
  ALTER TABLE "_articulos_v_locales" ADD COLUMN "version_categoria" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "autores_id" integer;
  ALTER TABLE "autores_perfiles" ADD CONSTRAINT "autores_perfiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "autores" ADD CONSTRAINT "autores_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "autores_locales" ADD CONSTRAINT "autores_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."autores"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "autores_perfiles_order_idx" ON "autores_perfiles" USING btree ("_order");
  CREATE INDEX "autores_perfiles_parent_id_idx" ON "autores_perfiles" USING btree ("_parent_id");
  CREATE INDEX "autores_foto_idx" ON "autores" USING btree ("foto_id");
  CREATE INDEX "autores_updated_at_idx" ON "autores" USING btree ("updated_at");
  CREATE INDEX "autores_created_at_idx" ON "autores" USING btree ("created_at");
  CREATE UNIQUE INDEX "autores_locales_locale_parent_id_unique" ON "autores_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_autores_fk" FOREIGN KEY ("autores_id") REFERENCES "public"."autores"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_autores_id_idx" ON "payload_locked_documents_rels" USING btree ("autores_id");
   ALTER TABLE "articulos" ADD COLUMN "autor_id" integer;
  ALTER TABLE "_articulos_v" ADD COLUMN "version_autor_id" integer;
  ALTER TABLE "articulos" ADD CONSTRAINT "articulos_autor_id_autores_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articulos_v" ADD CONSTRAINT "_articulos_v_version_autor_id_autores_id_fk" FOREIGN KEY ("version_autor_id") REFERENCES "public"."autores"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articulos_autor_idx" ON "articulos" USING btree ("autor_id");
  CREATE INDEX "_articulos_v_version_version_autor_idx" ON "_articulos_v" USING btree ("version_autor_id");
  -- los autores que estaban cargados como texto pasan a la colección Autores
  INSERT INTO "autores" ("nombre") SELECT DISTINCT "autor" FROM "articulos" WHERE "autor" IS NOT NULL AND "autor" <> '';
  UPDATE "articulos" a SET "autor_id" = au."id" FROM "autores" au WHERE au."nombre" = a."autor";
  UPDATE "_articulos_v" v SET "version_autor_id" = au."id" FROM "autores" au WHERE au."nombre" = v."version_autor";
  ALTER TABLE "articulos" DROP COLUMN "autor";
  ALTER TABLE "_articulos_v" DROP COLUMN "version_autor";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articulos" DROP CONSTRAINT "articulos_autor_id_autores_id_fk";
  
  ALTER TABLE "_articulos_v" DROP CONSTRAINT "_articulos_v_version_autor_id_autores_id_fk";
  
  DROP INDEX "articulos_autor_idx";
  DROP INDEX "_articulos_v_version_version_autor_idx";
  ALTER TABLE "articulos" DROP COLUMN "autor_id";
  ALTER TABLE "_articulos_v" DROP COLUMN "version_autor_id";
   ALTER TABLE "autores_perfiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autores" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "autores_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "autores_perfiles" CASCADE;
  DROP TABLE "autores" CASCADE;
  DROP TABLE "autores_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_autores_fk";
  
  DROP INDEX "payload_locked_documents_rels_autores_id_idx";
  ALTER TABLE "articulos" ADD COLUMN "autor" varchar;
  ALTER TABLE "_articulos_v" ADD COLUMN "version_autor" varchar;
  ALTER TABLE "articulos_locales" DROP COLUMN "categoria";
  ALTER TABLE "_articulos_v_locales" DROP COLUMN "version_categoria";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "autores_id";`)
}
