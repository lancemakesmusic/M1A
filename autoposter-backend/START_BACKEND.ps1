# Start Backend Server
# Run this script from the autoposter-backend directory

Write-Host "`n🚀 Starting M1A Backend Server...`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "api\main.py")) {
    Write-Host "❌ Error: api\main.py not found!" -ForegroundColor Red
    Write-Host "Please run this script from the autoposter-backend directory" -ForegroundColor Yellow
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found api\main.py" -ForegroundColor Green
Write-Host "Starting server on http://127.0.0.1:8001`n" -ForegroundColor Cyan

# Start the server
python -m uvicorn api.main:app --reload --port 8001

