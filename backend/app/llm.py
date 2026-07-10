"""AI chat integration for drafting any supported legal document from a
free-form conversation.

A single LLM call per turn (LiteLLM -> OpenRouter -> openrouter/openai/gpt-oss-120b,
pinned to Cerebras as the inference provider) returns a Structured Output with
the assistant's reply, the document type it has settled on (if any), and a patch
of field values to apply. There is no streaming: Cerebras is fast enough that one
blocking call per turn is sufficient.

The chat is document-type agnostic: the assistant first figures out which of the
supported documents the user wants (redirecting unsupported requests to the
closest supported one), then collects that document's fields. Field names come
from the template registry, so the same code path drives all 12 documents.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

import litellm
from pydantic import BaseModel, ValidationError

from app.registry import (
    MNDA_FILENAME,
    MNDA_FILENAMES,
    catalog_summary,
    get_document,
)

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"

# Force OpenRouter to route to Cerebras and never silently fall back to another
# provider, per the project's inference requirements.
PROVIDER_ROUTING = {"provider": {"order": ["Cerebras"], "allow_fallbacks": False}}

# Cerebras is fast, so a generous-but-bounded timeout keeps a hung provider from
# tying up a request worker indefinitely (fallbacks are disabled above).
REQUEST_TIMEOUT_SECONDS = 60


class LLMConfigError(RuntimeError):
    """Raised when the LLM cannot be called because it is not configured."""


class LLMResponseError(RuntimeError):
    """Raised when the model's response cannot be turned into a ChatResponse."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class _FieldEntry(BaseModel):
    """One field the model wants to set this turn. A name/value list (rather than
    an open-ended object) keeps the response schema fixed, which strict Structured
    Outputs requires."""

    name: str
    value: str


class _LLMChatResponse(BaseModel):
    """The raw Structured Output shape requested from the model each turn."""

    reply: str
    documentType: str | None = None
    fields: list[_FieldEntry] = []


class ChatResponse(BaseModel):
    """The sanitized response returned to the caller (and the HTTP client):
    the reply, the resolved document filename (or null), and a field patch as a
    plain dict. Omitted fields leave existing values unchanged on the client."""

    reply: str
    documentType: str | None = None
    fields: dict[str, str] = {}


_ROLE_PREAMBLE = """\
You are a friendly legal-document assistant that helps a user draft a legal \
agreement, entirely through conversation instead of a form. You work only from a \
fixed catalog of supported document templates, shown below."""

_SELECTION_RULES = """\
Choosing the document:
- First figure out which ONE of the supported documents above the user wants. \
Ask what they are trying to accomplish if it is not yet clear.
- Once you are confident, set "documentType" to that document's exact filename \
(for any Non-Disclosure Agreement, always use "mutual-nda.md").
- If the user asks for a document that is NOT in the list above (for example an \
employment contract or a will), tell them plainly that you can't generate that \
one, then offer the closest supported document from the list and ask if they'd \
like to use it. Do not set "documentType" until they agree to a supported one."""

_GENERAL_GUIDELINES = """\
General guidelines:
- Only include a field in the patch when you have a concrete value for it. Omit \
fields you don't know yet (do not invent names, dates, or terms).
- You MAY proactively suggest sensible legal defaults, but present them as \
suggestions and let the user confirm or change them before treating them as \
final.
- Carry forward values already collected (shown below when a document is chosen); \
only change a field when the user asks you to.
- Keep replies concise and warm.
- IMPORTANT: Whenever you still need more information to finish the document, you \
MUST end your reply with a specific follow-up question about what you need next — \
never leave the user without a clear question to answer. Only once every needed \
field is filled should you instead tell them the document is ready to download."""


def _render_current_fields(fields: dict[str, str]) -> str:
    if not fields:
        return "No fields have been collected yet."
    return json.dumps(fields, indent=2)


def build_system_prompt(document_type: str | None, fields: dict[str, str]) -> str:
    parts = [_ROLE_PREAMBLE, "Supported documents:\n" + catalog_summary(), _SELECTION_RULES]

    doc = get_document(document_type) if document_type else None
    if doc is not None:
        field_lines = "\n".join(
            f"- {v.name}" + (f": {v.description}" if v.description else "")
            for v in doc.variables
        )
        parts.append(
            f"You are currently drafting: {doc.name} (documentType "
            f'"{doc.filename}"). Keep documentType set to this unless the user '
            f"clearly asks for a different document.\n\n"
            "Collect these fields (return them under \"fields\" as name/value "
            f"pairs, using exactly these names):\n{field_lines}\n\n"
            "Ask about missing information a few items at a time — do not "
            "interrogate the user with one giant list."
        )
        parts.append("Fields collected so far:\n" + _render_current_fields(fields))
    else:
        parts.append(
            "No document has been chosen yet. Focus on identifying the right "
            "document; do not collect fields until one is chosen."
        )

    parts.append(_GENERAL_GUIDELINES)
    return "\n\n".join(parts)


def _sanitize(raw: _LLMChatResponse, current_document_type: str | None) -> ChatResponse:
    """Clamp the model output to known documents/fields so a hallucinated
    document filename or field name can never corrupt state."""
    document_type = current_document_type
    if raw.documentType:
        candidate = raw.documentType.strip()
        if candidate in MNDA_FILENAMES:
            document_type = MNDA_FILENAME
        elif get_document(candidate) is not None:
            document_type = candidate

    fields: dict[str, str] = {}
    doc = get_document(document_type) if document_type else None
    if doc is not None:
        known = {v.name for v in doc.variables}
        for entry in raw.fields:
            if entry.name in known and entry.value.strip():
                fields[entry.name] = entry.value

    return ChatResponse(reply=raw.reply, documentType=document_type, fields=fields)


def generate_chat_response(
    messages: list[ChatMessage],
    document_type: str | None,
    fields: dict[str, str],
) -> ChatResponse:
    """Run one structured-output completion and return the reply, resolved
    document type, and a field patch.

    Raises LLMConfigError if OPENROUTER_API_KEY is not set. Any other failure
    (network, provider, parsing) propagates to the caller.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise LLMConfigError("OPENROUTER_API_KEY is not set")

    system_content = build_system_prompt(document_type, fields)
    convo = [{"role": "system", "content": system_content}]
    convo += [{"role": m.role, "content": m.content} for m in messages]

    response = litellm.completion(
        model=MODEL,
        messages=convo,
        api_key=api_key,
        response_format=_LLMChatResponse,
        temperature=0.3,
        timeout=REQUEST_TIMEOUT_SECONDS,
        extra_body=PROVIDER_ROUTING,
    )

    content = response.choices[0].message.content
    if not content:
        logger.error("LLM returned an empty response")
        raise LLMResponseError("The model returned an empty response.")
    try:
        raw = _LLMChatResponse.model_validate_json(content)
    except ValidationError as exc:
        logger.error("Could not parse LLM structured output: %s", content[:1000])
        raise LLMResponseError("The model returned a malformed response.") from exc

    return _sanitize(raw, document_type)
