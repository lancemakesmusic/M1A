# scripts/unlock_latest_job.py
from __future__ import annotations

import sys
import importlib.util
from pathlib import Path

# ----- load scripts/db.py by absolute path (no package import required)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT / "scripts" / "db.py"

spec = importlib.util.spec_from_file_location("db", DB_PATH)
db = importlib.util.module_from_spec(spec)
assert spec and spec.loader, "Failed to prepare db module spec"
spec.loader.exec_module(db)  # type: ignore[attr-defined]

def main(client: str = "Luchiano", prefer_kind: str | None = "feed") -> None:
    conn = db._conn()
    now = db._now_iso()

    row = None
    if prefer_kind:
        row = conn.execute(
            """
            SELECT * FROM jobs
            WHERE client = ? AND status = 'queued' AND content_type = ?
            ORDER BY id DESC LIMIT 1
            """,
            (client, prefer_kind),
        ).fetchone()

    if not row:
        row = conn.execute(
            """
            SELECT * FROM jobs
            WHERE client = ? AND status = 'queued'
            ORDER BY id DESC LIMIT 1
            """,
            (client,),
        ).fetchone()

    if not row:
        print("No queued job found.")
        return

    job_id = row["id"]
    conn.execute(
        "UPDATE jobs SET eta = ?, status = 'queued', error = NULL WHERE id = ?",
        (now, job_id),
    )
    conn.commit()
    print(f"Unlocked job#{job_id} (client={row['client']}, type={row['content_type']}, file={row['path']}) at {now}")

if __name__ == "__main__":
    client = sys.argv[1] if len(sys.argv) > 1 else "Luchiano"
    prefer = sys.argv[2] if len(sys.argv) > 2 else "feed"
    main(client, prefer)
