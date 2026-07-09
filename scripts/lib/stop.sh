#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="prelegal"

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

echo "Prelegal stopped."
