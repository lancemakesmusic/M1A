# Backend Connection Test Script
# Tests all backend endpoints and frontend connectivity

param(
    [string]$BackendUrl = "http://localhost:8001"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Backend Connection Test" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Check if backend is running
Write-Host "Step 1: Checking if backend is running..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$BackendUrl/docs" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ Backend is running at $BackendUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend is NOT running at $BackendUrl" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    Write-Host "`n  Start the backend with:" -ForegroundColor Yellow
    Write-Host "    cd autoposter-backend" -ForegroundColor White
    Write-Host "    python start_backend.py" -ForegroundColor White
    exit 1
}

# Test 2: Check root endpoint
Write-Host "`nStep 2: Testing root endpoint..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$BackendUrl/" -Method GET -TimeoutSec 5
    Write-Host "✓ Root endpoint responding" -ForegroundColor Green
    Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Root endpoint failed: $_" -ForegroundColor Red
}

# Test 3: Check API health endpoints
Write-Host "`nStep 3: Testing health endpoints..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$healthEndpoints = @(
    "/api/payments/health",
    "/api/google-drive/health",
    "/api/app-store/health"
)

foreach ($endpoint in $healthEndpoints) {
    try {
        $response = Invoke-RestMethod -Uri "$BackendUrl$endpoint" -Method GET -TimeoutSec 5
        Write-Host "✓ $endpoint - OK" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  $endpoint - Not available (may be optional)" -ForegroundColor Yellow
    }
}

# Test 4: Check CORS configuration
Write-Host "`nStep 4: Testing CORS configuration..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray
try {
    $headers = @{
        "Origin" = "http://localhost:19006"
        "Access-Control-Request-Method" = "POST"
    }
    $response = Invoke-WebRequest -Uri "$BackendUrl/api/payments/health" -Method OPTIONS -Headers $headers -TimeoutSec 5 -UseBasicParsing
    if ($response.Headers["Access-Control-Allow-Origin"]) {
        Write-Host "✓ CORS configured" -ForegroundColor Green
        Write-Host "  Allow-Origin: $($response.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  CORS headers not found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  CORS test failed (may be OK): $_" -ForegroundColor Yellow
}

# Test 5: Check available routes
Write-Host "`nStep 5: Checking available API routes..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$routes = @(
    @{Path="/api/payments/health"; Name="Payments"},
    @{Path="/api/google-drive/connect"; Name="Google Drive"},
    @{Path="/api/app-store/health"; Name="App Store"},
    @{Path="/api/generate-content"; Name="Content Generation"},
    @{Path="/docs"; Name="API Documentation"}
)

foreach ($route in $routes) {
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl$($route.Path)" -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "✓ $($route.Name) - Available" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 405 -or $statusCode -eq 401) {
            Write-Host "✓ $($route.Name) - Available (requires auth)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $($route.Name) - Status: $statusCode" -ForegroundColor Yellow
        }
    }
}

# Test 6: Frontend configuration check
Write-Host "`nStep 6: Checking frontend configuration..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$envFile = Join-Path (Split-Path $PSScriptRoot) ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $apiUrlFound = $false
    foreach ($line in $envContent) {
        if ($line -match "^EXPO_PUBLIC_API_BASE_URL=(.+)$") {
            $apiUrl = $matches[1].Trim()
            Write-Host "✓ EXPO_PUBLIC_API_BASE_URL: $apiUrl" -ForegroundColor Green
            $apiUrlFound = $true
            
            if ($apiUrl -ne $BackendUrl) {
                Write-Host "  ⚠️  Frontend URL doesn't match backend URL" -ForegroundColor Yellow
                Write-Host "     Frontend: $apiUrl" -ForegroundColor Gray
                Write-Host "     Backend:  $BackendUrl" -ForegroundColor Gray
            }
        }
    }
    if (-not $apiUrlFound) {
        Write-Host "⚠️  EXPO_PUBLIC_API_BASE_URL not found in .env" -ForegroundColor Yellow
        Write-Host "  Add: EXPO_PUBLIC_API_BASE_URL=$BackendUrl" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  .env file not found in project root" -ForegroundColor Yellow
    Write-Host "  Create .env file with: EXPO_PUBLIC_API_BASE_URL=$BackendUrl" -ForegroundColor White
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Backend URL: $BackendUrl" -ForegroundColor White
Write-Host "API Docs: $BackendUrl/docs" -ForegroundColor Cyan
Write-Host "`n✅ Backend is ready for testing!`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure frontend .env has: EXPO_PUBLIC_API_BASE_URL=$BackendUrl" -ForegroundColor White
Write-Host "  2. Restart Expo if needed: npx expo start --clear" -ForegroundColor White
Write-Host "  3. Test features in the app`n" -ForegroundColor White

