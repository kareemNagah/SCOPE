#!/usr/bin/env bash
#
# scope-dev.sh — start / restart SCOPE Studio inside WSL (native Docker + Vite)
#
# Usage:
#   bash scripts/scope-dev.sh              # smart: rebuild only if deps changed, ensure backend+db up, start frontend
#   bash scripts/scope-dev.sh --force-build# force a docker image rebuild even if nothing changed
#   bash scripts/scope-dev.sh --no-build   # never rebuild; just (re)start with the existing image
#   bash scripts/scope-dev.sh --skip-docker# frontend only (after AI code edits)
#   bash scripts/scope-dev.sh --stop       # stop everything (docker down + kill frontend)
#
# Backend app code is volume-mounted with `uvicorn --reload`, so edits under
# backend/app are picked up live — only Dockerfile/requirements.txt changes
# trigger a rebuild (tracked via a fingerprint in .scope-dev/).
#
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
step() { echo -e "\n${CYAN}>> $1${NC}"; }
ok()   { echo -e "${GREEN}   $1${NC}"; }
warn() { echo -e "${YELLOW}   $1${NC}"; }
err()  { echo -e "${RED}   $1${NC}"; }

# Resolve repo root (this script lives in <root>/scripts)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NO_BUILD=0
FORCE_BUILD=0
SKIP_DOCKER=0
STOP=0
for arg in "$@"; do
  case "$arg" in
    --no-build)    NO_BUILD=1 ;;
    --force-build) FORCE_BUILD=1 ;;
    --skip-docker) SKIP_DOCKER=1 ;;
    --fe)          SKIP_DOCKER=1 ;;
    --stop)        STOP=1 ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── helpers ──────────────────────────────────────────────────────────────────

free_port() {
  local port="$1"
  local pids
  pids=$(ss -ltnpH "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)
  for pid in $pids; do
    kill "$pid" 2>/dev/null && warn "killed PID $pid on :$port" || true
  done
}

docker_ready() { docker info >/dev/null 2>&1; }

# True if a compose service's container exists and is running.
service_running() {
  local svc="$1" cid
  cid=$(docker compose ps -q "$svc" 2>/dev/null) || return 1
  [ -n "$cid" ] || return 1
  [ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null)" = "true" ]
}

# Fingerprint of the inputs that require an image REBUILD (not live-reloaded).
# Backend app code is volume-mounted with `uvicorn --reload`, so only the
# Dockerfile and requirements.txt changing should trigger a rebuild.
FP_FILE=".scope-dev/backend.fingerprint"
build_fingerprint() {
  cat backend/Dockerfile backend/requirements.txt 2>/dev/null | sha256sum | cut -d' ' -f1
}
needs_rebuild() {
  local current stored
  current=$(build_fingerprint)
  stored=$(cat "$FP_FILE" 2>/dev/null || true)
  [ "$current" != "$stored" ]
}
save_fingerprint() {
  mkdir -p "$(dirname "$FP_FILE")"
  build_fingerprint > "$FP_FILE"
}

check_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is not installed in WSL. Run:  npm run docker:install"
    exit 1
  fi
  if ! docker_ready; then
    err "Cannot talk to the Docker daemon."
    echo ""
    warn "If you JUST installed Docker, restart WSL so your user joins the 'docker' group:"
    echo "      Windows PowerShell ->  wsl --shutdown   (then reopen Ubuntu)"
    warn "Or start the service:  sudo systemctl start docker"
    exit 1
  fi
}

# ── stop mode ────────────────────────────────────────────────────────────────
if [ "$STOP" -eq 1 ]; then
  step "Stopping frontend (ports 8080/8081)..."
  free_port 8080; free_port 8081
  step "Stopping Docker services..."
  if command -v docker >/dev/null 2>&1 && docker_ready; then
    docker compose down || true
    ok "Docker services stopped."
  else
    warn "Docker not reachable; skipped compose down."
  fi
  ok "Stopped."
  exit 0
fi

# ── 1. free ports ────────────────────────────────────────────────────────────
# Leave :8000 alone here. In the WSL2 setup it is Docker Compose's published
# API port, and killing its listener can break a running container's port proxy.
step "Freeing frontend ports 8080 and 8081..."
free_port 8080; free_port 8081

# ── 2. ensure backend/.env ───────────────────────────────────────────────────
if [ ! -f backend/.env ]; then
  err "backend/.env is missing. Create it with at least OPENROUTER_API_KEY (see CLAUDE.md)."
  exit 1
fi

# ── 3. docker (backend + db) ─────────────────────────────────────────────────
if [ "$SKIP_DOCKER" -eq 0 ]; then
  check_docker

  # Decide whether the image needs a rebuild. App code is volume-mounted and
  # hot-reloaded, so only Dockerfile / requirements.txt changes matter.
  REBUILD=0
  if [ "$NO_BUILD" -eq 1 ]; then
    warn "Build disabled (--no-build); using existing image."
  elif [ "$FORCE_BUILD" -eq 1 ]; then
    REBUILD=1; warn "Forcing image rebuild (--force-build)."
  elif needs_rebuild; then
    REBUILD=1; warn "Backend Dockerfile/requirements changed -> rebuilding image."
  else
    ok "No dependency changes; reusing existing image."
  fi

  if [ "$REBUILD" -eq 1 ]; then
    step "Building & (re)starting Docker services (db + api)..."
    # --build recreates only services whose image/config changed; db stays up.
    docker compose up -d --build
    save_fingerprint
  elif service_running api && service_running db; then
    step "Containers already running; ensuring they're up..."
    docker compose up -d        # idempotent: starts anything stopped, no recreate
  else
    step "Starting Docker services (db + api)..."
    docker compose up -d
    # First successful start with the current deps -> record fingerprint.
    [ "$NO_BUILD" -eq 1 ] || save_fingerprint
  fi

  step "Waiting for API on http://localhost:8000 ..."
  attempts=0
  api_up=0
  until curl -fsS --max-time 2 -o /dev/null http://localhost:8000/docs 2>/dev/null; do
    # Fail fast if the api container has died instead of waiting the full 60s.
    if ! service_running api; then
      err "API container is not running. Recent logs:"
      docker compose logs --tail 30 api || true
      break
    fi
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 30 ]; then
      err "API did not become ready after 60s. Check logs:  docker compose logs api"
      break
    fi
    sleep 2
    echo "   ... $((attempts * 2))s"
  done
  if curl -fsS --max-time 2 -o /dev/null http://localhost:8000/docs 2>/dev/null; then
    api_up=1; ok "API is ready."
  else
    err "API is NOT responding. Frontend will still start, but calls will fail."
  fi
else
  warn "Skipping Docker (frontend only)."
fi

# ── 4. frontend (Vite) ───────────────────────────────────────────────────────
step "Starting Vite frontend..."
echo ""
echo -e "   Frontend : ${GREEN}http://localhost:8080${NC}  (or 8081 if 8080 is busy)"
echo -e "   Backend  : ${GREEN}http://localhost:8000${NC}"
echo -e "   API docs : ${GREEN}http://localhost:8000/docs${NC}"
echo ""

if command -v bun >/dev/null 2>&1; then
  exec bun run dev
else
  exec npm run dev
fi
