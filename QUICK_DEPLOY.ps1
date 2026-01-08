# Quick Deployment Script - TestFlight & App Store
# Run this for a complete deployment

Write-Host "`n🚀 M1A Production Deployment" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

# Step 1: Deploy Firebase
Write-Host "`n🔥 Step 1: Deploying Firebase..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️ Firebase deployment failed. Continue anyway? (Y/N)" -ForegroundColor Yellow
    $continue = Read-Host
    if ($continue -ne "Y" -and $continue -ne "y") {
        exit 1
    }
}

# Step 2: Build for TestFlight
Write-Host "`n📱 Step 2: Building for TestFlight..." -ForegroundColor Yellow
Write-Host "This will take 15-30 minutes..." -ForegroundColor Gray

$confirm = Read-Host "`nStart build? (Y/N)"
if ($confirm -eq "Y" -or $confirm -eq "y") {
    eas build --platform ios --profile production
} else {
    Write-Host "Build skipped." -ForegroundColor Gray
    exit 0
}

# Step 3: Submit to TestFlight
Write-Host "`n📤 Step 3: Submitting to TestFlight..." -ForegroundColor Yellow

$submit = Read-Host "Submit to TestFlight now? (Y/N)"
if ($submit -eq "Y" -or $submit -eq "y") {
    eas submit --platform ios --profile production --latest
} else {
    Write-Host "`nTo submit later, run:" -ForegroundColor Cyan
    Write-Host "   eas submit --platform ios --profile production --latest" -ForegroundColor White
}

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check build status: https://expo.dev" -ForegroundColor White
Write-Host "  2. Add testers in TestFlight" -ForegroundColor White
Write-Host "  3. Submit to App Store when ready" -ForegroundColor White

