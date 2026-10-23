import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_edificios_niveles_tipo" AS ENUM('unidades', 'especial');
  CREATE TYPE "public"."enum_edificios_estado_obra" AS ENUM('preventa', 'construccion', 'terminado');
  CREATE TYPE "public"."enum_edificios_fondo_plantas" AS ENUM('realista', 'blanco');
  CREATE TYPE "public"."enum_tipologias_extras" AS ENUM('balcon', 'terraza', 'lavadero', 'cochera', 'baulera', 'dependencia');
  CREATE TYPE "public"."enum_unidades_estado" AS ENUM('disponible', 'reservada', 'vendida');
  CREATE TYPE "public"."enum_unidades_moneda" AS ENUM('USD', 'ARS');
  CREATE TYPE "public"."enum_recorridos_tipo" AS ENUM('propio', 'externo');
  CREATE TYPE "public"."enum_consultas_origen" AS ENUM('precio', 'ficha', 'contacto');
  CREATE TYPE "public"."enum_consultas_idioma" AS ENUM('es', 'en');
  CREATE TYPE "public"."enum_consultas_estado" AS ENUM('nueva', 'contactada', 'cerrada');
  CREATE TYPE "public"."enum_sitio_tema" AS ENUM('oscuro', 'claro', 'sistema');
  CREATE TYPE "public"."enum_sitio_tipografia" AS ENUM('inter', 'manrope', 'cormorant');
  CREATE TABLE "edificios_caracteristicas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL
  );
  
  CREATE TABLE "edificios_config3d_vistas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"camara" varchar NOT NULL,
  	"etiqueta" varchar NOT NULL,
  	"altura_objetivo" numeric
  );
  
  CREATE TABLE "edificios_niveles_pois" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"etiqueta" varchar NOT NULL,
  	"x" numeric NOT NULL,
  	"y" numeric NOT NULL,
  	"amenity_id" integer,
  	"recorrido_id" integer
  );
  
  CREATE TABLE "edificios_niveles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"piso" numeric NOT NULL,
  	"nombre" varchar,
  	"tipo" "enum_edificios_niveles_tipo" DEFAULT 'unidades',
  	"cenital_id" integer,
  	"cenital_blanco_id" integer,
  	"mascara_id" integer
  );
  
  CREATE TABLE "edificios_vistas_unidad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"orientacion" varchar NOT NULL,
  	"desde" numeric NOT NULL,
  	"hasta" numeric NOT NULL,
  	"imagen_id" integer NOT NULL
  );
  
  CREATE TABLE "edificios_vistas_disponibilidad" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"etiqueta" varchar NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"mascara_id" integer NOT NULL
  );
  
  CREATE TABLE "edificios_galeria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"epigrafe" varchar
  );
  
  CREATE TABLE "edificios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar,
  	"estado_obra" "enum_edificios_estado_obra" DEFAULT 'preventa',
  	"entrega" varchar,
  	"direccion" varchar,
  	"orden" numeric DEFAULT 0,
  	"bajada" varchar,
  	"modelo3d_id" integer NOT NULL,
  	"config3d_escala" numeric DEFAULT 1,
  	"config3d_sol_elevacion" numeric DEFAULT 30,
  	"config3d_sol_azimut" numeric DEFAULT -20,
  	"config3d_texturas_realistas" boolean DEFAULT true,
  	"config3d_ventanas_noche_material" varchar DEFAULT 'WEB_Vidrio',
  	"config3d_ventanas_noche_altura_primer_piso" numeric DEFAULT 3,
  	"config3d_ventanas_noche_altura_piso" numeric DEFAULT 3,
  	"config3d_ventanas_noche_ancho_ventana" numeric DEFAULT 1.5,
  	"config3d_ventanas_noche_encendidas" numeric DEFAULT 58,
  	"fondo_plantas" "enum_edificios_fondo_plantas" DEFAULT 'realista',
  	"portada_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tipologias_extras" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tipologias_extras",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tipologias_galeria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"epigrafe" varchar
  );
  
  CREATE TABLE "tipologias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"codigo" varchar NOT NULL,
  	"nombre" varchar,
  	"edificio_id" integer NOT NULL,
  	"dormitorios" numeric,
  	"banos" numeric,
  	"ambientes" numeric,
  	"superficie_interna" numeric,
  	"superficie_balcon" numeric,
  	"superficie_total" numeric,
  	"descripcion" varchar,
  	"foto_id" integer,
  	"planta_id" integer,
  	"planta2d_id" integer,
  	"recorrido_id" integer,
  	"video" varchar,
  	"brochure_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "unidades" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"codigo" varchar NOT NULL,
  	"edificio_id" integer NOT NULL,
  	"piso" numeric NOT NULL,
  	"estado" "enum_unidades_estado" DEFAULT 'disponible' NOT NULL,
  	"tipologia_id" integer,
  	"orientacion" varchar,
  	"dormitorios" numeric,
  	"banos" numeric,
  	"ambientes" numeric,
  	"superficie_cubierta" numeric,
  	"superficie_balcon" numeric,
  	"superficie_total" numeric,
  	"precio" numeric,
  	"moneda" "enum_unidades_moneda" DEFAULT 'USD',
  	"mostrar_precio" boolean DEFAULT true,
  	"plano_id" integer,
  	"notas" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "amenities_imagenes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"epigrafe" varchar
  );
  
  CREATE TABLE "amenities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar,
  	"orden" numeric DEFAULT 0,
  	"edificio_id" integer,
  	"descripcion" varchar,
  	"recorrido_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recorridos_puntos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clave" varchar,
  	"titulo" varchar,
  	"rumbo" numeric DEFAULT 0,
  	"panorama_id" integer,
  	"x" numeric,
  	"y" numeric
  );
  
  CREATE TABLE "recorridos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"slug" varchar,
  	"orden" numeric DEFAULT 0,
  	"tipo" "enum_recorridos_tipo" DEFAULT 'propio',
  	"url" varchar,
  	"plano_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "recorridos_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "avances_de_obra_fotos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"epigrafe" varchar
  );
  
  CREATE TABLE "avances_de_obra" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"fecha" timestamp(3) with time zone NOT NULL,
  	"edificio_id" integer,
  	"texto" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "consultas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"telefono" varchar,
  	"origen" "enum_consultas_origen" DEFAULT 'ficha',
  	"motivo" varchar,
  	"idioma" "enum_consultas_idioma" DEFAULT 'es',
  	"acepta_privacidad" boolean,
  	"mensaje" varchar,
  	"pagina" varchar,
  	"edificio_id" integer,
  	"unidad_id" integer,
  	"estado" "enum_consultas_estado" DEFAULT 'nueva',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_tarjeta_url" varchar,
  	"sizes_tarjeta_width" numeric,
  	"sizes_tarjeta_height" numeric,
  	"sizes_tarjeta_mime_type" varchar,
  	"sizes_tarjeta_filesize" numeric,
  	"sizes_tarjeta_filename" varchar,
  	"sizes_grande_url" varchar,
  	"sizes_grande_width" numeric,
  	"sizes_grande_height" numeric,
  	"sizes_grande_mime_type" varchar,
  	"sizes_grande_filesize" numeric,
  	"sizes_grande_filename" varchar
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"edificios_id" integer,
  	"tipologias_id" integer,
  	"unidades_id" integer,
  	"amenities_id" integer,
  	"recorridos_id" integer,
  	"avances_de_obra_id" integer,
  	"consultas_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sitio_giro" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"etiqueta" varchar,
  	"imagen_id" integer NOT NULL,
  	"mascara_id" integer,
  	"video_siguiente_id" integer,
  	"video_anterior_id" integer
  );
  
  CREATE TABLE "sitio_galeria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagen_id" integer NOT NULL,
  	"epigrafe" varchar
  );
  
  CREATE TABLE "sitio_ubicacion_busquedas_cercanas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"busqueda" varchar
  );
  
  CREATE TABLE "sitio_ubicacion_cercanias" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nombre" varchar NOT NULL,
  	"categoria" varchar,
  	"tiempo" varchar,
  	"x" numeric,
  	"y" numeric
  );
  
  CREATE TABLE "sitio" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nombre" varchar DEFAULT 'Nombre del desarrollo' NOT NULL,
  	"eslogan" varchar,
  	"logo_id" integer,
  	"color_acento" varchar DEFAULT '#e8b56a',
  	"tema" "enum_sitio_tema" DEFAULT 'oscuro',
  	"color_fondo" varchar DEFAULT '#0e1116',
  	"color_fondo_claro" varchar DEFAULT '#f3f1ed',
  	"tipografia" "enum_sitio_tipografia" DEFAULT 'inter',
  	"desarrolladora_nombre" varchar,
  	"desarrolladora_web" varchar,
  	"desarrolladora_logo_id" integer,
  	"secciones_disponibilidad" boolean DEFAULT true,
  	"secciones_amenities" boolean DEFAULT true,
  	"secciones_recorridos" boolean DEFAULT true,
  	"secciones_galeria" boolean DEFAULT true,
  	"secciones_video" boolean DEFAULT true,
  	"secciones_obra" boolean DEFAULT false,
  	"secciones_ubicacion" boolean DEFAULT true,
  	"secciones_modo3d" boolean DEFAULT true,
  	"contacto_telefono" varchar,
  	"contacto_whatsapp" varchar,
  	"contacto_email" varchar,
  	"contacto_direccion" varchar,
  	"contacto_horario" varchar,
  	"descripcion" varchar,
  	"legal" varchar DEFAULT 'Imágenes ilustrativas, no contractuales. Precios y disponibilidad sujetos a cambios.',
  	"privacidad" varchar,
  	"brochure_id" integer,
  	"intro_video_id" integer,
  	"intro_video_movil_id" integer,
  	"intro_poster_id" integer,
  	"intro_nubes" boolean DEFAULT true,
  	"video" varchar,
  	"ubicacion_barrio" varchar,
  	"ubicacion_direccion" varchar,
  	"ubicacion_texto" varchar,
  	"ubicacion_foto_id" integer,
  	"ubicacion_mapa_google" varchar,
  	"ubicacion_street_view" varchar,
  	"ubicacion_mapa_ilustrado_id" integer,
  	"ubicacion_lote_x" numeric,
  	"ubicacion_lote_y" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "sitio_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "edificios_caracteristicas" ADD CONSTRAINT "edificios_caracteristicas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_config3d_vistas" ADD CONSTRAINT "edificios_config3d_vistas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_niveles_pois" ADD CONSTRAINT "edificios_niveles_pois_amenity_id_amenities_id_fk" FOREIGN KEY ("amenity_id") REFERENCES "public"."amenities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_niveles_pois" ADD CONSTRAINT "edificios_niveles_pois_recorrido_id_recorridos_id_fk" FOREIGN KEY ("recorrido_id") REFERENCES "public"."recorridos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_niveles_pois" ADD CONSTRAINT "edificios_niveles_pois_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios_niveles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_niveles" ADD CONSTRAINT "edificios_niveles_cenital_id_media_id_fk" FOREIGN KEY ("cenital_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_niveles" ADD CONSTRAINT "edificios_niveles_cenital_blanco_id_media_id_fk" FOREIGN KEY ("cenital_blanco_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_niveles" ADD CONSTRAINT "edificios_niveles_mascara_id_media_id_fk" FOREIGN KEY ("mascara_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_niveles" ADD CONSTRAINT "edificios_niveles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_vistas_unidad" ADD CONSTRAINT "edificios_vistas_unidad_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_vistas_unidad" ADD CONSTRAINT "edificios_vistas_unidad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_vistas_disponibilidad" ADD CONSTRAINT "edificios_vistas_disponibilidad_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_vistas_disponibilidad" ADD CONSTRAINT "edificios_vistas_disponibilidad_mascara_id_media_id_fk" FOREIGN KEY ("mascara_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_vistas_disponibilidad" ADD CONSTRAINT "edificios_vistas_disponibilidad_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios_galeria" ADD CONSTRAINT "edificios_galeria_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios_galeria" ADD CONSTRAINT "edificios_galeria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "edificios" ADD CONSTRAINT "edificios_modelo3d_id_media_id_fk" FOREIGN KEY ("modelo3d_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "edificios" ADD CONSTRAINT "edificios_portada_id_media_id_fk" FOREIGN KEY ("portada_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias_extras" ADD CONSTRAINT "tipologias_extras_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tipologias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tipologias_galeria" ADD CONSTRAINT "tipologias_galeria_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias_galeria" ADD CONSTRAINT "tipologias_galeria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tipologias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_edificio_id_edificios_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_foto_id_media_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_planta_id_media_id_fk" FOREIGN KEY ("planta_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_planta2d_id_media_id_fk" FOREIGN KEY ("planta2d_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_recorrido_id_recorridos_id_fk" FOREIGN KEY ("recorrido_id") REFERENCES "public"."recorridos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tipologias" ADD CONSTRAINT "tipologias_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "unidades" ADD CONSTRAINT "unidades_edificio_id_edificios_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "unidades" ADD CONSTRAINT "unidades_tipologia_id_tipologias_id_fk" FOREIGN KEY ("tipologia_id") REFERENCES "public"."tipologias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "unidades" ADD CONSTRAINT "unidades_plano_id_media_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "amenities_imagenes" ADD CONSTRAINT "amenities_imagenes_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "amenities_imagenes" ADD CONSTRAINT "amenities_imagenes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "amenities" ADD CONSTRAINT "amenities_edificio_id_edificios_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "amenities" ADD CONSTRAINT "amenities_recorrido_id_recorridos_id_fk" FOREIGN KEY ("recorrido_id") REFERENCES "public"."recorridos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recorridos_puntos" ADD CONSTRAINT "recorridos_puntos_panorama_id_media_id_fk" FOREIGN KEY ("panorama_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recorridos_puntos" ADD CONSTRAINT "recorridos_puntos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."recorridos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "recorridos" ADD CONSTRAINT "recorridos_plano_id_media_id_fk" FOREIGN KEY ("plano_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recorridos_texts" ADD CONSTRAINT "recorridos_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."recorridos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avances_de_obra_fotos" ADD CONSTRAINT "avances_de_obra_fotos_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avances_de_obra_fotos" ADD CONSTRAINT "avances_de_obra_fotos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."avances_de_obra"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avances_de_obra" ADD CONSTRAINT "avances_de_obra_edificio_id_edificios_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "consultas" ADD CONSTRAINT "consultas_edificio_id_edificios_id_fk" FOREIGN KEY ("edificio_id") REFERENCES "public"."edificios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "consultas" ADD CONSTRAINT "consultas_unidad_id_unidades_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "public"."unidades"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_edificios_fk" FOREIGN KEY ("edificios_id") REFERENCES "public"."edificios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tipologias_fk" FOREIGN KEY ("tipologias_id") REFERENCES "public"."tipologias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_unidades_fk" FOREIGN KEY ("unidades_id") REFERENCES "public"."unidades"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_amenities_fk" FOREIGN KEY ("amenities_id") REFERENCES "public"."amenities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recorridos_fk" FOREIGN KEY ("recorridos_id") REFERENCES "public"."recorridos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_avances_de_obra_fk" FOREIGN KEY ("avances_de_obra_id") REFERENCES "public"."avances_de_obra"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consultas_fk" FOREIGN KEY ("consultas_id") REFERENCES "public"."consultas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_giro" ADD CONSTRAINT "sitio_giro_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_giro" ADD CONSTRAINT "sitio_giro_mascara_id_media_id_fk" FOREIGN KEY ("mascara_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_giro" ADD CONSTRAINT "sitio_giro_video_siguiente_id_media_id_fk" FOREIGN KEY ("video_siguiente_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_giro" ADD CONSTRAINT "sitio_giro_video_anterior_id_media_id_fk" FOREIGN KEY ("video_anterior_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_giro" ADD CONSTRAINT "sitio_giro_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_galeria" ADD CONSTRAINT "sitio_galeria_imagen_id_media_id_fk" FOREIGN KEY ("imagen_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_galeria" ADD CONSTRAINT "sitio_galeria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_ubicacion_busquedas_cercanas" ADD CONSTRAINT "sitio_ubicacion_busquedas_cercanas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio_ubicacion_cercanias" ADD CONSTRAINT "sitio_ubicacion_cercanias_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_desarrolladora_logo_id_media_id_fk" FOREIGN KEY ("desarrolladora_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_brochure_id_media_id_fk" FOREIGN KEY ("brochure_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_intro_video_id_media_id_fk" FOREIGN KEY ("intro_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_intro_video_movil_id_media_id_fk" FOREIGN KEY ("intro_video_movil_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_intro_poster_id_media_id_fk" FOREIGN KEY ("intro_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_ubicacion_foto_id_media_id_fk" FOREIGN KEY ("ubicacion_foto_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio" ADD CONSTRAINT "sitio_ubicacion_mapa_ilustrado_id_media_id_fk" FOREIGN KEY ("ubicacion_mapa_ilustrado_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sitio_texts" ADD CONSTRAINT "sitio_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sitio"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "edificios_caracteristicas_order_idx" ON "edificios_caracteristicas" USING btree ("_order");
  CREATE INDEX "edificios_caracteristicas_parent_id_idx" ON "edificios_caracteristicas" USING btree ("_parent_id");
  CREATE INDEX "edificios_config3d_vistas_order_idx" ON "edificios_config3d_vistas" USING btree ("_order");
  CREATE INDEX "edificios_config3d_vistas_parent_id_idx" ON "edificios_config3d_vistas" USING btree ("_parent_id");
  CREATE INDEX "edificios_niveles_pois_order_idx" ON "edificios_niveles_pois" USING btree ("_order");
  CREATE INDEX "edificios_niveles_pois_parent_id_idx" ON "edificios_niveles_pois" USING btree ("_parent_id");
  CREATE INDEX "edificios_niveles_pois_amenity_idx" ON "edificios_niveles_pois" USING btree ("amenity_id");
  CREATE INDEX "edificios_niveles_pois_recorrido_idx" ON "edificios_niveles_pois" USING btree ("recorrido_id");
  CREATE INDEX "edificios_niveles_order_idx" ON "edificios_niveles" USING btree ("_order");
  CREATE INDEX "edificios_niveles_parent_id_idx" ON "edificios_niveles" USING btree ("_parent_id");
  CREATE INDEX "edificios_niveles_cenital_idx" ON "edificios_niveles" USING btree ("cenital_id");
  CREATE INDEX "edificios_niveles_cenital_blanco_idx" ON "edificios_niveles" USING btree ("cenital_blanco_id");
  CREATE INDEX "edificios_niveles_mascara_idx" ON "edificios_niveles" USING btree ("mascara_id");
  CREATE INDEX "edificios_vistas_unidad_order_idx" ON "edificios_vistas_unidad" USING btree ("_order");
  CREATE INDEX "edificios_vistas_unidad_parent_id_idx" ON "edificios_vistas_unidad" USING btree ("_parent_id");
  CREATE INDEX "edificios_vistas_unidad_imagen_idx" ON "edificios_vistas_unidad" USING btree ("imagen_id");
  CREATE INDEX "edificios_vistas_disponibilidad_order_idx" ON "edificios_vistas_disponibilidad" USING btree ("_order");
  CREATE INDEX "edificios_vistas_disponibilidad_parent_id_idx" ON "edificios_vistas_disponibilidad" USING btree ("_parent_id");
  CREATE INDEX "edificios_vistas_disponibilidad_imagen_idx" ON "edificios_vistas_disponibilidad" USING btree ("imagen_id");
  CREATE INDEX "edificios_vistas_disponibilidad_mascara_idx" ON "edificios_vistas_disponibilidad" USING btree ("mascara_id");
  CREATE INDEX "edificios_galeria_order_idx" ON "edificios_galeria" USING btree ("_order");
  CREATE INDEX "edificios_galeria_parent_id_idx" ON "edificios_galeria" USING btree ("_parent_id");
  CREATE INDEX "edificios_galeria_imagen_idx" ON "edificios_galeria" USING btree ("imagen_id");
  CREATE UNIQUE INDEX "edificios_slug_idx" ON "edificios" USING btree ("slug");
  CREATE INDEX "edificios_modelo3d_idx" ON "edificios" USING btree ("modelo3d_id");
  CREATE INDEX "edificios_portada_idx" ON "edificios" USING btree ("portada_id");
  CREATE INDEX "edificios_updated_at_idx" ON "edificios" USING btree ("updated_at");
  CREATE INDEX "edificios_created_at_idx" ON "edificios" USING btree ("created_at");
  CREATE INDEX "tipologias_extras_order_idx" ON "tipologias_extras" USING btree ("order");
  CREATE INDEX "tipologias_extras_parent_idx" ON "tipologias_extras" USING btree ("parent_id");
  CREATE INDEX "tipologias_galeria_order_idx" ON "tipologias_galeria" USING btree ("_order");
  CREATE INDEX "tipologias_galeria_parent_id_idx" ON "tipologias_galeria" USING btree ("_parent_id");
  CREATE INDEX "tipologias_galeria_imagen_idx" ON "tipologias_galeria" USING btree ("imagen_id");
  CREATE INDEX "tipologias_edificio_idx" ON "tipologias" USING btree ("edificio_id");
  CREATE INDEX "tipologias_foto_idx" ON "tipologias" USING btree ("foto_id");
  CREATE INDEX "tipologias_planta_idx" ON "tipologias" USING btree ("planta_id");
  CREATE INDEX "tipologias_planta2d_idx" ON "tipologias" USING btree ("planta2d_id");
  CREATE INDEX "tipologias_recorrido_idx" ON "tipologias" USING btree ("recorrido_id");
  CREATE INDEX "tipologias_brochure_idx" ON "tipologias" USING btree ("brochure_id");
  CREATE INDEX "tipologias_updated_at_idx" ON "tipologias" USING btree ("updated_at");
  CREATE INDEX "tipologias_created_at_idx" ON "tipologias" USING btree ("created_at");
  CREATE INDEX "unidades_edificio_idx" ON "unidades" USING btree ("edificio_id");
  CREATE INDEX "unidades_tipologia_idx" ON "unidades" USING btree ("tipologia_id");
  CREATE INDEX "unidades_plano_idx" ON "unidades" USING btree ("plano_id");
  CREATE INDEX "unidades_updated_at_idx" ON "unidades" USING btree ("updated_at");
  CREATE INDEX "unidades_created_at_idx" ON "unidades" USING btree ("created_at");
  CREATE INDEX "amenities_imagenes_order_idx" ON "amenities_imagenes" USING btree ("_order");
  CREATE INDEX "amenities_imagenes_parent_id_idx" ON "amenities_imagenes" USING btree ("_parent_id");
  CREATE INDEX "amenities_imagenes_imagen_idx" ON "amenities_imagenes" USING btree ("imagen_id");
  CREATE UNIQUE INDEX "amenities_slug_idx" ON "amenities" USING btree ("slug");
  CREATE INDEX "amenities_edificio_idx" ON "amenities" USING btree ("edificio_id");
  CREATE INDEX "amenities_recorrido_idx" ON "amenities" USING btree ("recorrido_id");
  CREATE INDEX "amenities_updated_at_idx" ON "amenities" USING btree ("updated_at");
  CREATE INDEX "amenities_created_at_idx" ON "amenities" USING btree ("created_at");
  CREATE INDEX "recorridos_puntos_order_idx" ON "recorridos_puntos" USING btree ("_order");
  CREATE INDEX "recorridos_puntos_parent_id_idx" ON "recorridos_puntos" USING btree ("_parent_id");
  CREATE INDEX "recorridos_puntos_panorama_idx" ON "recorridos_puntos" USING btree ("panorama_id");
  CREATE UNIQUE INDEX "recorridos_slug_idx" ON "recorridos" USING btree ("slug");
  CREATE INDEX "recorridos_plano_idx" ON "recorridos" USING btree ("plano_id");
  CREATE INDEX "recorridos_updated_at_idx" ON "recorridos" USING btree ("updated_at");
  CREATE INDEX "recorridos_created_at_idx" ON "recorridos" USING btree ("created_at");
  CREATE INDEX "recorridos_texts_order_parent" ON "recorridos_texts" USING btree ("order","parent_id");
  CREATE INDEX "avances_de_obra_fotos_order_idx" ON "avances_de_obra_fotos" USING btree ("_order");
  CREATE INDEX "avances_de_obra_fotos_parent_id_idx" ON "avances_de_obra_fotos" USING btree ("_parent_id");
  CREATE INDEX "avances_de_obra_fotos_imagen_idx" ON "avances_de_obra_fotos" USING btree ("imagen_id");
  CREATE INDEX "avances_de_obra_edificio_idx" ON "avances_de_obra" USING btree ("edificio_id");
  CREATE INDEX "avances_de_obra_updated_at_idx" ON "avances_de_obra" USING btree ("updated_at");
  CREATE INDEX "avances_de_obra_created_at_idx" ON "avances_de_obra" USING btree ("created_at");
  CREATE INDEX "consultas_edificio_idx" ON "consultas" USING btree ("edificio_id");
  CREATE INDEX "consultas_unidad_idx" ON "consultas" USING btree ("unidad_id");
  CREATE INDEX "consultas_updated_at_idx" ON "consultas" USING btree ("updated_at");
  CREATE INDEX "consultas_created_at_idx" ON "consultas" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_tarjeta_sizes_tarjeta_filename_idx" ON "media" USING btree ("sizes_tarjeta_filename");
  CREATE INDEX "media_sizes_grande_sizes_grande_filename_idx" ON "media" USING btree ("sizes_grande_filename");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_edificios_id_idx" ON "payload_locked_documents_rels" USING btree ("edificios_id");
  CREATE INDEX "payload_locked_documents_rels_tipologias_id_idx" ON "payload_locked_documents_rels" USING btree ("tipologias_id");
  CREATE INDEX "payload_locked_documents_rels_unidades_id_idx" ON "payload_locked_documents_rels" USING btree ("unidades_id");
  CREATE INDEX "payload_locked_documents_rels_amenities_id_idx" ON "payload_locked_documents_rels" USING btree ("amenities_id");
  CREATE INDEX "payload_locked_documents_rels_recorridos_id_idx" ON "payload_locked_documents_rels" USING btree ("recorridos_id");
  CREATE INDEX "payload_locked_documents_rels_avances_de_obra_id_idx" ON "payload_locked_documents_rels" USING btree ("avances_de_obra_id");
  CREATE INDEX "payload_locked_documents_rels_consultas_id_idx" ON "payload_locked_documents_rels" USING btree ("consultas_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "sitio_giro_order_idx" ON "sitio_giro" USING btree ("_order");
  CREATE INDEX "sitio_giro_parent_id_idx" ON "sitio_giro" USING btree ("_parent_id");
  CREATE INDEX "sitio_giro_imagen_idx" ON "sitio_giro" USING btree ("imagen_id");
  CREATE INDEX "sitio_giro_mascara_idx" ON "sitio_giro" USING btree ("mascara_id");
  CREATE INDEX "sitio_giro_video_siguiente_idx" ON "sitio_giro" USING btree ("video_siguiente_id");
  CREATE INDEX "sitio_giro_video_anterior_idx" ON "sitio_giro" USING btree ("video_anterior_id");
  CREATE INDEX "sitio_galeria_order_idx" ON "sitio_galeria" USING btree ("_order");
  CREATE INDEX "sitio_galeria_parent_id_idx" ON "sitio_galeria" USING btree ("_parent_id");
  CREATE INDEX "sitio_galeria_imagen_idx" ON "sitio_galeria" USING btree ("imagen_id");
  CREATE INDEX "sitio_ubicacion_busquedas_cercanas_order_idx" ON "sitio_ubicacion_busquedas_cercanas" USING btree ("_order");
  CREATE INDEX "sitio_ubicacion_busquedas_cercanas_parent_id_idx" ON "sitio_ubicacion_busquedas_cercanas" USING btree ("_parent_id");
  CREATE INDEX "sitio_ubicacion_cercanias_order_idx" ON "sitio_ubicacion_cercanias" USING btree ("_order");
  CREATE INDEX "sitio_ubicacion_cercanias_parent_id_idx" ON "sitio_ubicacion_cercanias" USING btree ("_parent_id");
  CREATE INDEX "sitio_logo_idx" ON "sitio" USING btree ("logo_id");
  CREATE INDEX "sitio_desarrolladora_desarrolladora_logo_idx" ON "sitio" USING btree ("desarrolladora_logo_id");
  CREATE INDEX "sitio_brochure_idx" ON "sitio" USING btree ("brochure_id");
  CREATE INDEX "sitio_intro_intro_video_idx" ON "sitio" USING btree ("intro_video_id");
  CREATE INDEX "sitio_intro_intro_video_movil_idx" ON "sitio" USING btree ("intro_video_movil_id");
  CREATE INDEX "sitio_intro_intro_poster_idx" ON "sitio" USING btree ("intro_poster_id");
  CREATE INDEX "sitio_ubicacion_ubicacion_foto_idx" ON "sitio" USING btree ("ubicacion_foto_id");
  CREATE INDEX "sitio_ubicacion_ubicacion_mapa_ilustrado_idx" ON "sitio" USING btree ("ubicacion_mapa_ilustrado_id");
  CREATE INDEX "sitio_texts_order_parent" ON "sitio_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "edificios_caracteristicas" CASCADE;
  DROP TABLE "edificios_config3d_vistas" CASCADE;
  DROP TABLE "edificios_niveles_pois" CASCADE;
  DROP TABLE "edificios_niveles" CASCADE;
  DROP TABLE "edificios_vistas_unidad" CASCADE;
  DROP TABLE "edificios_vistas_disponibilidad" CASCADE;
  DROP TABLE "edificios_galeria" CASCADE;
  DROP TABLE "edificios" CASCADE;
  DROP TABLE "tipologias_extras" CASCADE;
  DROP TABLE "tipologias_galeria" CASCADE;
  DROP TABLE "tipologias" CASCADE;
  DROP TABLE "unidades" CASCADE;
  DROP TABLE "amenities_imagenes" CASCADE;
  DROP TABLE "amenities" CASCADE;
  DROP TABLE "recorridos_puntos" CASCADE;
  DROP TABLE "recorridos" CASCADE;
  DROP TABLE "recorridos_texts" CASCADE;
  DROP TABLE "avances_de_obra_fotos" CASCADE;
  DROP TABLE "avances_de_obra" CASCADE;
  DROP TABLE "consultas" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "sitio_giro" CASCADE;
  DROP TABLE "sitio_galeria" CASCADE;
  DROP TABLE "sitio_ubicacion_busquedas_cercanas" CASCADE;
  DROP TABLE "sitio_ubicacion_cercanias" CASCADE;
  DROP TABLE "sitio" CASCADE;
  DROP TABLE "sitio_texts" CASCADE;
  DROP TYPE "public"."enum_edificios_niveles_tipo";
  DROP TYPE "public"."enum_edificios_estado_obra";
  DROP TYPE "public"."enum_edificios_fondo_plantas";
  DROP TYPE "public"."enum_tipologias_extras";
  DROP TYPE "public"."enum_unidades_estado";
  DROP TYPE "public"."enum_unidades_moneda";
  DROP TYPE "public"."enum_recorridos_tipo";
  DROP TYPE "public"."enum_consultas_origen";
  DROP TYPE "public"."enum_consultas_idioma";
  DROP TYPE "public"."enum_consultas_estado";
  DROP TYPE "public"."enum_sitio_tema";
  DROP TYPE "public"."enum_sitio_tipografia";`)
}
