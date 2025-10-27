# scripts/backup_all_to_github.ps1
param(
  [string]$Branch = "master"
)

function Log($m) { "{0} {1}" -f ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss")), $m }

# 0) Preconditions
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "git is not available in PATH. Install Git and retry."
}

# 1) Ensure safe .gitignore so we don’t commit local data accidentally
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
)
$existing = (Get-Content $gi -ErrorAction SilentlyContinue -Raw) -join "`n"
$missing = $rules | Where-Object { $existing -notmatch [regex]::Escape($_) }
if ($missing.Count -gt 0) {
  Add-Content -Path $gi -Value ("`n" + ($missing -join "`n"))
  Log "[.gitignore] appended: $($missing -join ', ')"
  git add -- .gitignore | Out-Null
}

# 2) Basic repo info
$tsUtc = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss'Z'")
$backupBranch = "backup-$tsUtc"
$backupTag    = "backup-$tsUtc"
$commitMsg    = "backup: checkpoint $tsUtc"

Log "=== BACKUP START ==="
Log "Target branch: $Branch  | Backup branch: $backupBranch  | Tag: $backupTag"

# 3) Make sure we’re on the requested branch
try {
  git rev-parse --verify $Branch 2>$null 1>$null
} catch {
  throw "Branch '$Branch' does not exist locally. Create or fetch it first."
}
git checkout $Branch | Out-Null

# 4) Stage changes (respecting .gitignore)
git add -A

# 5) Ensure git identity (set if missing)
$userName = (git config user.name 2>$null)
$userEmail = (git config user.email 2>$null)
if (-not $userName) { git config user.name "Vector Management Bot" | Out-Null }
if (-not $userEmail) { git config user.email "noreply@vectormanagement.local" | Out-Null }

# 6) Commit if there’s anything to commit
$dirty = (git status --porcelain)
if ($dirty) {
  git commit -m $commitMsg
  Log "[commit] $commitMsg"
} else {
  Log "[commit] nothing to commit (working tree clean)"
}

# 7) Push the main branch (fast-forward or with latest commit)
git push origin $Branch
Log "[push] origin/$Branch updated"

# 8) Create backup branch at current HEAD and push it
git branch $backupBranch
git push origin $backupBranch
Log "[push] origin/$backupBranch created"

# 9) Create an annotated tag and push it
git tag -a $backupTag -m "Backup checkpoint $tsUtc"
git push origin "refs/tags/$backupTag"
Log "[push] tag $backupTag pushed"

# 10) Create a local bundle with ALL refs (for offline restore)
$exportsDir = Join-Path $PWD "exports"
New-Item -ItemType Directory -Force -Path $exportsDir | Out-Null
$bundlePath = Join-Path $exportsDir ("autoposter-backup-{0}.bundle" -f $tsUtc)
git bundle create $bundlePath --all
Log "[bundle] created $bundlePath"

# 11) Summary
Log "=== BACKUP COMPLETE ==="
Log "Branch: origin/$Branch"
Log "Backup branch: origin/$backupBranch"
Log "Tag: $backupTag"
Log "Bundle: $bundlePath"
