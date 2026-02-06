./#!/usr/bin/env bash
# Start Postgres in Docker, then backend and frontend on the host with hot reload.
# Prerequisites: Node 20+, npm install in backend/ and frontend/
# From project root: ./scripts/dev-local.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Starting Postgres in Docker..."
docker compose up postgres -d

echo "==> Waiting for Postgres to be ready..."
sleep 3
until docker compose exec -T postgres pg_isready -U "${DATABASE_USER:-hlogger}" 2>/dev/null; do
  echo "    waiting for postgres..."
  sleep 2
done
echo "    Postgres is ready."

# Load .env so backend/frontend see DATABASE_* etc.
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

cleanup() {
  echo ""
  echo "==> Stopping backend (PID $BE_PID)..."
  kill "$BE_PID" 2>/dev/null || true
  echo "==> Done. Postgres is still running (stop with: docker compose stop postgres)"
  exit 0
}
trap cleanup INT TERM

echo "==> Starting backend (hot reload) in background..."
(cd backend && npm run start:dev) &
BE_PID=$!

echo "==> Waiting for backend to be up..."
sleep 5
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:${API_PORT:-3000}/api/v1/health 2>/dev/null | grep -q 200; then
    echo "    Backend is up."
    break
  fi
  [ "$i" -eq 30 ] && echo "    (Backend may still be compiling; frontend will start anyway.)"
  sleep 2
done

echo "==> Starting frontend (hot reload) in foreground (Ctrl+C to stop all)..."
echo "    Frontend: http://localhost:${WEB_PORT:-4200}"
echo "    API:      http://localhost:${API_PORT:-3000}"
echo ""
(cd frontend && npm start)
cleanup
