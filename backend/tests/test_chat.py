import app.main as main
from app.llm import ChatResponse, LLMConfigError, NdaFieldsPatch, PartyPatch
from fastapi.testclient import TestClient


def test_chat_returns_reply_and_field_patch(monkeypatch):
    def fake_generate(messages, current_fields):
        assert messages[-1].content == "Party A is Acme Corp"
        return ChatResponse(
            reply="Great — I've noted Acme Corp as Party A. Who's Party B?",
            fields=NdaFieldsPatch(partyA=PartyPatch(companyName="Acme Corp")),
        )

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "Party A is Acme Corp"}]},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"].startswith("Great")
    assert body["fields"]["partyA"]["companyName"] == "Acme Corp"
    # Omitted fields stay null so the frontend leaves them unchanged.
    assert body["fields"]["purpose"] is None


def test_chat_forwards_current_fields(monkeypatch):
    captured = {}

    def fake_generate(messages, current_fields):
        captured["fields"] = current_fields
        return ChatResponse(reply="ok", fields=NdaFieldsPatch())

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "fields": {"governingLaw": "Delaware"},
            },
        )

    assert response.status_code == 200
    assert captured["fields"].governingLaw == "Delaware"


def test_chat_returns_503_when_not_configured(monkeypatch):
    def fake_generate(messages, current_fields):
        raise LLMConfigError("OPENROUTER_API_KEY is not set")

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}]},
        )

    assert response.status_code == 503
    assert "OPENROUTER_API_KEY" in response.json()["detail"]


def test_chat_returns_502_on_llm_failure(monkeypatch):
    def fake_generate(messages, current_fields):
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            json={"messages": [{"role": "user", "content": "hi"}]},
        )

    assert response.status_code == 502
    assert "temporarily unavailable" in response.json()["detail"]
