import json
from types import SimpleNamespace

import pytest

import app.llm as llm
from app.llm import (
    ChatMessage,
    LLMConfigError,
    LLMResponseError,
    build_system_prompt,
    generate_chat_response,
)


def _fake_completion(content):
    """Build a minimal object shaped like a litellm ChatCompletion response."""
    message = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def test_raises_config_error_without_api_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(LLMConfigError):
        generate_chat_response([ChatMessage(role="user", content="hi")], None, {})


def test_parses_structured_output_and_builds_conversation(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _fake_completion(
            json.dumps(
                {
                    "reply": "Noted Acme Corp.",
                    "documentType": "mutual-nda.md",
                    "fields": [{"name": "partyA.companyName", "value": "Acme Corp"}],
                }
            )
        )

    monkeypatch.setattr(llm.litellm, "completion", fake_completion)

    result = generate_chat_response(
        [ChatMessage(role="user", content="Party A is Acme Corp")],
        "mutual-nda.md",
        {"governingLaw": "Delaware"},
    )

    assert result.reply == "Noted Acme Corp."
    assert result.documentType == "mutual-nda.md"
    assert result.fields["partyA.companyName"] == "Acme Corp"

    # The right model is used and the conversation carries the system prompt
    # (with current fields) plus the user turn.
    assert captured["model"] == llm.MODEL
    assert captured["extra_body"] == llm.PROVIDER_ROUTING
    convo = captured["messages"]
    assert convo[0]["role"] == "system"
    assert "Delaware" in convo[0]["content"]
    assert convo[-1] == {"role": "user", "content": "Party A is Acme Corp"}


def test_sanitize_drops_hallucinated_document_and_unknown_fields(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")

    def fake_completion(**kwargs):
        return _fake_completion(
            json.dumps(
                {
                    "reply": "ok",
                    "documentType": "totally-made-up.md",
                    "fields": [
                        {"name": "Customer", "value": "Globex"},
                        {"name": "not-a-real-field", "value": "x"},
                        {"name": "Provider", "value": "   "},
                    ],
                }
            )
        )

    monkeypatch.setattr(llm.litellm, "completion", fake_completion)

    result = generate_chat_response(
        [ChatMessage(role="user", content="hi")], "csa.md", {}
    )

    # Hallucinated document is ignored; the current document type is kept.
    assert result.documentType == "csa.md"
    # Unknown field dropped, blank value dropped, valid field kept.
    assert result.fields == {"Customer": "Globex"}


def test_nda_cover_page_filename_canonicalizes_to_mnda(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(
        llm.litellm,
        "completion",
        lambda **kwargs: _fake_completion(
            json.dumps(
                {"reply": "ok", "documentType": "mutual-nda-coverpage.md", "fields": []}
            )
        ),
    )

    result = generate_chat_response([ChatMessage(role="user", content="nda")], None, {})
    assert result.documentType == "mutual-nda.md"


def test_document_resolved_and_fields_matched_in_same_turn(monkeypatch):
    """First turn: no document yet, and the model both picks a document and
    returns fields for it. Fields must be matched against the newly resolved
    document (not the prior null one)."""
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(
        llm.litellm,
        "completion",
        lambda **kwargs: _fake_completion(
            json.dumps(
                {
                    "reply": "Let's draft a Cloud Service Agreement. What's the term?",
                    "documentType": "csa.md",
                    "fields": [
                        {"name": "Customer", "value": "Globex"},
                        {"name": "Provider", "value": "Acme Cloud"},
                    ],
                }
            )
        ),
    )

    result = generate_chat_response([ChatMessage(role="user", content="I'm selling SaaS")], None, {})

    assert result.documentType == "csa.md"
    assert result.fields == {"Customer": "Globex", "Provider": "Acme Cloud"}


def test_raises_response_error_on_empty_content(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(llm.litellm, "completion", lambda **kwargs: _fake_completion(None))

    with pytest.raises(LLMResponseError):
        generate_chat_response([ChatMessage(role="user", content="hi")], None, {})


def test_raises_response_error_on_malformed_json(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(
        llm.litellm,
        "completion",
        lambda **kwargs: _fake_completion("I'm sorry, I can't do that."),
    )

    with pytest.raises(LLMResponseError):
        generate_chat_response([ChatMessage(role="user", content="hi")], None, {})


def test_system_prompt_has_catalog_selection_and_followup_rule():
    prompt = build_system_prompt(None, {})
    # The catalog is embedded so the model knows what it can/can't produce.
    assert "Cloud Service Agreement" in prompt
    # Redirection instruction for unsupported documents.
    assert "can't generate" in prompt
    # The always-ask-a-follow-up rule (fix shipped with PL-6).
    assert "follow-up question" in prompt


def test_system_prompt_lists_fields_when_document_chosen():
    prompt = build_system_prompt("csa.md", {"Customer": "Globex"})
    assert "Customer" in prompt
    assert "Globex" in prompt  # current fields rendered back in
