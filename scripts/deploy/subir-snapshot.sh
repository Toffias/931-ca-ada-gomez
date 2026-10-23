#!/bin/bash
# Deja el servidor igual que el entorno local: exporta la base + archivos a snapshot/, los sube al VPS y los
# carga con `pnpm seed:snapshot` (sin "fresh" no pisa contenido existente).
#
#   bash scripts/deploy/subir-snapshot.sh           → sólo si la base del servidor está vacía
#   bash scripts/deploy/subir-snapshot.sh fresh     → reemplaza el contenido del servidor (no los usuarios)
#
# Variables: VPS (root@82.29.59.19), SSH_KEY (~/.ssh/dsdesign_deploy), DEPLOY_DIR (/var/www/constructoras)
set -euo pipefail

VPS="${VPS:-root@82.29.59.19}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/dsdesign_deploy}"
DEPLOY_DIR="${DEPLOY_DIR:-/var/www/constructoras}"
MODO="${1:-}"
SSH="ssh -i $SSH_KEY -o BatchMode=yes"

cd "$(dirname "$0")/../.."
pnpm exportar:snapshot

echo "Subiendo snapshot/ a $VPS:$DEPLOY_DIR ..."
tar -czf - snapshot | $SSH "$VPS" "cd $DEPLOY_DIR && rm -rf snapshot && tar -xzf -"

# NODE_ENV=production: el seed no hace push del schema (la base se maneja con migraciones).
# El `| cat` es a propósito: por ssh sin TTY, el process.exit() del seed se come la salida.
$SSH "$VPS" "cd $DEPLOY_DIR && set -o pipefail && NODE_ENV=production pnpm seed:snapshot $MODO < /dev/null | cat"

# Verificación: lo que quedó en la base del servidor contra lo que tiene el snapshot
esperado=$(node -e "const d=require('./snapshot/datos.json').colecciones;console.log(d.media.length, d.unidades.length)")
real=$($SSH "$VPS" "sudo -u postgres psql -d constructoras -tAc 'select (select count(*) from media), (select count(*) from unidades)'" | tr '|' ' ')
echo "Archivos y unidades — snapshot: $esperado · servidor: $real"
[ "$esperado" = "$real" ] || { echo "El servidor no quedó igual al snapshot." >&2; exit 1; }
$SSH "$VPS" "pm2 describe constructoras > /dev/null 2>&1 && pm2 reload constructoras > /dev/null || true"
echo "Listo."
