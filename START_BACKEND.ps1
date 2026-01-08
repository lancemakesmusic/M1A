# Quick Backend Startup Script
# Run this in PowerShell: .\START_BACKEND.ps1

Write-Host "🚀 Starting M1A Backend..." -ForegroundColor Cyan
Write-Host ""

Set-Location autoposter-backend

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Check if Python is available
try {
    $pythonVersion = python --version
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python." -ForegroundColor Red
    exit 1
}

# Start the backend
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

python start_backend.py





