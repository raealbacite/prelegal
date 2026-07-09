# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the `templates` directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the `catalog.json` file in the project root, included here:

@catalog.json

The current implementation has the Mutual NDA Creator as a client-side prototype (manual form, live preview, PDF download) and the V1 technical foundation (Docker, FastAPI/uv backend, SQLite, start/stop scripts, fake login screen). AI chat, the remaining 10 document types, real authentication, and document persistence have not been built yet.

## Development process

When instructed to build a feature:

1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an `OPENROUTER_API_KEY` in the `.env` file in the project root.

## Technical design

- The entire project should be packaged into a Docker container.
- The backend should be in `backend/` and be a `uv` project, using FastAPI.
- The frontend should be in `frontend/`
- The database should use SQLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.
- Consider statically building the frontend and serving it via FastAPI, if that will work.
- There should be scripts in `scripts/` for:

```
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

- Backend available at http://localhost:8000

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

### Completed (PL-2)

- CommonPaper legal agreement templates added to `templates/`

### Completed (PL-3)

- Mutual NDA Creator prototype: manual form, live preview, and PDF download
- Client-side only, no backend involved

### Completed (PL-4)

- Docker multi-stage build (Node frontend build stage + Python/uv backend stage)
- FastAPI backend in `backend/` (uv project) with a `GET /api/health` endpoint
- SQLite database recreated from scratch on every backend startup, with an empty `users` table (schema only — no signup/signin logic yet)
- Next.js static export (`output: "export"`) served by FastAPI at `http://localhost:8000`
- Fake login screen (name/email, no validation, no backend call) that gates entry to the Mutual NDA Creator — real authentication is not implemented
- Start/stop scripts for Mac, Linux, and Windows (`scripts/`)

### Not yet built

- Real authentication (signup/signin/signout, JWT, password hashing) and the `users` table logic
- AI chat interface and Cerebras/OpenRouter integration
- Support for the other 10 document types from catalog.json
- Document persistence (save/load/delete)

## Current API Endpoints

- `GET /api/health` - Health check
