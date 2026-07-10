import os
import tempfile
from pathlib import Path

# Point the app database at a throwaway file before any app module is imported,
# so tests that exercise real endpoints never touch the developer's dev DB. The
# app rebuilds this file on each TestClient startup (via the lifespan hook).
_tmp_dir = tempfile.mkdtemp(prefix="prelegal-test-")
os.environ.setdefault("PRELEGAL_DB_PATH", str(Path(_tmp_dir) / "prelegal-test.db"))
