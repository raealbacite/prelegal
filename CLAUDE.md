# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the `templates` directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the `catalog.json` file in the project root, included here:

@catalog.json

The current implementation on `main` is a multi-user Legal Document Creator driven by a free-form AI chat that supports all 12 document types in `catalog.json`: the assistant figures out which supported document the user wants (redirecting unsupported requests to the closest supported one), gathers the fields conversationally, and populates a live preview that downloads as a PDF. The chat is backed by a document-type-aware `POST /api/chat` endpoint (LiteLLM → OpenRouter `openrouter/openai/gpt-oss-120b` via Cerebras, Structured Outputs). Users sign up and sign in with a real email/password account (bcrypt + JWT), can save generated documents and revisit them from a "My Documents" history, and every screen carries a draft-only legal disclaimer. This runs on the V1 technical foundation: a Dockerized FastAPI/uv backend, SQLite rebuilt on each start (so accounts and saved documents live for the lifetime of a server run), and start/stop scripts.

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

### PL-6 — ✅ Completed (merged via [PR #7](https://github.com/raealbacite/prelegal/pull/7))

- Expanded from Mutual-NDA-only to **all 12 document types** in `catalog.json` via one document-type-aware `POST /api/chat`. The assistant conversationally identifies which supported document the user wants, redirects requests for unsupported types (e.g. an employment contract) to the closest supported one, and guides field collection
- Startup **template registry** (`backend/app/registry.py`) parses `catalog.json` + `templates/*.md`, auto-deriving each document's fields from the `<span class="..._link">Label</span>` markers (with possessive/plural normalization). The Mutual NDA keeps an explicit field set so its bespoke renderer is unchanged
- The chat response is now `{reply, documentType, fields}`; the model returns a schema-safe `list[{name,value}]` that the backend sanitizes (clamping `documentType`/field names to the registry) into a field patch
- New `GET /api/documents/{filename}` serves a document's metadata, field list, and raw template so the frontend can render a **generic template-fill preview + PDF** (`GenericPreview`/`GenericPdfDocument`) for the 11 non-NDA docs; the Mutual NDA keeps its bespoke `NDAPreview`/`NdaPdfDocument` via a deterministic bag→`NDAFormData` adapter. `NdaCreator` was replaced by `DocumentCreator`
- **Two fixes shipped with PL-6:** focus returns to the chat input after every assistant reply (success or error); the assistant always ends with a follow-up question when it still needs information (system-prompt rule)
- Fixed the `Dockerfile` to copy `catalog.json` + `templates/` into the image (the registry reads them at startup)

### PL-7 — ✅ Completed (merged to `main`)

- **Real authentication** replaces the fake login screen. New `backend/app/auth.py`: bcrypt password hashing, JWT (HS256) bearer tokens, case-insensitive emails, and a `get_current_user` dependency. Endpoints `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`; the `users` table is now populated. `/api/chat` is also auth-gated so the costed LLM calls require a signed-in user
- **Document persistence.** New `documents` table + `backend/app/documents_store.py` (user-scoped save/list/get/delete). Endpoints `GET/POST /api/documents` and `GET/DELETE /api/documents/{id}`. A saved document is `{title, documentType, fields}`; the DB still resets on restart, so this is session-lifetime persistence (per the ticket). The template-metadata endpoint moved from `GET /api/documents/{filename}` to **`GET /api/templates/{filename}`** to free up `/api/documents` for saved docs
- **Frontend.** `AuthProvider`/`useAuth` context, a branded sign-in/sign-up screen, token in `localStorage`, and automatic sign-out when any authed request returns 401 (stale sessions are expected because the DB resets on restart). A `DocumentCreator` **Save** button plus auto-save on PDF download, and a **My Documents** history view (open/delete). The creator stays mounted while browsing history so an in-progress draft is never lost. A shared `lib/api.ts` `apiFetch`/token layer that `chat.ts` and `documentClient.ts` were refactored onto
- **SaaS polish.** The brand palette is registered as Tailwind tokens (`accent-yellow`/`blue-primary`/`purple-secondary`/`navy`/`gray-text`); purple submit buttons, navy headings, and a persistent "draft only — not legal advice" disclaimer banner on every screen
- Tests isolate the DB via `backend/tests/conftest.py`; **43 backend tests and 84 frontend tests pass**; lint, typecheck, and static build clean

### ⬜ Not yet built

- Persistence that survives a server restart (the DB is intentionally rebuilt on each start)
- Password reset / email verification, and account management (change password, delete account)

## Current API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/signup` - Register an account (email + password ≥8 chars); returns a JWT `token` and the `user` (201; 409 if the email is taken; 422 on invalid input)
- `POST /api/auth/login` - Authenticate; returns a JWT `token` and the `user` (401 on bad credentials)
- `GET /api/auth/me` - Return the signed-in user; used to validate a stored token (401 if missing/invalid/expired)
- `GET /api/documents` - List the signed-in user's saved documents, newest first (auth required)
- `POST /api/documents` - Save a document (`title`, `documentType`, `fields`) for the signed-in user (201; auth required)
- `GET /api/documents/{id}` - Return one of the signed-in user's saved documents with its field values (404 if not theirs; auth required)
- `DELETE /api/documents/{id}` - Delete one of the signed-in user's saved documents (204; 404 if not theirs; auth required)
- `GET /api/templates/{filename}` - Return a supported document template's metadata, auto-derived field list, and raw markdown (404 if unknown). *(Renamed from `GET /api/documents/{filename}` in PL-7.)*
- `POST /api/chat` - Advance the document-drafting conversation by one turn (**auth required**). Request carries `messages`, the current `documentType` (nullable), and the collected `fields`; returns the assistant `reply`, the resolved `documentType`, and a patch of `fields` (401 if unauthenticated, 503 if `OPENROUTER_API_KEY` is unset, 502 on LLM failure)

## Latest Update (2026-07-10)

PL-7 is merged to `main`. The app is now a **multi-user** Legal Document Creator: users sign up / sign in with real email-password accounts (bcrypt + JWT), the assistant chat is auth-gated, and generated documents can be saved and revisited from a "My Documents" history (session-lifetime, since the DB rebuilds on restart). The fake login screen is gone; a shared `apiFetch`/token layer backs the frontend, stale sessions auto-sign-out on a 401, and the brand palette + a persistent draft-only disclaimer give every screen a consistent SaaS look. The template-metadata endpoint moved to `GET /api/templates/{filename}` to free `/api/documents` for saved docs. Verified end-to-end in the Docker container (signup → auth-gated chat → save → My Documents) plus case-insensitive login; 43 backend tests and 84 frontend tests pass, with lint/typecheck/static build clean.

Next up (not yet built): persistence that survives a restart, and account management (password reset, change/delete account).
