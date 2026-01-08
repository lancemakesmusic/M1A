# Quick Expo Startup Script
# Run this in PowerShell: .\START_EXPO.ps1

Write-Host "📱 Starting Expo..." -ForegroundColor Cyan
Write-Host ""

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found! Please install Node.js." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Expo with cache clear..." -ForegroundColor Yellow
Write-Host "QR code will appear shortly..." -ForegroundColor Gray
Write-Host ""

# Start Expo with cache clear for faster loading
npx expo start --clear





