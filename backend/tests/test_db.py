import sqlite3

from app.db import init_db


def test_init_db_creates_empty_users_table(tmp_path):
    db_path = tmp_path / "prelegal.db"

    init_db(db_path)

    connection = sqlite3.connect(db_path)
    try:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(users)")}
        rows = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    finally:
        connection.close()

    assert columns == {"id", "email", "password_hash", "created_at"}
    assert rows == 0


def test_init_db_resets_existing_data(tmp_path):
    db_path = tmp_path / "prelegal.db"

    init_db(db_path)
    connection = sqlite3.connect(db_path)
    connection.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        ("jane@example.com", "hash"),
    )
    connection.commit()
    connection.close()

    init_db(db_path)

    connection = sqlite3.connect(db_path)
    try:
        rows = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    finally:
        connection.close()

    assert rows == 0
