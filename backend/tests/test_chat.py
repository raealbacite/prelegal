import app.main as main
from app.llm import ChatResponse, LLMConfigError
from fastapi.testclient import TestClient


def _auth_headers(client) -> dict[str, str]:
    """Sign up a user and return an Authorization header for the protected chat."""
    response = client.post(
        "/api/auth/signup", json={"email": "chat@example.com", "password": "supersecret"}
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_chat_requires_authentication():
    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat", json={"messages": [{"role": "user", "content": "hi"}]}
        )
    assert response.status_code == 401


def test_chat_returns_reply_document_and_field_patch(monkeypatch):
    def fake_generate(messages, document_type, fields):
        assert messages[-1].content == "Let's do a cloud services agreement"
        return ChatResponse(
            reply="Great — let's draft a Cloud Service Agreement. Who is the Provider?",
            documentType="csa.md",
            fields={"Customer": "Acme Corp"},
        )

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            headers=_auth_headers(client),
            json={"messages": [{"role": "user", "content": "Let's do a cloud services agreement"}]},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"].startswith("Great")
    assert body["documentType"] == "csa.md"
    assert body["fields"]["Customer"] == "Acme Corp"


def test_chat_forwards_document_type_and_current_fields(monkeypatch):
    captured = {}

    def fake_generate(messages, document_type, fields):
        captured["documentType"] = document_type
        captured["fields"] = fields
        return ChatResponse(reply="ok", documentType=document_type, fields={})

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            headers=_auth_headers(client),
            json={
                "messages": [{"role": "user", "content": "hi"}],
                "documentType": "csa.md",
                "fields": {"Customer": "Acme Corp"},
            },
        )

    assert response.status_code == 200
    assert captured["documentType"] == "csa.md"
    assert captured["fields"] == {"Customer": "Acme Corp"}


def test_chat_returns_503_when_not_configured(monkeypatch):
    def fake_generate(messages, document_type, fields):
        raise LLMConfigError("OPENROUTER_API_KEY is not set")

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            headers=_auth_headers(client),
            json={"messages": [{"role": "user", "content": "hi"}]},
        )

    assert response.status_code == 503
    assert "OPENROUTER_API_KEY" in response.json()["detail"]


def test_chat_returns_502_on_llm_failure(monkeypatch):
    def fake_generate(messages, document_type, fields):
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(main, "generate_chat_response", fake_generate)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/chat",
            headers=_auth_headers(client),
            json={"messages": [{"role": "user", "content": "hi"}]},
        )

    assert response.status_code == 502
    assert "temporarily unavailable" in response.json()["detail"]


def test_get_document_template_returns_fields(monkeypatch):
    with TestClient(main.app) as client:
        response = client.get("/api/templates/csa.md")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Cloud Service Agreement (CSA)"
    assert body["filename"] == "csa.md"
    assert body["markdown"].startswith("# Cloud Service Agreement")
    names = {v["name"] for v in body["variables"]}
    assert "Customer" in names


def test_get_document_template_unknown_returns_404():
    with TestClient(main.app) as client:
        response = client.get("/api/templates/nope.md")
    assert response.status_code == 404
