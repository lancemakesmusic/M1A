# Quick Calendar Health Test
# Run this after restarting your backend

$url = "http://localhost:8001/api/calendar/health"

Write-Host "`n🔍 Testing Calendar Health...`n" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method Get
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "`nStatus: $($response.status)" -ForegroundColor Cyan
    if ($response.admin_calendar_id) {
        Write-Host "Calendar ID: $($response.admin_calendar_id)" -ForegroundColor White
    }
    if ($response.message) {
        Write-Host "Message: $($response.message)" -ForegroundColor White
    }
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "  1. Backend is running on port 8001" -ForegroundColor White
    Write-Host "  2. Backend was restarted after adding calendar router" -ForegroundColor White
    Write-Host "  3. Check backend logs for calendar router loading" -ForegroundColor White
}

