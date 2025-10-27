# demo_day_flow.ps1 — full dry-run showcase for the demo
function Log($m) { "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $m }

Log "=== DEMO DAY DRY-RUN START ==="

# 0) Quick health check
Log "Quick check..."
.\venv\Scripts\python.exe .\scripts\pre_demo_quickcheck.py

# 1) Start watcher in dry-run (minimized)
Log "Starting watcher (dry-run)..."
$watcher = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "main.py","--dry-run" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2

# 2) Prepare demo assets (tiny placeholders if missing)
$feed   = "C:\content\Luchiano\feed\demo_day_feed.jpg"
$reels  = "C:\content\Luchiano\reels\demo_day_reel.mp4"
$story  = "C:\content\Luchiano\stories\demo_day_story.jpg"

New-Item -ItemType Directory -Force -Path (Split-Path $feed)  | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $reels) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $story) | Out-Null

if (!(Test-Path $feed))  { fsutil file createnew $feed  4096  | Out-Null }
if (!(Test-Path $reels)) { fsutil file createnew $reels 8192  | Out-Null }
if (!(Test-Path $story)) { fsutil file createnew $story 4096  | Out-Null }

# Touch so watcher enqueues
(Get-Item $feed).LastWriteTime  = Get-Date
(Get-Item $reels).LastWriteTime = Get-Date
(Get-Item $story).LastWriteTime = Get-Date
Log "Dropped & touched demo assets."

Start-Sleep -Seconds 2

# 3) Make all queued jobs due now
Log "Force ETA=now for queued jobs..."
.\venv\Scripts\python.exe .\scripts\force_eta_now.py Luchiano

# 4) Process exactly three jobs in dry-run (feed -> reels -> story)
for ($i=1; $i -le 3; $i++) {
  Log "Demo processing run $i..."
  .\venv\Scripts\python.exe .\scripts\queue_runner_demo.py --client Luchiano --dry-run --once
}

# 5) Show recent summary
Log "Recent jobs summary:"
.\venv\Scripts\python.exe .\scripts\list_jobs.py --client Luchiano --limit 10

# 6) Stop watcher (leave running if you want live Q&A — just comment this block)
Log "Stopping watcher..."
try { Stop-Process -Id $watcher.Id -Force -ErrorAction SilentlyContinue } catch {}

Log "=== DEMO DAY DRY-RUN END ==="
