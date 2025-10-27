# scripts/demo_reset_and_seed.py
from __future__ import annotations

import importlib.util
from pathlib import Path

# Load db.py directly by path (no package install needed)
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = PROJECT_ROOT / "scripts" / "db.py"
spec = importlib.util.spec_from_file_location("db", DB_PATH)
db = importlib.util.module_from_spec(spec)
assert spec and spec.loader, "Failed to prepare db module spec"
spec.loader.exec_module(db)  # type: ignore[attr-defined]

CLIENT = "Luchiano"
SEED = {
    "feed":    Path(r"C:\content\Luchiano\feed\morning_demo_feed.jpg"),
    "reels":   Path(r"C:\content\Luchiano\reels\morning_demo_reel.mp4"),
    "stories": Path(r"C:\content\Luchiano\stories\morning_demo_story.jpg"),
}

def ensure_file(p: Path, size: int = 4096) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists():
        with open(p, "wb") as f:
            f.write(b"\0" * size)

def freeze_non_done_jobs() -> int:
    """
    Make any non-done jobs NOT processable by pushing eta far into the future.
    (Read-only safety: avoids accidental live processing later.)
    """
    conn = db._conn()
    FUTURE = "2100-01-01T00:00:00+00:00"
    rows = conn.execute(
        """
        SELECT id, status FROM jobs
        WHERE client = ? AND status != 'done'
        """,
        (CLIENT,),
    ).fetchall() or []
    changed = 0
    for r in rows:
        jid = int(r["id"])
        conn.execute("UPDATE jobs SET status='queued', eta=? WHERE id=?", (FUTURE, jid))
        changed += 1
    conn.commit()
    return changed

def seed_three() -> list[int]:
    """
    Enqueue exactly three DRY demo jobs and force eta=now so they are due.
    """
    jids: list[int] = []
    for kind, path in SEED.items():
        ensure_file(path, size=8192 if kind == "reels" else 4096)
        jid = db.add_job(
            CLIENT,
            str(path),
            kind="feed" if kind == "feed" else ("reels" if kind == "reels" else "stories"),
            caption=f"(DRY) Morning demo — {kind}",
            extras={"source": "morning-reset"},
        )
        jids.append(jid)
    # Force eta=now
    conn = db._conn()
    now = db._now_iso()
    for jid in jids:
        conn.execute("UPDATE jobs SET eta=? WHERE id=?", (now, jid))
    conn.commit()
    return jids

def main() -> None:
    frozen = freeze_non_done_jobs()
    print(f"[reset] Pushed {frozen} non-done job(s) to far-future ETA (safety).")
    jids = seed_three()
    print(f"[seed] Enqueued demo jobs: {jids}")

if __name__ == "__main__":
    main()
