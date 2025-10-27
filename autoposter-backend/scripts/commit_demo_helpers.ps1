# scripts/commit_demo_helpers.ps1
param(
  [string]$Branch = "master",
  [string]$Message = "demo: helper scripts, runner quota bypass, pre-demo checks"
)

function Add-IfExists([string]$p) {
  if (Test-Path $p) {
    git add -- "$p"
    Write-Host "[add] $p"
  } else {
    Write-Host "[skip] $p (not found)"
  }
}

Write-Host "=== Commit demo helpers ==="

# Safer .gitignore (avoid leaking local data)
$gi = ".gitignore"
if (-not (Test-Path $gi)) { New-Item -ItemType File -Path $gi | Out-Null }
$rules = @(
  "venv/",
  "content/",
  "exports/",
  "logs/",
  "*.db",
  "*.zip",
  "*.log",
  "__pycache__/",
  ".DS_Store"
) -join "`n"
$existing = Get-Content $gi -ErrorAction SilentlyContinue -Raw
$need = @()
foreach ($r in $rules.Split("`n")) {
  if ($existing -notmatch [regex]::Escape($r)) { $need += $r }
}
if ($need.Count -gt 0) {
  Add-Content -Path $gi -Value ("`n" + ($need -join "`n"))
  Write-Host "[update] .gitignore appended rules"
}
git add -- .gitignore

# Add known helper files (created during our session)
$targets = @(
  "scripts/queue_runner.py",
  "scripts/queue_runner_demo.py",
  "scripts/print_due_jobs.py",
  "scripts/force_eta_now.py",
  "scripts/clean_demo_db.py",
  "scripts/pre_demo_quickcheck.py",
  "scripts/enqueue_one.py",
  "scripts/demo_main_runner.ps1",
  "scripts/post_one_live.ps1",
  "scripts/cancel_live_enqueue.py",
  "scripts/run_dry_tests.py"
)

foreach ($t in $targets) { Add-IfExists $t }

# (Optional) README snippet for demo usage
$readme = "README_DEMO.md"
$readmeText = @"
# Demo Helpers (Dry-Run & Safe Live Harness)

- \`scripts\demo_main_runner.ps1\` — Dry-run, uses MAIN runner with IGNORE_QUOTA for smooth demo.
- \`scripts\pre_demo_quickcheck.py\` — Validates folders, session file, client.json (no posting).
- \`scripts\run_dry_tests.py\` — Enqueues 3 dry jobs and processes them (DRY).
- \`scripts\post_one_live.ps1\` — **Posts exactly one feed item** after you type **POST**.
- \`scripts\cancel_live_enqueue.py\` — Freezes any accidental live enqueue (eta -> 2100-01-01).

**Tip:** Keep \`.gitignore\` entries for \`content/\`, \`venv/\`, \`*.db\`, and logs to avoid leaking local data.
"@
Set-Content -Encoding UTF8 $readme -Value $readmeText
git add -- $readme
Write-Host "[add] $readme"

# Commit & push
$dirty = (git status --porcelain)
if (-not $dirty) {
  Write-Host "[info] Nothing to commit."
} else {
  git commit -m $Message
  Write-Host "[ok] commit created"
  git push origin $Branch
  Write-Host "[ok] pushed to origin/$Branch"
}

Write-Host "=== Done ==="
