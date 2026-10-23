import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sitio" ADD COLUMN "favicon_id" integer;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "sitio_favicon_idx" ON "sitio" USING btree ("favicon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sitio" DROP CONSTRAINT "sitio_favicon_id_media_id_fk";
  
  DROP INDEX "sitio_favicon_idx";
  ALTER TABLE "sitio" DROP COLUMN "favicon_id";`)
}
