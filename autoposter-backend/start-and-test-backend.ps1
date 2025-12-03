# Start Backend and Test Connection
# This script starts the backend and verifies it's working

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  M1A Backend Startup & Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if backend is already running
Write-Host "Checking if backend is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/docs" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is already running!" -ForegroundColor Green
        Write-Host "`nBackend URL: http://localhost:8001" -ForegroundColor Cyan
        Write-Host "API Docs: http://localhost:8001/docs" -ForegroundColor Cyan
        Write-Host "`nTesting endpoints...`n" -ForegroundColor Yellow
        
        # Test endpoints
        $endpoints = @(
            @{Path="/"; Name="Root"},
            @{Path="/api/payments/health"; Name="Payments Health"},
            @{Path="/docs"; Name="API Docs"}
        )
        
        foreach ($ep in $endpoints) {
            try {
                $r = Invoke-WebRequest -Uri "http://localhost:8001$($ep.Path)" -Method GET -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
                Write-Host "✓ $($ep.Name) - OK" -ForegroundColor Green
            } catch {
                Write-Host "⚠ $($ep.Name) - Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
            }
        }
        
        Write-Host "`n✅ Backend is ready for testing!`n" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "Backend is not running. Starting it...`n" -ForegroundColor Yellow
}

# Start backend in background
Write-Host "Starting backend server...`n" -ForegroundColor Yellow

$backendScript = Join-Path $PSScriptRoot "start_backend.py"
$venvPython = Join-Path (Split-Path $PSScriptRoot) ".venv\Scripts\python.exe"

if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
    Write-Host "Using virtual environment Python" -ForegroundColor Green
} else {
    $pythonCmd = "python"
    Write-Host "Using system Python" -ForegroundColor Yellow
}

Write-Host "`nStarting backend at: http://localhost:8001" -ForegroundColor Cyan
Write-Host "API Documentation: http://localhost:8001/docs" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the backend`n" -ForegroundColor Yellow

# Start backend (this will block)
& $pythonCmd $backendScript

