# Test Calendar Health Endpoint
# PowerShell script to test the calendar API

Write-Host "`n🔍 Testing Calendar Health Endpoint...`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:8001"

# Test 1: Check if backend is running
Write-Host "1. Checking if backend is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$baseUrl/docs" -Method Get -ErrorAction Stop
    Write-Host "   ✅ Backend is running" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Start your backend with: python -m uvicorn api.main:app --reload --port 8001" -ForegroundColor Yellow
    exit
}

# Test 2: Check calendar health endpoint
Write-Host "`n2. Testing calendar health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/calendar/health" -Method Get -ErrorAction Stop
    Write-Host "   ✅ Calendar endpoint is working!" -ForegroundColor Green
    Write-Host "`n   Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
    if ($response.status -eq "healthy") {
        Write-Host "`n   ✅ Calendar service is configured correctly!" -ForegroundColor Green
        Write-Host "   Admin Calendar ID: $($response.admin_calendar_id)" -ForegroundColor White
        Write-Host "   Service Account Configured: $($response.service_account_configured)" -ForegroundColor White
    } elseif ($response.status -eq "unconfigured") {
        Write-Host "`n   ⚠️  Calendar service needs configuration" -ForegroundColor Yellow
        Write-Host "   Message: $($response.message)" -ForegroundColor White
    } else {
        Write-Host "`n   ⚠️  Calendar service has issues" -ForegroundColor Yellow
        Write-Host "   Status: $($response.status)" -ForegroundColor White
        Write-Host "   Message: $($response.message)" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Calendar endpoint not found or error occurred" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "`n   Possible issues:" -ForegroundColor Yellow
    Write-Host "   - Calendar router not loaded (check backend logs)" -ForegroundColor White
    Write-Host "   - Backend needs to be restarted" -ForegroundColor White
    Write-Host "   - Route path might be incorrect" -ForegroundColor White
}

# Test 3: Check API documentation
Write-Host "`n3. Check API documentation for calendar endpoints..." -ForegroundColor Yellow
Write-Host "   Open in browser: $baseUrl/docs" -ForegroundColor Cyan
Write-Host "   Look for '/api/calendar' endpoints" -ForegroundColor White

Write-Host "`n✅ Testing complete!`n" -ForegroundColor Green

