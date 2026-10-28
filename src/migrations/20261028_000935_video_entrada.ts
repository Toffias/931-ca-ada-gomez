import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Intro: video que se reproduce al tocar "Entrar" (arranca en el mismo cuadro que el póster).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sitio" ADD COLUMN "intro_video_entrada_id" integer;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_intro_video_entrada_id_media_id_fk" FOREIGN KEY ("intro_video_entrada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "sitio_intro_intro_video_entrada_idx" ON "sitio" USING btree ("intro_video_entrada_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sitio" DROP CONSTRAINT "sitio_intro_video_entrada_id_media_id_fk";
  
  DROP INDEX "sitio_intro_intro_video_entrada_idx";
  ALTER TABLE "sitio" DROP COLUMN "intro_video_entrada_id";`)
}
