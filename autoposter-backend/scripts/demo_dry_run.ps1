# demo_dry_run.ps1 — automated dry-run demo
function Log($msg) { "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg }

Log "DEMO START (dry-run)"

# Start watcher in dry-run
Log "Starting watcher (dry-run)..."
$watcher = Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "main.py","--dry-run" -PassThru -WindowStyle Minimized
Start-Sleep -Seconds 2

# Ensure demo assets
$feed   = "C:\content\Luchiano\feed\demo_demo_feed.jpg"
$reels  = "C:\content\Luchiano\reels\demo_demo_reel.mp4"
$story  = "C:\content\Luchiano\stories\demo_demo_story.jpg"

New-Item -ItemType Directory -Force -Path (Split-Path $feed)  | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $reels) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path $story) | Out-Null

if (!(Test-Path $feed))  { fsutil file createnew $feed  4096  | Out-Null }
if (!(Test-Path $reels)) { fsutil file createnew $reels 8192  | Out-Null }
if (!(Test-Path $story)) { fsutil file createnew $story 4096  | Out-Null }

Log "Touching files to trigger watcher..."
(Get-Item $feed).LastWriteTime  = Get-Date
(Get-Item $reels).LastWriteTime = Get-Date
(Get-Item $story).LastWriteTime = Get-Date
Start-Sleep -Seconds 2

# Force ETA=now
Log "Forcing ETA=now..."
.\venv\Scripts\python.exe .\scripts\force_eta_now.py Luchiano

# Process dry-run 3x
for ($i=1; $i -le 3; $i++) {
  Log "Demo run $i..."
  .\venv\Scripts\python.exe .\scripts\queue_runner_demo.py --client Luchiano --dry-run --once
}

# Summary
Log "Recent jobs summary:"
.\venv\Scripts\python.exe .\scripts\list_jobs.py --client Luchiano --limit 8

# Cleanup
Log "Stopping watcher..."
try { Stop-Process -Id $watcher.Id -Force -ErrorAction SilentlyContinue } catch {}
Log "DEMO END"
