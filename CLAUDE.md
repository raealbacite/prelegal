# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the `templates` directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the `catalog.json` file in the project root, included here:

@catalog.json

The current implementation on `main` is a Legal Document Creator driven by a free-form AI chat that supports all 12 document types in `catalog.json`: the assistant figures out which supported document the user wants (redirecting unsupported requests to the closest supported one), gathers the fields conversationally, and populates a live preview that downloads as a PDF. The chat is backed by a document-type-aware `POST /api/chat` endpoint (LiteLLM → OpenRouter `openrouter/openai/gpt-oss-120b` via Cerebras, Structured Outputs). This runs on the V1 technical foundation: a Dockerized FastAPI/uv backend, SQLite rebuilt on each start, start/stop scripts, and a fake login screen gating the app. Real authentication and document persistence have not been built yet.

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

### PL-2 — ✅ Completed

- CommonPaper legal agreement templates added to `templates/`

### PL-3 — ✅ Completed

- Mutual NDA Creator prototype: manual form, live preview, and PDF download
- Client-side only, no backend involved

### PL-4 — ✅ Completed (merged via [PR #5](https://github.com/raealbacite/prelegal/pull/5))

- Docker multi-stage build (Node frontend build stage + Python/uv backend stage)
- FastAPI backend in `backend/` (uv project) with a `GET /api/health` endpoint
- SQLite database recreated from scratch on every backend startup, with an empty `users` table (schema only — no signup/signin logic yet)
- Next.js static export (`output: "export"`) served by FastAPI at `http://localhost:8000`
- Fake login screen (name/email, no validation, no backend call) that gates entry to the Mutual NDA Creator — real authentication is not implemented
- Start/stop scripts for Mac, Linux, and Windows (`scripts/`)

### PL-5 — ✅ Completed (merged via [PR #6](https://github.com/raealbacite/prelegal/pull/6))

- Replaced the manual Mutual NDA form with a free-form AI chat (`ChatPanel`) that populates the document from the conversation; live preview and PDF download unchanged
- `POST /api/chat`: a single structured-output call per turn (LiteLLM → OpenRouter `openrouter/openai/gpt-oss-120b`, pinned to Cerebras, no streaming) returning the assistant `reply` plus a patch of NDA fields, merged client-side so null/omitted values never overwrite existing ones
- Assistant suggests sensible legal defaults but confirms before finalizing; graceful in-chat error (503 when `OPENROUTER_API_KEY` is unset, 502 on any LLM failure) with the preview still usable
- Still Mutual NDA only; `litellm` added to the backend; LLM logic isolated in `backend/app/llm.py`

### PL-6 — ✅ Completed

- Expanded from Mutual-NDA-only to **all 12 document types** in `catalog.json` via one document-type-aware `POST /api/chat`. The assistant conversationally identifies which supported document the user wants, redirects requests for unsupported types (e.g. an employment contract) to the closest supported one, and guides field collection
- Startup **template registry** (`backend/app/registry.py`) parses `catalog.json` + `templates/*.md`, auto-deriving each document's fields from the `<span class="..._link">Label</span>` markers (with possessive/plural normalization). The Mutual NDA keeps an explicit field set so its bespoke renderer is unchanged
- The chat response is now `{reply, documentType, fields}`; the model returns a schema-safe `list[{name,value}]` that the backend sanitizes (clamping `documentType`/field names to the registry) into a field patch
- New `GET /api/documents/{filename}` serves a document's metadata, field list, and raw template so the frontend can render a **generic template-fill preview + PDF** (`GenericPreview`/`GenericPdfDocument`) for the 11 non-NDA docs; the Mutual NDA keeps its bespoke `NDAPreview`/`NdaPdfDocument` via a deterministic bag→`NDAFormData` adapter. `NdaCreator` was replaced by `DocumentCreator`
- **Two fixes shipped with PL-6:** focus returns to the chat input after every assistant reply (success or error); the assistant always ends with a follow-up question when it still needs information (system-prompt rule)
- Fixed the `Dockerfile` to copy `catalog.json` + `templates/` into the image (the registry reads them at startup)

### ⬜ Not yet built

- Real authentication (signup/signin/signout, JWT, password hashing) and the `users` table logic
- Document persistence (save/load/delete)

## Current API Endpoints

- `GET /api/health` - Health check
- `GET /api/documents/{filename}` - Return a supported document's metadata, auto-derived field list, and raw template (404 if unknown)
- `POST /api/chat` - Advance the document-drafting conversation by one turn. Request carries `messages`, the current `documentType` (nullable), and the collected `fields`; returns the assistant `reply`, the resolved `documentType`, and a patch of `fields` (503 if `OPENROUTER_API_KEY` is unset, 502 on LLM failure)

## Latest Update (2026-07-10)

PL-6 is complete (branch `pl-6-all-document-types`). The app is now a Legal Document Creator supporting all 12 `catalog.json` types through a single document-type-aware chat: the assistant identifies the right document (redirecting unsupported requests to the closest supported one) and guides field collection. A startup registry parses the templates to auto-derive fields; non-NDA documents render via a generic template-fill preview/PDF while the Mutual NDA keeps its bespoke renderer via an adapter. Also shipped: focus returns to the chat input after each reply, and the assistant always asks a follow-up question when it needs more info. Verified end-to-end against the real OpenRouter/Cerebras key (unsupported-doc redirection, generic CSA field collection, and MNDA structured fields) plus a full Docker build; 63 frontend tests and 26 backend tests pass.

Next up (not yet built): real authentication + `users` logic, and document persistence.
