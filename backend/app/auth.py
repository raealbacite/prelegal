"""Authentication: password hashing, JWT tokens, and user persistence.

Users sign up and sign in with an email and password. Passwords are hashed with
bcrypt; a successful signup or login returns a signed JWT (HS256) that the
frontend stores and sends as a Bearer token on subsequent requests. Because the
database is rebuilt on every server start (see ``db.init_db``), accounts and
their tokens only live for the lifetime of a server run.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from pydantic import BaseModel, EmailStr, Field

from app import db

# bcrypt only hashes the first 72 bytes of a password; reject anything longer so
# a user is never silently authenticated on a truncated prefix.
MAX_PASSWORD_BYTES = 72
MIN_PASSWORD_LENGTH = 8

# The DB (and thus every account) resets on each restart, so a generated dev
# secret is acceptable; PRELEGAL_JWT_SECRET can override it for a stable run.
JWT_SECRET = os.environ.get(
    "PRELEGAL_JWT_SECRET", "prelegal-dev-secret-change-me-in-production-please"
)
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=7)


class AuthError(Exception):
    """Base class for authentication failures."""


class EmailTakenError(AuthError):
    """Raised when signing up with an email that already exists."""


class InvalidCredentialsError(AuthError):
    """Raised when an email/password pair does not match a user."""


class InvalidTokenError(AuthError):
    """Raised when a bearer token is missing, malformed, or expired."""


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt, returning a UTF-8 storable hash."""
    _check_password_length(password)
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return True if the plaintext password matches the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # An over-long or malformed candidate can never match a real hash.
        return False


def _check_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise AuthError(
            f"Password must be at most {MAX_PASSWORD_BYTES} bytes long."
        )


def create_access_token(user_id: int, now: datetime | None = None) -> str:
    """Create a signed JWT carrying the user id as its subject."""
    issued_at = now or datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": issued_at,
        "exp": issued_at + TOKEN_TTL,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the user id encoded in a valid token, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise InvalidTokenError("Invalid or expired token") from exc


def normalize_email(email: str) -> str:
    """Lowercase and trim an email so lookups and uniqueness are case-insensitive."""
    return email.strip().lower()


def create_user(email: str, password: str) -> UserOut:
    """Create a new user, returning it. Raises EmailTakenError on a duplicate."""
    email = normalize_email(email)
    password_hash = hash_password(password)
    with db.connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (email, password_hash),
            )
            conn.commit()
            return UserOut(id=cursor.lastrowid, email=email)
        except sqlite3.IntegrityError as exc:
            raise EmailTakenError("An account with that email already exists.") from exc


def authenticate(email: str, password: str) -> UserOut:
    """Return the user for a matching email/password, else InvalidCredentialsError."""
    with db.connection() as conn:
        row = conn.execute(
            "SELECT id, email, password_hash FROM users WHERE email = ?",
            (normalize_email(email),),
        ).fetchone()

    if row is None or not verify_password(password, row["password_hash"]):
        raise InvalidCredentialsError("Incorrect email or password.")
    return UserOut(id=row["id"], email=row["email"])


def get_user_by_id(user_id: int) -> UserOut | None:
    """Look up a user by id, or return None if they no longer exist."""
    with db.connection() as conn:
        row = conn.execute(
            "SELECT id, email FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row is None:
        return None
    return UserOut(id=row["id"], email=row["email"])
