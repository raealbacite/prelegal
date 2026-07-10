import app.main as main
from fastapi.testclient import TestClient


def _signup(client, email):
    response = client.post(
        "/api/auth/signup", json={"email": email, "password": "supersecret"}
    )
    assert response.status_code == 201
    return response.json()["token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_saved_document_endpoints_require_auth():
    with TestClient(main.app) as client:
        assert client.get("/api/documents").status_code == 401
        assert client.post("/api/documents", json={}).status_code == 401


def test_save_list_get_delete_roundtrip():
    with TestClient(main.app) as client:
        token = _signup(client, "owner@example.com")

        created = client.post(
            "/api/documents",
            headers=_auth(token),
            json={
                "title": "Acme MNDA",
                "documentType": "mutual-nda.md",
                "fields": {"partyACompanyName": "Acme"},
            },
        )
        assert created.status_code == 201
        doc = created.json()
        assert doc["title"] == "Acme MNDA"
        assert doc["fields"] == {"partyACompanyName": "Acme"}
        doc_id = doc["id"]

        listed = client.get("/api/documents", headers=_auth(token))
        assert listed.status_code == 200
        summaries = listed.json()
        assert len(summaries) == 1
        assert summaries[0]["id"] == doc_id
        assert summaries[0]["title"] == "Acme MNDA"
        assert "fields" not in summaries[0]

        fetched = client.get(f"/api/documents/{doc_id}", headers=_auth(token))
        assert fetched.status_code == 200
        assert fetched.json()["fields"] == {"partyACompanyName": "Acme"}

        deleted = client.delete(f"/api/documents/{doc_id}", headers=_auth(token))
        assert deleted.status_code == 204

        assert client.get("/api/documents", headers=_auth(token)).json() == []
        assert client.get(f"/api/documents/{doc_id}", headers=_auth(token)).status_code == 404


def test_users_cannot_access_each_others_documents():
    with TestClient(main.app) as client:
        alice = _signup(client, "alice@example.com")
        bob = _signup(client, "bob@example.com")

        created = client.post(
            "/api/documents",
            headers=_auth(alice),
            json={"title": "Alice doc", "documentType": "csa.md", "fields": {}},
        )
        doc_id = created.json()["id"]

        # Bob sees an empty list and cannot fetch or delete Alice's document.
        assert client.get("/api/documents", headers=_auth(bob)).json() == []
        assert client.get(f"/api/documents/{doc_id}", headers=_auth(bob)).status_code == 404
        assert client.delete(f"/api/documents/{doc_id}", headers=_auth(bob)).status_code == 404

        # Alice's document is untouched.
        assert client.get(f"/api/documents/{doc_id}", headers=_auth(alice)).status_code == 200


def test_get_unknown_document_returns_404():
    with TestClient(main.app) as client:
        token = _signup(client, "nobody@example.com")
        assert client.get("/api/documents/999", headers=_auth(token)).status_code == 404
