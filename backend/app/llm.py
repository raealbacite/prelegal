"""AI chat integration for populating a Mutual NDA from a free-form conversation.

A single LLM call (LiteLLM -> OpenRouter -> openrouter/openai/gpt-oss-120b, pinned
to Cerebras as the inference provider) returns a Structured Output containing both
the assistant's reply and a patch of NDA field values to apply. There is no
streaming: Cerebras is fast enough that one blocking call per turn is sufficient.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

import litellm
from pydantic import BaseModel, ValidationError

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


class PartyPatch(BaseModel):
    companyName: str | None = None
    printName: str | None = None
    title: str | None = None
    noticeAddress: str | None = None


class NdaFieldsPatch(BaseModel):
    """A patch of NDA fields. Every field is optional; omitted fields are left
    unchanged. Mirrors the frontend NDAFormData shape (camelCase on purpose)."""

    partyA: PartyPatch | None = None
    partyB: PartyPatch | None = None
    purpose: str | None = None
    effectiveDate: str | None = None
    mndaTermType: Literal["duration", "untilTerminated"] | None = None
    mndaTermDuration: str | None = None
    confidentialityTermType: Literal["duration", "perpetual"] | None = None
    confidentialityTermDuration: str | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None


class ChatResponse(BaseModel):
    """The single structured output returned by the model each turn."""

    reply: str
    fields: NdaFieldsPatch


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


SYSTEM_PROMPT = """\
You are a friendly legal-document assistant that helps a user draft a Mutual \
Non-Disclosure Agreement (MNDA) based on the Common Paper standard MNDA. You do \
this entirely through conversation instead of a form.

Your job each turn is to (1) reply conversationally and (2) return a patch of any \
NDA fields you can now fill in, based on what the user has told you.

The fields you are gathering (return them under "fields"; use exactly these keys):
- partyA / partyB: each an object with companyName, printName (signer's name), \
title, noticeAddress.
- purpose: what the parties will use the confidential information for.
- effectiveDate: ISO date "YYYY-MM-DD".
- mndaTermType: "duration" (the MNDA expires after a set time) or \
"untilTerminated" (continues until terminated).
- mndaTermDuration: e.g. "2 year(s)" — only meaningful when mndaTermType is \
"duration".
- confidentialityTermType: "duration" or "perpetual".
- confidentialityTermDuration: e.g. "3 year(s)" — only meaningful when \
confidentialityTermType is "duration".
- governingLaw: a US state, e.g. "Delaware".
- jurisdiction: the courts, e.g. "the state and federal courts located in New \
Castle County, Delaware".
- modifications: optional free-text changes to the standard terms.

Guidelines:
- Only include a field in the patch when you have a concrete value for it. Omit \
fields you don't know yet (do not guess party names or dates).
- You MAY proactively suggest sensible legal defaults (for example: Delaware \
governing law with New Castle County courts, a 2-year MNDA term, a 3-year \
confidentiality term), but present them as suggestions and let the user confirm \
or change them before treating them as final. It is fine to fill a suggested \
default into the patch once the user has agreed to it.
- Ask about missing information conversationally, a few items at a time — do not \
interrogate the user with one giant list.
- Carry forward values that are already collected (shown below); only change a \
field when the user asks you to.
- When all required details are gathered (both company names, purpose, effective \
date, governing law, jurisdiction, and the two term choices), let the user know \
the document is ready to download.
- Keep replies concise and warm."""


def _render_current_fields(current_fields: NdaFieldsPatch) -> str:
    filled = current_fields.model_dump(exclude_none=True)
    if not filled:
        return "No fields have been collected yet."
    return json.dumps(filled, indent=2)


def generate_chat_response(
    messages: list[ChatMessage],
    current_fields: NdaFieldsPatch,
) -> ChatResponse:
    """Run one structured-output completion and return the reply + field patch.

    Raises LLMConfigError if OPENROUTER_API_KEY is not set. Any other failure
    (network, provider, parsing) propagates to the caller.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise LLMConfigError("OPENROUTER_API_KEY is not set")

    system_content = (
        f"{SYSTEM_PROMPT}\n\nFields collected so far:\n"
        f"{_render_current_fields(current_fields)}"
    )
    convo = [{"role": "system", "content": system_content}]
    convo += [{"role": m.role, "content": m.content} for m in messages]

    response = litellm.completion(
        model=MODEL,
        messages=convo,
        api_key=api_key,
        response_format=ChatResponse,
        temperature=0.3,
        timeout=REQUEST_TIMEOUT_SECONDS,
        extra_body=PROVIDER_ROUTING,
    )

    content = response.choices[0].message.content
    if not content:
        logger.error("LLM returned an empty response")
        raise LLMResponseError("The model returned an empty response.")
    try:
        return ChatResponse.model_validate_json(content)
    except ValidationError as exc:
        logger.error("Could not parse LLM structured output: %s", content[:1000])
        raise LLMResponseError("The model returned a malformed response.") from exc
