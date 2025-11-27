# Quick test to verify webhook endpoint is accessible
Write-Host "Testing Webhook Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if endpoint exists (should return 400 for invalid signature, which is good!)
Write-Host "Test 1: Testing webhook endpoint (expecting 400 = good!)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/payments/webhook" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "stripe-signature" = "test_signature"
        } `
        -Body '{}' `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    Write-Host "Unexpected success: $($response.StatusCode)" -ForegroundColor Yellow
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✅ Webhook endpoint exists and verifies signatures!" -ForegroundColor Green
        Write-Host "   (400 = Invalid signature, which means security is working)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "❌ Webhook endpoint not found (404)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor Yellow
        Write-Host "1. Check backend is running: python autoposter-backend/start_backend.py" -ForegroundColor White
        Write-Host "2. Check backend logs for 'Payment routes loaded'" -ForegroundColor White
        Write-Host "3. Verify api/payments.py exists and router is included" -ForegroundColor White
        Write-Host "4. Try accessing: http://localhost:8001/docs to see all endpoints" -ForegroundColor White
    } elseif ($statusCode -eq 500) {
        Write-Host "⚠️  Webhook endpoint exists but has an error (500)" -ForegroundColor Yellow
        Write-Host "   Check backend logs for details" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Unexpected status: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Test 2: Check all available endpoints" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/docs" -Method GET -TimeoutSec 5
    Write-Host "✅ API docs accessible at http://localhost:8001/docs" -ForegroundColor Green
    Write-Host "   Open in browser to see all registered endpoints" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Cannot access API docs - backend may not be running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Test 3: List all payment endpoints" -ForegroundColor Yellow
$endpoints = @(
    "/api/payments/health",
    "/api/payments/create-intent",
    "/api/payments/confirm",
    "/api/payments/webhook"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001$endpoint" `
            -Method GET `
            -TimeoutSec 2 `
            -ErrorAction SilentlyContinue
        Write-Host "✅ $endpoint - Accessible" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 405) {
            Write-Host "✅ $endpoint - Exists (405 = method not allowed, but endpoint exists)" -ForegroundColor Green
        } elseif ($statusCode -eq 404) {
            Write-Host "❌ $endpoint - Not found" -ForegroundColor Red
        } else {
            Write-Host "⚠️  $endpoint - Status: $statusCode" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If webhook returns 400: ✅ Endpoint exists and security works!" -ForegroundColor Green
Write-Host "If webhook returns 404: ❌ Check backend is running and router included" -ForegroundColor Red
Write-Host ""
Write-Host "Next: Test with Stripe CLI for real webhook testing" -ForegroundColor Cyan

