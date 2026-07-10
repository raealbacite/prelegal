# --- Frontend build stage ---
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Backend stage ---
FROM python:3.12-slim AS backend
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project

COPY backend/app ./app
COPY --from=frontend-build /app/frontend/out ./static

# The registry reads catalog.json + templates/ from the repo root at startup;
# place them as siblings of /app/backend so REPO_ROOT resolves the same as in dev.
COPY catalog.json /app/catalog.json
COPY templates /app/templates

EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
