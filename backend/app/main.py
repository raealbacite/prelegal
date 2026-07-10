import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app import auth, documents_store
from app.auth import (
    AuthError,
    AuthResponse,
    EmailTakenError,
    InvalidCredentialsError,
    InvalidTokenError,
    LoginRequest,
    SignupRequest,
    UserOut,
)
from app.db import init_db
from app.documents_store import (
    DocumentDetail,
    DocumentSummary,
    SaveDocumentRequest,
)
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


# --- Authentication -------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> UserOut:
    """Resolve the signed-in user from the Bearer token, or raise 401.

    Used as a dependency to protect the document-persistence endpoints.
    """
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    try:
        user_id = auth.decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token.") from exc
    user = auth.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Account no longer exists.")
    return user


@app.post("/api/auth/signup", status_code=201)
def signup(request: SignupRequest) -> AuthResponse:
    """Register a new account and return a token plus the created user."""
    try:
        user = auth.create_user(request.email, request.password)
    except EmailTakenError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    token = auth.create_access_token(user.id)
    return AuthResponse(token=token, user=user)


@app.post("/api/auth/login")
def login(request: LoginRequest) -> AuthResponse:
    """Authenticate an existing account and return a token plus the user."""
    try:
        user = auth.authenticate(request.email, request.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    token = auth.create_access_token(user.id)
    return AuthResponse(token=token, user=user)


@app.get("/api/auth/me")
def me(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    """Return the currently authenticated user (used to validate a stored token)."""
    return current_user


# --- Saved documents ------------------------------------------------------


@app.get("/api/documents")
def list_saved_documents(
    current_user: UserOut = Depends(get_current_user),
) -> list[DocumentSummary]:
    """List the signed-in user's saved documents, newest first."""
    return documents_store.list_documents(current_user.id)


@app.post("/api/documents", status_code=201)
def save_document(
    request: SaveDocumentRequest,
    current_user: UserOut = Depends(get_current_user),
) -> DocumentDetail:
    """Persist a generated document for the signed-in user."""
    return documents_store.create_document(current_user.id, request)


@app.get("/api/documents/{document_id}")
def get_saved_document(
    document_id: int,
    current_user: UserOut = Depends(get_current_user),
) -> DocumentDetail:
    """Return one of the signed-in user's saved documents by id."""
    doc = documents_store.get_document(current_user.id, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


@app.delete("/api/documents/{document_id}", status_code=204)
def delete_saved_document(
    document_id: int,
    current_user: UserOut = Depends(get_current_user),
) -> None:
    """Delete one of the signed-in user's saved documents."""
    if not documents_store.delete_document(current_user.id, document_id):
        raise HTTPException(status_code=404, detail="Document not found.")


# --- Templates & chat -----------------------------------------------------


@app.get("/api/templates/{filename}")
def get_document_template(filename: str) -> DocumentTemplate:
    """Return a supported document template's metadata, field list, and raw
    markdown so the frontend can render a live preview and PDF for it."""
    doc = get_document(filename)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Unknown document: {filename}")
    return doc


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    documentType: str | None = None
    fields: dict[str, str] = {}


@app.post("/api/chat")
def chat(
    request: ChatRequest,
    current_user: UserOut = Depends(get_current_user),
) -> ChatResponse:
    """Advance the document-drafting conversation by one turn.

    Requires authentication so the costed LLM calls are only made for signed-in
    users. Runs a single structured-output LLM call and returns the assistant
    reply, the resolved document type, and a patch of fields to merge in.
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
