#!/usr/bin/env bash
# RAPIDITO - Importa esta sesión de OpenCode en la máquina nueva
# Uso: bash migracion/importar-sesion.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="$ROOT/migracion/sesion/rapidito-sesion-export.json"

if [ ! -f "$FILE" ]; then
  echo "ERROR: no existe $FILE" >&2
  exit 1
fi

if ! command -v opencode >/dev/null 2>&1; then
  cat >&2 <<'EOF'
No se encontró el comando `opencode`.
Opciones:
  1) Instala OpenCode CLI (https://opencode.ai) y reintenta:
        bash migracion/importar-sesion.sh
  2) Usa la transcripción legible:
        migracion/sesion/transcripcion.md
  3) En la app de escritorio: abre el proyecto y pega/adjunta
        migracion/estado-del-proyecto.md
     como contexto para el agente.
EOF
  exit 1
fi

cd "$ROOT"
echo "== Importando sesión en el proyecto actual..."
opencode import "$FILE"
echo "== Hecho. Abre OpenCode en este proyecto y la sesión aparecerá en el historial."
