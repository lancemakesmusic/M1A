# PowerShell script to set Firestore to test mode
# This allows all reads/writes for 30 days (for development/testing)

Write-Host "Setting Firestore to Test Mode..." -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
$firebaseInstalled = $false
try {
    $version = firebase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $firebaseInstalled = $true
        Write-Host "Firebase CLI found: $version" -ForegroundColor Green
    }
} catch {
    $firebaseInstalled = $false
}

if (-not $firebaseInstalled) {
    Write-Host "Firebase CLI is not installed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install Firebase CLI (Recommended)" -ForegroundColor Cyan
    Write-Host "  npm install -g firebase-tools" -ForegroundColor White
    Write-Host "  firebase login" -ForegroundColor White
    Write-Host "  firebase use --add" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Manual Update (Easier for now)" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://console.firebase.google.com" -ForegroundColor White
    Write-Host "  2. Select project: m1alive" -ForegroundColor White
    Write-Host "  3. Build > Firestore Database > Rules" -ForegroundColor White
    Write-Host "  4. Copy the rules from FIX_FIRESTORE_PERMISSIONS.md" -ForegroundColor White
    Write-Host "  5. Paste and click Publish" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Create temporary rules file
$rulesContent = @"
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 13);
    }
  }
}
"@

$rulesFile = Join-Path $PSScriptRoot "firestore.rules"
$rulesContent | Out-File -FilePath $rulesFile -Encoding UTF8 -NoNewline

Write-Host "Created temporary rules file: $rulesFile" -ForegroundColor Green
Write-Host ""

# Check if user is logged in
Write-Host "Checking Firebase authentication..." -ForegroundColor Yellow
try {
    $projects = firebase projects:list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not logged in to Firebase. Please run: firebase login" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "After logging in, run this script again." -ForegroundColor Yellow
        Remove-Item $rulesFile -ErrorAction SilentlyContinue
        exit 1
    }
} catch {
    Write-Host "Error checking Firebase authentication." -ForegroundColor Red
    Remove-Item $rulesFile -ErrorAction SilentlyContinue
    exit 1
}

# Deploy rules
Write-Host "Deploying Firestore rules..." -ForegroundColor Yellow
Write-Host ""

try {
    # Change to project root
    $projectRoot = Split-Path $PSScriptRoot -Parent
    Push-Location $projectRoot
    
    # Deploy rules
    firebase deploy --only firestore:rules --project m1alive
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Successfully updated Firestore rules to test mode!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run the migration script:" -ForegroundColor Cyan
        Write-Host "  node scripts/migrate-mock-data-to-firestore.js" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Failed to deploy rules. Please check the error above." -ForegroundColor Red
        Write-Host ""
        Write-Host "Alternative: Update rules manually in Firebase Console:" -ForegroundColor Yellow
        Write-Host "  https://console.firebase.google.com/project/m1alive/firestore/rules" -ForegroundColor White
    }
} catch {
    Write-Host "Error deploying rules: $_" -ForegroundColor Red
} finally {
    Pop-Location
    # Clean up temp file
    Remove-Item $rulesFile -ErrorAction SilentlyContinue
}

Write-Host ""

