#!/usr/bin/env bash
#
# gitScape — arranca el backend Go (modo local) y el frontend Vite en un solo comando.
#
# Uso:
#   ./dev.sh [REPO_PATH] [BRANCH]
#
# Ejemplos:
#   ./dev.sh                          # ~/dev/letrain, rama develop
#   ./dev.sh ~/dev/moderanger main    # otro clon y otra rama
#   REPO_PATH=~/dev/foo BRANCH=main ./dev.sh
#
# Variables opcionales: PORT (8080), CACHE_TTL (30m), GITHUB_TOKEN.
# Ctrl+C detiene los dos procesos.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="${1:-${REPO_PATH:-$HOME/dev/letrain}}"
BRANCH="${2:-${BRANCH:-develop}}"
PORT="${PORT:-8080}"
CACHE_TTL="${CACHE_TTL:-30m}"

info() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
error() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

cd "$ROOT_DIR"

# --- Requisitos ---
command -v go >/dev/null 2>&1 || { error "Go no está instalado (https://go.dev/dl/)"; exit 1; }
command -v curl >/dev/null 2>&1 || { error "curl no está instalado"; exit 1; }
[ -e "$REPO_PATH/.git" ] || { error "'$REPO_PATH' no parece un clon de git (uso: ./dev.sh /ruta/al/clon)"; exit 1; }
if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/health"; then
  error "Ya hay un backend escuchando en :$PORT (páralo o usa PORT=otro)"
  exit 1
fi

# --- Node 18+ (usando nvm y .nvmrc si están) ---
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
  nvm use >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1 || true
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  error "Node $(node -v 2>/dev/null || echo 'no encontrado') es demasiado antiguo: Vite 5 necesita 18+ (prueba 'nvm use 22')"
  exit 1
fi

# --- Token (opcional): entorno o gh CLI ---
if [ -z "${GITHUB_TOKEN:-}" ] && command -v gh >/dev/null 2>&1; then
  GITHUB_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
export GITHUB_TOKEN
if [ -n "$GITHUB_TOKEN" ]; then
  TOKEN_STATE="sí (PRs disponibles)"
else
  TOKEN_STATE="no (se mostrará sin PRs)"
fi

# La rama pedida manda sobre el .env del frontend (el entorno tiene prioridad en Vite).
export VITE_GITHUB_BRANCH="$BRANCH"
export VITE_API_URL="${VITE_API_URL:-/}"

info "Clon local:   $REPO_PATH (rama $BRANCH)"
info "Token GitHub: $TOKEN_STATE"

# --- Backend ---
BIN_DIR="$(mktemp -d)"
BACKEND_PID=""

cleanup() {
  trap - EXIT INT TERM
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  rm -rf "$BIN_DIR"
}
on_signal() { cleanup; exit 130; }
trap cleanup EXIT
trap on_signal INT TERM

info "Compilando backend Go..."
(cd server && go build -o "$BIN_DIR/gitscape-server" .)

info "Arrancando backend en :$PORT (cache-ttl $CACHE_TTL)..."
"$BIN_DIR/gitscape-server" -addr ":$PORT" -cache-ttl "$CACHE_TTL" --repo-path "$REPO_PATH" &
BACKEND_PID=$!

for _ in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/health"; then
    break
  fi
  kill -0 "$BACKEND_PID" 2>/dev/null || { error "El backend terminó inesperadamente"; exit 1; }
  sleep 1
done
if ! curl -s -o /dev/null --max-time 1 "http://localhost:$PORT/api/health"; then
  error "El backend no respondió en :$PORT"
  exit 1
fi
info "Backend listo ✅"

# --- Frontend ---
if [ ! -d node_modules ]; then
  info "Instalando dependencias del frontend (solo la primera vez)..."
  npm install
fi

info "Arrancando frontend: http://localhost:5173/  (Ctrl+C para parar ambos)"
npm run dev
