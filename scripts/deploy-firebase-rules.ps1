# PowerShell Script to Deploy Firebase Storage and Firestore Rules
# This script will login to Firebase and deploy the rules

Write-Host "🔥 Firebase Rules Deployment Script" -ForegroundColor Cyan
Write-Host "===================================`n" -ForegroundColor Cyan

# Check if Firebase CLI is installed
Write-Host "📋 Step 1: Checking Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "✅ Firebase CLI installed: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
}

# Check if logged in
Write-Host "`n📋 Step 2: Checking Firebase authentication..." -ForegroundColor Yellow
try {
    firebase projects:list 2>&1 | Out-Null
    Write-Host "✅ Already logged in to Firebase" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not logged in. Please login..." -ForegroundColor Yellow
    Write-Host "Opening Firebase login in browser..." -ForegroundColor Cyan
    firebase login
}

# Initialize Firebase if needed
if (-not (Test-Path ".firebaserc")) {
    Write-Host "`n📋 Step 3: Initializing Firebase project..." -ForegroundColor Yellow
    Write-Host "Project ID: m1alive" -ForegroundColor Cyan
    firebase init --project m1alive
} else {
    Write-Host "`n✅ Firebase project already initialized" -ForegroundColor Green
}

# Check if storage.rules exists
if (-not (Test-Path "storage.rules")) {
    Write-Host "❌ storage.rules file not found!" -ForegroundColor Red
    exit 1
}

# Check if firestore.rules exists
if (-not (Test-Path "firestore.rules")) {
    Write-Host "❌ firestore.rules file not found!" -ForegroundColor Red
    exit 1
}

# Deploy Storage Rules
Write-Host "`n📋 Step 4: Deploying Firebase Storage Rules..." -ForegroundColor Yellow
Write-Host "Deploying storage.rules..." -ForegroundColor Cyan
firebase deploy --only storage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Storage rules deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Storage rules deployment failed!" -ForegroundColor Red
    exit 1
}

# Deploy Firestore Rules
Write-Host "`n📋 Step 5: Deploying Firestore Rules..." -ForegroundColor Yellow
Write-Host "Deploying firestore.rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firestore rules deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Firestore rules deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "✅ All rules deployed successfully!" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Create Firestore indexes (see firebase-indexes.html)" -ForegroundColor White
Write-Host "2. Wait 1-5 minutes for indexes to build" -ForegroundColor White
Write-Host "3. Test your app - upload a profile photo!" -ForegroundColor White

