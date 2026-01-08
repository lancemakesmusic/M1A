# Deployment Script - Fixed for PowerShell
# Run this for complete deployment

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "M1A Production Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Firebase Auth
Write-Host "Step 1: Checking Firebase authentication..." -ForegroundColor Yellow
Write-Host ""

$firebaseCheck = firebase projects:list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Firebase authentication required!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this command first:" -ForegroundColor Yellow
    Write-Host "  firebase login --reauth" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "Firebase authenticated!" -ForegroundColor Green
Write-Host ""

# Step 2: Deploy Firebase
Write-Host "Step 2: Deploying Firebase Firestore rules..." -ForegroundColor Yellow
Write-Host ""

firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Firebase deployment failed!" -ForegroundColor Red
    Write-Host "Continue with build anyway? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "Firebase deployment complete!" -ForegroundColor Green
    Write-Host ""
}

# Step 3: Build for TestFlight
Write-Host "Step 3: Building for TestFlight..." -ForegroundColor Yellow
Write-Host ""
Write-Host "This will:" -ForegroundColor Cyan
Write-Host "  - Build iOS app with EAS Build" -ForegroundColor White
Write-Host "  - Take 15-30 minutes" -ForegroundColor White
Write-Host "  - Upload to EAS servers" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Start build? (Y/N)"
if ($confirm -eq "Y" -or $confirm -eq "y") {
    Write-Host ""
    Write-Host "Starting EAS build..." -ForegroundColor Cyan
    Write-Host ""
    
    eas build --platform ios --profile production
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Build started successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Check build status at: https://expo.dev" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "Build failed. Check errors above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "Build skipped." -ForegroundColor Gray
    Write-Host ""
}

# Step 4: Submit to TestFlight
Write-Host ""
Write-Host "Step 4: Submit to TestFlight" -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait for build to complete first (15-30 minutes)" -ForegroundColor Gray
Write-Host ""

$submit = Read-Host "Submit to TestFlight now? (Y/N)"
if ($submit -eq "Y" -or $submit -eq "y") {
    Write-Host ""
    Write-Host "Submitting to TestFlight..." -ForegroundColor Cyan
    Write-Host ""
    
    eas submit --platform ios --profile production --latest
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Submitted to TestFlight!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Submission failed. You can submit later with:" -ForegroundColor Yellow
        Write-Host "  eas submit --platform ios --profile production --latest" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "To submit later, run:" -ForegroundColor Cyan
    Write-Host "  eas submit --platform ios --profile production --latest" -ForegroundColor White
    Write-Host ""
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$appJson = Get-Content "app.json" | ConvertFrom-Json
Write-Host "Version: $($appJson.expo.version)" -ForegroundColor White
Write-Host "Build: $($appJson.expo.ios.buildNumber)" -ForegroundColor White
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Wait for build to complete (15-30 min)" -ForegroundColor White
Write-Host "  2. Check status: https://expo.dev" -ForegroundColor White
Write-Host "  3. Add testers in TestFlight" -ForegroundColor White
Write-Host "  4. Submit to App Store when ready" -ForegroundColor White
Write-Host ""

Write-Host "Deployment process started!" -ForegroundColor Green
Write-Host ""




