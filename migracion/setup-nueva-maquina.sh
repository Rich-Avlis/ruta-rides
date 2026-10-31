#!/usr/bin/env bash
# RAPIDITO - Preparación de una máquina nueva
# Uso: bash migracion/setup-nueva-maquina.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "== Proyecto: $ROOT"

# --- Requisitos ---
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: falta Node.js (se requiere >= 20). Instálalo desde https://nodejs.org" >&2
  exit 1
fi
node -e 'const v=process.versions.node.split(".").map(Number); if(v[0]<20){console.error("ERROR: Node 20+ requerido. Tienes "+process.versions.node);process.exit(1)}'
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: falta npm" >&2
  exit 1
fi
echo "== Node $(node -v) / npm $(npm -v)"
echo "AVISO: si migras desde otra arquitectura (p.ej. Intel -> Apple Silicon) borra backend/node_modules y frontend/node_modules antes de continuar."

# --- Skills de OpenCode (caveman/ultracave/megacave) ---
mkdir -p "$HOME/.config/opencode/skills"
cp -R "$ROOT/migracion/skills/." "$HOME/.config/opencode/skills/"
echo "== Skills instalados en ~/.config/opencode/skills ($(ls "$HOME/.config/opencode/skills"))"

# --- Variables de entorno ---
if [ ! -f "$ROOT/backend/.env" ]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "== Creado backend/.env desde .env.example (revisa JWT_SECRET)"
fi
if [ ! -f "$ROOT/frontend/.env.local" ]; then
  cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"
  echo "== Creado frontend/.env.local desde .env.example"
fi

# --- Dependencias ---
echo "== Instalando backend..."
(cd "$ROOT/backend" && npm install)
echo "== Instalando frontend..."
(cd "$ROOT/frontend" && npm install)

echo
echo "============================================================"
echo " LISTO. Para arrancar:"
echo "   Terminal 1:  cd \"$ROOT/backend\"  && npm run dev"
echo "   Terminal 2:  cd \"$ROOT/frontend\" && npm run dev"
echo
echo " Backend:  http://localhost:3001"
echo " Frontend: http://localhost:3000"
echo "============================================================"
