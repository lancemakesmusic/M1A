# RESTORE_GUIDE.md

## Quick restore (from GitHub)
1) Clone:
2) Check available backup tags:
Set-Location 'C:\autoposter'

@'
# RESTORE_GUIDE.md

## Quick restore (from GitHub)
1) Clone:
https://github.com/vectoraudioservices/autoposter.git
2) Check available backup tags:
3) Checkout the desired backup (example):

## Offline restore (from local .bundle)
Assumes a local bundle at `C:\autoposter\exports\autoposter-backup-YYYYMMDD-HHMMSSZ.bundle`.

Set-Location 'C:\autoposter\exports'
$bundle = Get-ChildItem -File -Filter 'autoposter-backup-*.bundle' |
Sort-Object LastWriteTime -Descending | Select-Object -First 1
git clone "$($bundle.FullName)" "autoposter_restore_from_bundle"
cd .\autoposter_restore_from_bundle
git log --oneline -n 3
## Health checks after restore (no posting)

## Dry-run demo (safe)
$env:IGNORE_QUOTA = '1'
.\venv\Scripts\python.exe .\scripts\demo_reset_and_seed.py
.\venv\Scripts\python.exe .\scripts\queue_runner.py --client Luchiano --dry-run --once
.\venv\Scripts\python.exe .\scripts\queue_runner.py --client Luchiano --dry-run --once
.\venv\Scripts\python.exe .\scripts\queue_runner.py --client Luchiano --dry-run --once
.\venv\Scripts\python.exe .\scripts\list_jobs.py --client Luchiano --limit 6

## One-item live harness (explicit confirmation)
To post exactly ONE feed item live, use:
- `scripts\post_one_live.ps1` — requires you to type **POST** at the prompt.
To freeze/cancel any accidental enqueue:
- `scripts\cancel_live_enqueue.py` — pushes ETA to year 2100 and keeps status queued.

## Integrity (checksum) for bundle
Your latest bundle has a `.sha256` next to it in `C:\autoposter\exports\`.
Verify later with:
Set-Location 'C:\autoposter\exports'
Get-FileHash -Algorithm SHA256 .\autoposter-backup-.bundle
type .\autoposter-backup-.bundle.sha256
---
*Generated for Vector Management — backup tag: `backup-20251005-191345Z`*
