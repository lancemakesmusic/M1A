# Start Backend Server from Project Root
# This script changes to the correct directory and starts the backend

Write-Host "`n🚀 Starting M1A Backend Server...`n" -ForegroundColor Cyan

# Change to backend directory
$backendDir = Join-Path $PSScriptRoot "autoposter-backend"

if (-not (Test-Path $backendDir)) {
    Write-Host "❌ Error: autoposter-backend directory not found!" -ForegroundColor Red
    Write-Host "Expected at: $backendDir" -ForegroundColor Yellow
    exit 1
}

Set-Location $backendDir
Write-Host "✅ Changed to: $(Get-Location)" -ForegroundColor Green

# Check if api\main.py exists
if (-not (Test-Path "api\main.py")) {
    Write-Host "❌ Error: api\main.py not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found api\main.py" -ForegroundColor Green
Write-Host "Starting server on http://127.0.0.1:8001`n" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Start the server
python -m uvicorn api.main:app --reload --port 8001

