"""Persistence for user-generated documents.

A saved document is the minimal state needed to re-open a draft in the creator:
the resolved document type (a template filename) and the collected field values,
plus a human title and timestamps. All operations are scoped to a single user so
one account can never read or delete another's documents. The backing table is
rebuilt on every server start (see ``db.init_db``), so this is session-lifetime
persistence, which the ticket explicitly permits.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, Field

from app import db


class SaveDocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    documentType: str = Field(min_length=1)
    fields: dict[str, str] = {}


class DocumentSummary(BaseModel):
    id: int
    title: str
    documentType: str
    createdAt: str
    updatedAt: str


class DocumentDetail(DocumentSummary):
    fields: dict[str, str]


def create_document(user_id: int, request: SaveDocumentRequest) -> DocumentDetail:
    """Persist a new document for the given user and return it."""
    with db.connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO documents (user_id, title, document_type, fields_json)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, request.title, request.documentType, json.dumps(request.fields)),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return _to_detail(row)


def list_documents(user_id: int) -> list[DocumentSummary]:
    """Return the user's documents, most recently updated first."""
    with db.connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, document_type, created_at, updated_at
            FROM documents WHERE user_id = ?
            ORDER BY datetime(updated_at) DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
    return [_to_summary(row) for row in rows]


def get_document(user_id: int, document_id: int) -> DocumentDetail | None:
    """Return one of the user's documents by id, or None if it isn't theirs."""
    with db.connection() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        ).fetchone()
    if row is None:
        return None
    return _to_detail(row)


def delete_document(user_id: int, document_id: int) -> bool:
    """Delete one of the user's documents. Returns True if a row was removed."""
    with db.connection() as conn:
        cursor = conn.execute(
            "DELETE FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0


def _to_summary(row) -> DocumentSummary:
    return DocumentSummary(
        id=row["id"],
        title=row["title"],
        documentType=row["document_type"],
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )


def _to_detail(row) -> DocumentDetail:
    return DocumentDetail(
        id=row["id"],
        title=row["title"],
        documentType=row["document_type"],
        fields=json.loads(row["fields_json"]),
        createdAt=row["created_at"],
        updatedAt=row["updated_at"],
    )
