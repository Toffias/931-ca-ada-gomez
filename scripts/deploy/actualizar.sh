#!/bin/bash
# Se corre en el VPS, dentro de /var/www/constructoras, con el código ya en el commit a desplegar
# (lo llama .github/workflows/deploy.yml; a mano: bash scripts/deploy/actualizar.sh "$(git rev-parse HEAD)").
set -euo pipefail

SHA="${1:-$(git rev-parse HEAD 2>/dev/null || echo manual)}"
PM2_NAME="${PM2_NAME:-constructoras}"
APP_PORT="${APP_PORT:-3003}"

# Todo en modo producción: así Payload nunca hace "push" del schema contra la base real (sólo migraciones).
export NODE_ENV=production

pnpm install --frozen-lockfile --prod=false
bash scripts/migrar.sh

# Build en el VPS con heap acotado (KVM de 4 GB compartido con las otras apps).
pnpm build:vps

echo "$SHA" > DEPLOYED_SHA.txt

pm2 describe "$PM2_NAME" > /dev/null 2>&1 \
  && pm2 reload "$PM2_NAME" --update-env \
  || PORT="$APP_PORT" pm2 start pnpm --name "$PM2_NAME" -- start
pm2 save
