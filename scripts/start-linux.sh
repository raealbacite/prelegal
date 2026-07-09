#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"

docker build -t "$IMAGE_NAME" .

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

ENV_ARGS=()
if [ -f .env ]; then
  ENV_ARGS+=(--env-file .env)
fi

docker run -d --name "$CONTAINER_NAME" -p 8000:8000 "${ENV_ARGS[@]}" "$IMAGE_NAME"

echo "Prelegal is running at http://localhost:8000"
