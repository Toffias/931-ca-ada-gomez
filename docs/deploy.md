# Deploy al VPS (Hostinger)

Mismo pipeline que DS Design / APZ: **CI** (`.github/workflows/ci-tests.yml`: typecheck, tests, migraciones y
build contra un Postgres efímero) y, si pasa en `master`, **Deploy** (`.github/workflows/deploy.yml`): SSH al VPS,
`git reset` al commit validado y `scripts/deploy/actualizar.sh` (install, migraciones con `scripts/migrar.sh`, build, `pm2 reload`).
Al final verifica el SHA desplegado.

| Item | Valor |
|---|---|
| VPS | `82.29.59.19` (`srv1589149.hstgr.cloud`, KVM 1: 1 vCPU / 4 GB, compartido) |
| Carpeta | `/var/www/constructoras` (`.env` y `media/` viven sólo ahí, git no los toca) |
| PM2 | `constructoras`, puerto **3003** (3000–3002 son de las otras apps) |
| Dominio | `https://constructoras.apzsoftware.online` (DNS en GoDaddy, SSL con certbot) |
| Base | PostgreSQL local, base y usuario `constructoras` |
| nginx | `/etc/nginx/sites-available/constructoras` (`client_max_body_size 200M` para videos y `.glb`) |

## Contenido: snapshot

El contenido no viaja con el código. Para dejar el servidor igual que el local:

```bash
bash scripts/deploy/subir-snapshot.sh          # sólo si la base del servidor está vacía
bash scripts/deploy/subir-snapshot.sh fresh    # reemplaza el contenido del servidor (no los usuarios)
```

Exporta la base local + archivos a `snapshot/` (`pnpm exportar:snapshot`, fuera de git), los sube y corre
`pnpm seed:snapshot` en el VPS. Los ids cambian y las relaciones se reasignan solas; los archivos quedan byte a
byte iguales (incluidos los tamaños `tarjeta` y `grande`). No viajan usuarios ni consultas: el admin se crea desde
`SEED_ADMIN_*` del `.env` del servidor. **`fresh` pisa lo que se haya editado en el admin de producción.**

## Reglas

- En el VPS todo corre con `NODE_ENV=production`: Payload no hace *push* del schema, sólo migraciones. Nunca correr
  `pnpm dev` ni scripts de Payload en modo dev contra la base de producción.
- Después de tocar colecciones/globals: `pnpm payload migrate:create <nombre>` (con `DATABASE_URL=postgres://…`;
  no hace falta que la base exista) y commitear `src/migrations/`.
- Migraciones siempre con `bash scripts/migrar.sh`, no con `pnpm payload migrate` a secas: a veces el binario de
  Payload sale con código 0 sin migrar nada (se vio en el CI) y el script lo detecta, reintenta y si no, corta.
- Variables nuevas: agregarlas a mano en `/var/www/constructoras/.env`. Las `NEXT_PUBLIC_*` necesitan build.
- La Google Maps Embed key está restringida por dominio: sumar `constructoras.apzsoftware.online` en Google Cloud.

## Secrets de GitHub

| Secret | Valor |
|---|---|
| `VPS_HOST` | `82.29.59.19` |
| `VPS_SSH_KEY` | clave privada cuya pública está en `/root/.ssh/authorized_keys` del VPS (la misma que usa DS Design) |

El VPS clona con una deploy key propia (`/root/.ssh/constructoras_gh`, host `github.com-constructoras` en
`/root/.ssh/config`), agregada como *Deploy key* de sólo lectura en el repo.

Rollback: `git reset --hard <sha>` en el VPS y `bash scripts/deploy/actualizar.sh`, o re-correr el deploy de un
commit anterior desde Actions.
