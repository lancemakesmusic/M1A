# M1A App - Complete Setup Script
# This script guides you through Firebase and Stripe setup

Write-Host "M1A App - Complete Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
$envFile = Join-Path $PSScriptRoot ".env"
$envTemplate = Join-Path $PSScriptRoot ".env.template"

if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    if (Test-Path $envTemplate) {
        Copy-Item $envTemplate $envFile
        Write-Host ".env file created! Please edit it with your Firebase and Stripe keys." -ForegroundColor Green
    } else {
        Write-Host "⚠️  .env.template not found. Creating basic .env file..." -ForegroundColor Yellow
        @"
# M1A App Environment Variables
# Fill in your values below

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
"@ | Out-File -FilePath $envFile -Encoding UTF8
        Write-Host ".env file created!" -ForegroundColor Green
    }
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

# Check backend .env
$backendEnvFile = Join-Path (Join-Path $PSScriptRoot "autoposter-backend") ".env"
$backendEnvTemplate = Join-Path (Join-Path $PSScriptRoot "autoposter-backend") ".env.template"

if (-not (Test-Path $backendEnvFile)) {
    Write-Host ""
    Write-Host "Creating backend .env file..." -ForegroundColor Yellow
    if (Test-Path $backendEnvTemplate) {
        Copy-Item $backendEnvTemplate $backendEnvFile
        Write-Host "✅ Backend .env file created!" -ForegroundColor Green
    } else {
        @"
# Backend Environment Variables
STRIPE_SECRET_KEY=
"@ | Out-File -FilePath $backendEnvFile -Encoding UTF8
        Write-Host "✅ Backend .env file created!" -ForegroundColor Green
    }
} else {
    Write-Host "Backend .env file already exists" -ForegroundColor Green
}

# Check Firebase configuration
Write-Host ""
Write-Host "Checking Firebase Configuration..." -ForegroundColor Cyan
$firebaseConfigured = $false
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "EXPO_PUBLIC_FIREBASE_API_KEY=(?!your_|$)" -and 
        $envContent -match "EXPO_PUBLIC_FIREBASE_PROJECT_ID=(?!your-|$)" -and
        $envContent -notmatch "EXPO_PUBLIC_FIREBASE_API_KEY=\s*$") {
        $firebaseConfigured = $true
    }
}

if ($firebaseConfigured) {
    Write-Host "Firebase appears to be configured" -ForegroundColor Green
} else {
    Write-Host "Firebase NOT configured" -ForegroundColor Red
    Write-Host "   See SETUP_FIREBASE.md for instructions" -ForegroundColor Yellow
    Write-Host "   https://console.firebase.google.com" -ForegroundColor Yellow
}

# Check Stripe configuration
Write-Host ""
Write-Host "Checking Stripe Configuration..." -ForegroundColor Cyan
$stripeFrontendConfigured = $false
$stripeBackendConfigured = $false

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_" -and
        $envContent -notmatch "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_") {
        $stripeFrontendConfigured = $true
    }
}

if (Test-Path $backendEnvFile) {
    $backendEnvContent = Get-Content $backendEnvFile -Raw
    if ($backendEnvContent -match "STRIPE_SECRET_KEY=sk_" -and
        $backendEnvContent -notmatch "STRIPE_SECRET_KEY=sk_test_your_") {
        $stripeBackendConfigured = $true
    }
}

if ($stripeFrontendConfigured) {
    Write-Host "Stripe Frontend (Publishable Key) configured" -ForegroundColor Green
} else {
    Write-Host "Stripe Frontend NOT configured" -ForegroundColor Red
    Write-Host "   See SETUP_STRIPE.md for instructions" -ForegroundColor Yellow
    Write-Host "   https://dashboard.stripe.com/apikeys" -ForegroundColor Yellow
}

if ($stripeBackendConfigured) {
    Write-Host "Stripe Backend (Secret Key) configured" -ForegroundColor Green
} else {
    Write-Host "Stripe Backend NOT configured" -ForegroundColor Red
    Write-Host "   Add STRIPE_SECRET_KEY to autoposter-backend/.env" -ForegroundColor Yellow
    Write-Host "   https://dashboard.stripe.com/apikeys" -ForegroundColor Yellow
}

# Check backend status
Write-Host ""
Write-Host "Checking Backend Status..." -ForegroundColor Cyan
$portCheck = netstat -ano | findstr :8001
if ($portCheck) {
    Write-Host "Backend is running on port 8001" -ForegroundColor Green
    try {
        $response = Invoke-WebRequest -Uri "http://172.20.10.3:8001/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        Write-Host "Backend is accessible at 172.20.10.3:8001" -ForegroundColor Green
    } catch {
        Write-Host "Backend may not be accessible from network" -ForegroundColor Yellow
    }
} else {
    Write-Host "Backend is NOT running" -ForegroundColor Red
    Write-Host "   Start backend: cd autoposter-backend; python start_backend.py" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "Setup Status Summary:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

$allConfigured = $true

if ($firebaseConfigured) {
    Write-Host "Firebase: Configured" -ForegroundColor Green
} else {
    Write-Host "Firebase: NOT Configured" -ForegroundColor Red
    $allConfigured = $false
}

if ($stripeFrontendConfigured -and $stripeBackendConfigured) {
    Write-Host "Stripe: Configured" -ForegroundColor Green
} else {
    Write-Host "Stripe: NOT Configured" -ForegroundColor Red
    $allConfigured = $false
}

if ($portCheck) {
    Write-Host "Backend: Running" -ForegroundColor Green
} else {
    Write-Host "Backend: NOT Running" -ForegroundColor Red
    $allConfigured = $false
}

Write-Host ""

if ($allConfigured) {
    Write-Host "All systems configured! Ready for testing." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Run data migration: node scripts/migrate-mock-data-to-firestore.js" -ForegroundColor White
    Write-Host "2. Restart Expo app" -ForegroundColor White
    Write-Host "3. Test booking flow end-to-end" -ForegroundColor White
    Write-Host "4. See LAUNCH_SETUP_GUIDE.md for complete testing checklist" -ForegroundColor White
} else {
    Write-Host "Setup incomplete. Please complete the missing items above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Setup Guides:" -ForegroundColor Cyan
    Write-Host "- Firebase: SETUP_FIREBASE.md" -ForegroundColor White
    Write-Host "- Stripe: SETUP_STRIPE.md" -ForegroundColor White
    Write-Host "- Complete Guide: LAUNCH_SETUP_GUIDE.md" -ForegroundColor White
}

Write-Host ""
Write-Host "Setup check complete!" -ForegroundColor Green
Write-Host ""

