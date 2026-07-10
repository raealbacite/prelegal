import os
import sqlite3
from contextlib import contextmanager
from collections.abc import Iterator
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", BACKEND_ROOT / "data" / "prelegal.db"))


def init_db(db_path: Path = DB_PATH) -> None:
    """Create a fresh SQLite database with the users and documents tables.

    Runs on every app startup so the database always starts clean, per the
    project's requirement that the DB is rebuilt each time the container starts.
    Saved documents therefore live only for the lifetime of a server run.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                document_type TEXT NOT NULL,
                fields_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Open a connection to the app database with row access by column name and
    foreign-key enforcement enabled. Callers are responsible for closing it."""
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def connection(db_path: Path = DB_PATH) -> Iterator[sqlite3.Connection]:
    """Context manager that yields a connection and always closes it on exit."""
    conn = get_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()
