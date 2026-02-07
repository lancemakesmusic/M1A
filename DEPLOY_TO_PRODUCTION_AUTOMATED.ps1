# Production Deployment Script (Automated)
# Deploys to Firebase, builds for TestFlight, and prepares App Store submission

param(
    [switch]$SkipFirebase = $false,
    [switch]$SkipBuild = $false,
    [switch]$TestFlightOnly = $false,
    [string]$ReleaseVersion = "",
    [switch]$AutoConfirmBuild = $false,
    [switch]$AutoContinueOnFirebaseError = $false
)

Write-Host "`nM1A Production Deployment" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

# Step 1: Update Version Numbers
Write-Host "`nStep 1: Updating version numbers..." -ForegroundColor Yellow

$appJson = Get-Content "app.json" | ConvertFrom-Json
$currentVersion = $appJson.expo.version
$currentBuild = $appJson.expo.ios.buildNumber

Write-Host "Current Version: $currentVersion" -ForegroundColor Gray
Write-Host "Current Build: $currentBuild" -ForegroundColor Gray

# Prompt for new version (or use provided)
if (-not [string]::IsNullOrWhiteSpace($ReleaseVersion)) {
    $newVersion = $ReleaseVersion
} else {
    $newVersion = Read-Host "Enter new version or press Enter to keep $currentVersion"
    if ([string]::IsNullOrWhiteSpace($newVersion)) {
        $newVersion = $currentVersion
    }
}

# Increment build number
$newBuild = [int]$currentBuild + 1
Write-Host "New Build Number: $newBuild" -ForegroundColor Green

# Update app.json
$appJson.expo.version = $newVersion
$appJson.expo.ios.buildNumber = $newBuild.ToString()
$appJson | ConvertTo-Json -Depth 10 | Set-Content "app.json"

Write-Host "Version updated to $newVersion (Build $newBuild)" -ForegroundColor Green

# Step 2: Deploy Firebase (if not skipped)
if (-not $SkipFirebase) {
    Write-Host "`nStep 2: Deploying to Firebase..." -ForegroundColor Yellow
    
    Write-Host "`nDeploying Firestore rules..." -ForegroundColor Cyan
    firebase deploy --only firestore:rules
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Firebase deployment complete!" -ForegroundColor Green
    } else {
        if ($AutoContinueOnFirebaseError) {
            Write-Host "Firebase deployment had issues. Auto-continue enabled." -ForegroundColor Yellow
        } else {
            Write-Host "Firebase deployment had issues. Continue anyway? (Y/N)" -ForegroundColor Yellow
            $continue = Read-Host
            if ($continue -ne "Y" -and $continue -ne "y") {
                exit 1
            }
        }
    }
} else {
    Write-Host "`nSkipping Firebase deployment" -ForegroundColor Gray
}

# Step 3: Build for TestFlight
if (-not $SkipBuild) {
    Write-Host "`nStep 3: Building for TestFlight..." -ForegroundColor Yellow
    
    Write-Host "`nThis will:" -ForegroundColor Cyan
    Write-Host "  1. Build iOS app with EAS Build" -ForegroundColor White
    Write-Host "  2. Submit to TestFlight automatically" -ForegroundColor White
    Write-Host "  3. Take 15-30 minutes" -ForegroundColor White
    
    if ($AutoConfirmBuild) {
        $confirm = "Y"
    } else {
        $confirm = Read-Host "`nContinue with TestFlight build? (Y/N)"
    }
    if ($confirm -eq "Y" -or $confirm -eq "y") {
        Write-Host "`nStarting EAS Build..." -ForegroundColor Cyan
        
        if ($TestFlightOnly) {
            eas build --platform ios --profile production --non-interactive
            Write-Host "`nSubmitting to TestFlight..." -ForegroundColor Cyan
            eas submit --platform ios --profile production --non-interactive
        } else {
            eas build --platform ios --profile production --non-interactive
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`nBuild complete! Check EAS dashboard for status." -ForegroundColor Green
        } else {
            Write-Host "`nBuild failed. Check errors above." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Skipping build" -ForegroundColor Gray
    }
} else {
    Write-Host "`nSkipping build" -ForegroundColor Gray
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "Version: $newVersion" -ForegroundColor White
Write-Host "Build: $newBuild" -ForegroundColor White

if (-not $SkipFirebase) {
    Write-Host "Firebase: Deployed" -ForegroundColor Green
} else {
    Write-Host "Firebase: Skipped" -ForegroundColor Gray
}

if (-not $SkipBuild) {
    Write-Host "TestFlight: Building" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "  1. Wait for EAS build to complete (15-30 min)" -ForegroundColor White
    Write-Host "  2. Check TestFlight: https://appstoreconnect.apple.com" -ForegroundColor White
    Write-Host "  3. Add testers and distribute build" -ForegroundColor White
} else {
    Write-Host "TestFlight: Skipped" -ForegroundColor Gray
}

Write-Host "`nDeployment process started!" -ForegroundColor Green
