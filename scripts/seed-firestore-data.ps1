# scripts/seed-firestore-data.ps1
# PowerShell script to seed Firestore with services and events

Write-Host "🌱 Seeding Firestore with Services and Events..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create one with Firebase credentials." -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Run the seed script
Write-Host "📦 Running seed script..." -ForegroundColor Yellow
node scripts/seed-services-and-events.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Seeding complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Check ExploreScreen - services and events should now be visible"
    Write-Host "   2. Test booking flow - click on a service or event"
    Write-Host "   3. Verify NYE event appears in Events category"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Seeding failed. Check the error messages above." -ForegroundColor Red
    exit 1
}

