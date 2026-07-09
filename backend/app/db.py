import os
import sqlite3
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("PRELEGAL_DB_PATH", BACKEND_ROOT / "data" / "prelegal.db"))


def init_db(db_path: Path = DB_PATH) -> None:
    """Create a fresh SQLite database with an empty users table.

    Runs on every app startup so the database always starts clean, per the
    project's requirement that the DB is rebuilt each time the container starts.
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
        connection.commit()
    finally:
        connection.close()
