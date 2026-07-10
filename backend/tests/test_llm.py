from types import SimpleNamespace

import pytest

import app.llm as llm
from app.llm import (
    ChatMessage,
    LLMConfigError,
    LLMResponseError,
    NdaFieldsPatch,
    generate_chat_response,
)


def _fake_completion(content):
    """Build a minimal object shaped like a litellm ChatCompletion response."""
    message = SimpleNamespace(content=content)
    return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def test_raises_config_error_without_api_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    with pytest.raises(LLMConfigError):
        generate_chat_response([ChatMessage(role="user", content="hi")], NdaFieldsPatch())


def test_parses_structured_output_and_builds_conversation(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _fake_completion(
            '{"reply": "Noted Acme Corp.", "fields": {"partyA": {"companyName": "Acme Corp"}}}'
        )

    monkeypatch.setattr(llm.litellm, "completion", fake_completion)

    result = generate_chat_response(
        [ChatMessage(role="user", content="Party A is Acme Corp")],
        NdaFieldsPatch(governingLaw="Delaware"),
    )

    assert result.reply == "Noted Acme Corp."
    assert result.fields.partyA is not None
    assert result.fields.partyA.companyName == "Acme Corp"

    # The right model is used and the conversation carries the system prompt
    # (with current fields) plus the user turn.
    assert captured["model"] == llm.MODEL
    assert captured["extra_body"] == llm.PROVIDER_ROUTING
    convo = captured["messages"]
    assert convo[0]["role"] == "system"
    assert "Delaware" in convo[0]["content"]
    assert convo[-1] == {"role": "user", "content": "Party A is Acme Corp"}


def test_raises_response_error_on_empty_content(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(llm.litellm, "completion", lambda **kwargs: _fake_completion(None))

    with pytest.raises(LLMResponseError):
        generate_chat_response([ChatMessage(role="user", content="hi")], NdaFieldsPatch())


def test_raises_response_error_on_malformed_json(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(
        llm.litellm,
        "completion",
        lambda **kwargs: _fake_completion("I'm sorry, I can't do that."),
    )

    with pytest.raises(LLMResponseError):
        generate_chat_response([ChatMessage(role="user", content="hi")], NdaFieldsPatch())
