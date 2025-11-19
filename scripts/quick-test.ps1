# Quick App Test Script
# Run this to quickly verify all critical features

Write-Host "🧪 M1A Quick Test Script`n" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check Firebase status
Write-Host "📋 Checking Firebase Status..." -ForegroundColor Yellow
firebase firestore:indexes

Write-Host "`n📋 Checking Firebase Rules..." -ForegroundColor Yellow
Write-Host "Storage Rules: https://console.firebase.google.com/project/m1alive/storage/rules" -ForegroundColor Cyan
Write-Host "Firestore Rules: https://console.firebase.google.com/project/m1alive/firestore/rules" -ForegroundColor Cyan
Write-Host "Firestore Indexes: https://console.firebase.google.com/project/m1alive/firestore/indexes`n" -ForegroundColor Cyan

# Check for common issues
Write-Host "🔍 Checking for Common Issues..." -ForegroundColor Yellow

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ .env file missing!" -ForegroundColor Red
}

# Check if storage.rules exists
if (Test-Path "storage.rules") {
    Write-Host "✅ storage.rules exists" -ForegroundColor Green
} else {
    Write-Host "❌ storage.rules missing!" -ForegroundColor Red
}

# Check if firestore.rules exists
if (Test-Path "firestore.rules") {
    Write-Host "✅ firestore.rules exists" -ForegroundColor Green
} else {
    Write-Host "❌ firestore.rules missing!" -ForegroundColor Red
}

# Check if firestore.indexes.json exists
if (Test-Path "firestore.indexes.json") {
    Write-Host "✅ firestore.indexes.json exists" -ForegroundColor Green
} else {
    Write-Host "❌ firestore.indexes.json missing!" -ForegroundColor Red
}

# Check if assets/icon.png exists
if (Test-Path "assets/icon.png") {
    Write-Host "✅ assets/icon.png exists" -ForegroundColor Green
} else {
    Write-Host "❌ assets/icon.png missing!" -ForegroundColor Red
}

Write-Host "`n================================`n" -ForegroundColor Cyan
Write-Host "✅ Quick check complete!" -ForegroundColor Green
Write-Host "`nNext: Run 'npx expo start --clear' and test the app`n" -ForegroundColor Yellow

