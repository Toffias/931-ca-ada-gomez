#!/bin/bash
# Corre las migraciones de Payload y confirma que terminaron (lo usan el CI y scripts/deploy/actualizar.sh).
#
# Por qué no alcanza con `pnpm payload migrate`: el binario de Payload arranca con `void start()` y carga la config
# con tsx; a veces (visto en GitHub Actions con Node 20) el proceso se queda sin nada pendiente a mitad de la carga y
# Node sale con código 0 sin imprimir nada ni migrar. El paso daba OK y después el build fallaba con
# `relation "sitio" does not exist`. Payload siempre termina un migrate completo con "Done.": si no aparece, se
# reintenta; si tampoco, se corta con error.
set -euo pipefail

INTENTOS="${INTENTOS_MIGRACION:-3}"
salida="$(mktemp)"
trap 'rm -f "$salida"' EXIT

for intento in $(seq 1 "$INTENTOS"); do
  # tee: la salida se ve en vivo y además queda para revisarla; con pipefail, un error real de migrate corta acá
  pnpm payload migrate < /dev/null 2>&1 | tee "$salida"
  if grep -q 'Done\.' "$salida"; then
    exit 0
  fi
  echo "[migrar] payload migrate salió sin terminar (intento $intento de $INTENTOS)" >&2
done

echo "[migrar] las migraciones no se aplicaron después de $INTENTOS intentos" >&2
exit 1
