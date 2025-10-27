# scripts/db.py
from __future__ import annotations

import sqlite3
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# -------- Paths / Connection --------
_PROJECT_ROOT = Path(__file__).resolve().parents[1]  # .../autoposter
_DATA_DIR = _PROJECT_ROOT / "data"
_DB_PATH = _DATA_DIR / "autoposter.db"

def _now_iso() -> str:
    """UTC timestamp ISO string (second precision)."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

def _dict_factory(cursor: sqlite3.Cursor, row: Tuple[Any, ...]) -> Dict[str, Any]:
    """Return rows as dicts instead of tuples."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

_CONN_SINGLETON: Optional[sqlite3.Connection] = None

def _conn() -> sqlite3.Connection:
    """Get a process-wide SQLite connection with sane pragmas."""
    global _CONN_SINGLETON
    if _CONN_SINGLETON is not None:
        return _CONN_SINGLETON

    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH.as_posix(), timeout=30, check_same_thread=False)
    conn.row_factory = _dict_factory
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    conn.execute("PRAGMA busy_timeout=5000;")
    _CONN_SINGLETON = conn
    return conn

# -------- Schema / Migration --------
_BASE_COLUMNS = {
    "id": "INTEGER PRIMARY KEY AUTOINCREMENT",
    "client": "TEXT NOT NULL",
    "path": "TEXT NOT NULL",
    # Keep legacy 'content_type' name in DB; callers may pass kind= (compat in add_job)
    "content_type": "TEXT NOT NULL",
    "caption": "TEXT",
    "eta": "TEXT",  # some DBs may require NOT NULL; we will default it to now if None
    "status": "TEXT NOT NULL DEFAULT 'queued'",
    "extras": "TEXT NOT NULL DEFAULT '{}'",
    "created_at": "TEXT NOT NULL",
    "started_at": "TEXT",
    "done_at": "TEXT",
    "error": "TEXT",
    "attempts": "INTEGER NOT NULL DEFAULT 0",
}

_INDEXES = [
    ("idx_jobs_client_status_eta",
     "CREATE INDEX IF NOT EXISTS idx_jobs_client_status_eta ON jobs(client, status, eta)"),
    ("idx_jobs_path", "CREATE INDEX IF NOT EXISTS idx_jobs_path ON jobs(path)"),
]

def _table_exists(conn: sqlite3.Connection, table: str) -> bool:
    cur = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cur.fetchone() is not None

def _ensure_columns(conn: sqlite3.Connection, table: str, cols: Dict[str, str]) -> None:
    cur = conn.execute(f"PRAGMA table_info({table})")
    present = {r["name"] for r in cur.fetchall()}
    for name, ddl in cols.items():
        if name not in present:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl};")

def init_db() -> None:
    conn = _conn()
    with conn:
        if not _table_exists(conn, "jobs"):
            cols_sql = ", ".join(f"{k} {v}" for k, v in _BASE_COLUMNS.items())
            conn.execute(f"CREATE TABLE jobs ({cols_sql});")
        else:
            _ensure_columns(conn, "jobs", _BASE_COLUMNS)
        for _, sql in _INDEXES:
            conn.execute(sql)

# -------- Queries / Commands --------
def get_job_by_path(client: str, path: str) -> Optional[Dict[str, Any]]:
    conn = _conn()
    cur = conn.execute(
        """
        SELECT * FROM jobs
        WHERE client = ? AND path = ?
        ORDER BY id DESC
        LIMIT 1
        """,
        (client, path),
    )
    return cur.fetchone()

def add_job(
    client: str,
    path: str,
    *,
    content_type: str | None = None,
    caption: str | None = None,
    eta: str | None = None,
    extras: dict | None = None,
    **kwargs,
) -> int:
    """
    Insert a new job into the queue.

    Compatibility shim: accepts callers passing `kind=` and maps it to `content_type`.
    Keyword-only prevents positional collisions.
    """
    # --- Compatibility shim: allow kind= from newer callers ---
    if content_type is None and "kind" in kwargs:
        content_type = kwargs.get("kind")

    if not client:
        raise ValueError("add_job: missing client")
    if not path:
        raise ValueError("add_job: missing path")
    if not content_type:
        raise ValueError("add_job: missing content_type (or kind)")

    if extras is None:
        extras = {}

    path_str = Path(path).as_posix()
    created_at = _now_iso()

    # Default eta to now if not provided (prevents NOT NULL failures)
    if eta is None:
        eta = created_at

    conn = _conn()
    with conn:
        cur = conn.execute(
            """
            INSERT INTO jobs (client, path, content_type, caption, eta, status, extras, created_at)
            VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
            """,
            (client, path_str, content_type, caption, eta, json.dumps(extras), created_at),
        )
        return int(cur.lastrowid)

def get_due_jobs(
    limit: int = 50,
    client: str | None = None,
    now_iso: str | None = None,
) -> List[Dict[str, Any]]:
    conn = _conn()
    now = now_iso or _now_iso()
    if client:
        cur = conn.execute(
            """
            SELECT * FROM jobs
            WHERE client = ?
              AND status = 'queued'
              AND (eta IS NULL OR eta <= ?)
            ORDER BY COALESCE(eta, created_at) ASC, id ASC
            LIMIT ?
            """,
            (client, now, limit),
        )
    else:
        cur = conn.execute(
            """
            SELECT * FROM jobs
            WHERE status = 'queued'
              AND (eta IS NULL OR eta <= ?)
            ORDER BY COALESCE(eta, created_at) ASC, id ASC
            LIMIT ?
            """,
            (now, limit),
        )
    rows = cur.fetchall() or []
    for r in rows:
        try:
            r["extras"] = json.loads(r.get("extras") or "{}")
        except Exception:
            r["extras"] = {}
    return rows

def mark_in_progress(job_id: int) -> None:
    conn = _conn()
    with conn:
        conn.execute(
            """
            UPDATE jobs
            SET status = 'in_progress',
                started_at = ?,
                attempts = COALESCE(attempts, 0) + 1
            WHERE id = ?
            """,
            (_now_iso(), job_id),
        )

def mark_done(job_id: int) -> None:
    conn = _conn()
    with conn:
        conn.execute(
            """
            UPDATE jobs
            SET status = 'done',
                done_at = ?
            WHERE id = ?
            """,
            (_now_iso(), job_id),
        )

def reschedule(job_id: int, new_eta: str, reason: str | None = None) -> None:
    conn = _conn()
    with conn:
        if reason:
            row = conn.execute("SELECT error FROM jobs WHERE id = ?", (job_id,)).fetchone()
            prev = (row or {}).get("error") or ""
            sep = "\n" if prev else ""
            new_err = f"{prev}{sep}Rescheduled: {reason}"
            conn.execute(
                "UPDATE jobs SET eta = ?, error = ? WHERE id = ?",
                (new_eta, new_err, job_id),
            )
        else:
            conn.execute("UPDATE jobs SET eta = ? WHERE id = ?", (new_eta, job_id))

# Initialize DB on import
init_db()
