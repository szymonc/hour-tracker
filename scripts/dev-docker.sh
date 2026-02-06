#!/usr/bin/env bash
# Run the full stack in Docker with hot reload (Postgres + API + frontend).
# From project root: ./scripts/dev-docker.sh

set -e
cd "$(dirname "$0")/.."

echo "==> Starting full stack in Docker (dev mode with hot reload)..."
echo "    Frontend: http://localhost:${WEB_PORT:-4200}"
echo "    API:      http://localhost:${API_PORT:-3000}"
echo "    Ctrl+C to stop."
echo ""
exec docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
