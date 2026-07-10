import app.main as main
from app import auth
from fastapi.testclient import TestClient


def test_signup_creates_account_and_returns_token():
    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/signup",
            json={"email": "jane@example.com", "password": "supersecret"},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["user"]["email"] == "jane@example.com"
    assert isinstance(body["user"]["id"], int)
    assert body["token"]


def test_signup_rejects_duplicate_email():
    with TestClient(main.app) as client:
        first = client.post(
            "/api/auth/signup",
            json={"email": "dupe@example.com", "password": "supersecret"},
        )
        assert first.status_code == 201
        second = client.post(
            "/api/auth/signup",
            json={"email": "dupe@example.com", "password": "othersecret"},
        )

    assert second.status_code == 409


def test_signup_rejects_short_password():
    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/signup",
            json={"email": "short@example.com", "password": "tiny"},
        )
    assert response.status_code == 422


def test_login_succeeds_with_correct_password():
    with TestClient(main.app) as client:
        client.post(
            "/api/auth/signup",
            json={"email": "log@example.com", "password": "supersecret"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "log@example.com", "password": "supersecret"},
        )

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "log@example.com"


def test_login_rejects_wrong_password():
    with TestClient(main.app) as client:
        client.post(
            "/api/auth/signup",
            json={"email": "wrong@example.com", "password": "supersecret"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "wrong@example.com", "password": "nottheone"},
        )

    assert response.status_code == 401


def test_login_rejects_unknown_email():
    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "supersecret"},
        )
    assert response.status_code == 401


def test_me_returns_user_with_valid_token():
    with TestClient(main.app) as client:
        signup = client.post(
            "/api/auth/signup",
            json={"email": "me@example.com", "password": "supersecret"},
        )
        token = signup.json()["token"]
        response = client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
        )

    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"


def test_me_rejects_missing_token():
    with TestClient(main.app) as client:
        response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_rejects_invalid_token():
    with TestClient(main.app) as client:
        response = client.get(
            "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
    assert response.status_code == 401


def test_email_is_case_insensitive_for_signup_and_login():
    with TestClient(main.app) as client:
        signup = client.post(
            "/api/auth/signup",
            json={"email": "Jane@Example.com", "password": "supersecret"},
        )
        assert signup.status_code == 201
        # Stored normalized.
        assert signup.json()["user"]["email"] == "jane@example.com"

        # A different-cased duplicate is rejected.
        dupe = client.post(
            "/api/auth/signup",
            json={"email": "jane@example.com", "password": "othersecret"},
        )
        assert dupe.status_code == 409

        # Login works regardless of the case used.
        login = client.post(
            "/api/auth/login",
            json={"email": "JANE@EXAMPLE.COM", "password": "supersecret"},
        )
        assert login.status_code == 200
        assert login.json()["user"]["email"] == "jane@example.com"


def test_password_hash_roundtrip():
    hashed = auth.hash_password("supersecret")
    assert hashed != "supersecret"
    assert auth.verify_password("supersecret", hashed)
    assert not auth.verify_password("wrong", hashed)
