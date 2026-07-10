import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.db import init_db
from app.llm import (
    ChatMessage,
    ChatResponse,
    LLMConfigError,
    generate_chat_response,
)
from app.registry import DocumentTemplate, get_document, init_registry

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = BACKEND_ROOT / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_registry()
    yield


app = FastAPI(title="Prelegal", lifespan=lifespan)

# The frontend is served from the same origin in production, so CORS is only
# needed for local development against `next dev` (http://localhost:3000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    documentType: str | None = None
    fields: dict[str, str] = {}


@app.get("/api/documents/{filename}")
def get_document_template(filename: str) -> DocumentTemplate:
    """Return a supported document's metadata, field list, and raw template so
    the frontend can render a live preview and PDF for it."""
    doc = get_document(filename)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document: {filename}")
    return doc


@app.post("/api/chat")
def chat(request: ChatRequest) -> ChatResponse:
    """Advance the document-drafting conversation by one turn.

    Runs a single structured-output LLM call and returns the assistant reply,
    the resolved document type, and a patch of fields to merge into the document.
    """
    try:
        return generate_chat_response(
            request.messages, request.documentType, request.fields
        )
    except LLMConfigError as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "The AI assistant is not configured. Set OPENROUTER_API_KEY and "
                "restart the app to enable chat."
            ),
        ) from exc
    except Exception as exc:  # noqa: BLE001 - surface any LLM/provider failure as 502
        logger.exception("Chat request failed")
        raise HTTPException(
            status_code=502,
            detail="The AI assistant is temporarily unavailable. Please try again.",
        ) from exc


if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
