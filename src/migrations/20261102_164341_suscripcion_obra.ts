import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_suscriptores_obra_idioma" AS ENUM('es', 'en');
  CREATE TABLE "suscriptores_obra" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"idioma" "enum_suscriptores_obra_idioma" DEFAULT 'es',
  	"activo" boolean DEFAULT true,
  	"baja_en" timestamp(3) with time zone,
  	"token" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "avances_de_obra" ADD COLUMN "avisar_suscriptores" boolean DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "suscriptores_obra_id" integer;
  CREATE UNIQUE INDEX "suscriptores_obra_email_idx" ON "suscriptores_obra" USING btree ("email");
  CREATE UNIQUE INDEX "suscriptores_obra_token_idx" ON "suscriptores_obra" USING btree ("token");
  CREATE INDEX "suscriptores_obra_updated_at_idx" ON "suscriptores_obra" USING btree ("updated_at");
  CREATE INDEX "suscriptores_obra_created_at_idx" ON "suscriptores_obra" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_suscriptores_obra_fk" FOREIGN KEY ("suscriptores_obra_id") REFERENCES "public"."suscriptores_obra"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_suscriptores_obra_id_idx" ON "payload_locked_documents_rels" USING btree ("suscriptores_obra_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "suscriptores_obra" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "suscriptores_obra" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_suscriptores_obra_fk";
  
  DROP INDEX "payload_locked_documents_rels_suscriptores_obra_id_idx";
  ALTER TABLE "avances_de_obra" DROP COLUMN "avisar_suscriptores";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "suscriptores_obra_id";
  DROP TYPE "public"."enum_suscriptores_obra_idioma";`)
}
