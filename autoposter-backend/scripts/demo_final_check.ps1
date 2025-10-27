# demo_final_check.ps1 — read-only pre-demo health checklist (NO posting)
function Log($m) { "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m }

$client = "Luchiano"
Log "=== PRE-DEMO FINAL CHECK (READ-ONLY) ==="

# 1) Quick health check: folders, session, client.json parse, errors count
Log "Running quick check..."
.\venv\Scripts\python.exe .\scripts\pre_demo_quickcheck.py

# 2) Confirm no due jobs (so runner won't pick up anything accidentally)
Log "Verifying there are no due jobs..."
$env:IGNORE_QUOTA = '1'
.\venv\Scripts\python.exe .\scripts\queue_runner.py --client $client --dry-run --once

# 3) Print any due jobs explicitly (should be empty)
.\venv\Scripts\python.exe .\scripts\print_due_jobs.py

# 4) Show 10 most recent jobs
Log "Recent 10 jobs:"
.\venv\Scripts\python.exe .\scripts\list_jobs.py --client $client --limit 10

Log "=== PRE-DEMO FINAL CHECK COMPLETE ==="
