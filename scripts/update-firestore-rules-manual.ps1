# PowerShell script to open Firebase Console and show rules to copy
# This is a helper script that opens the browser and displays the rules

Write-Host "Firestore Rules Update Helper" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Rules content
$rules = @"
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 13);
    }
  }
}
"@

Write-Host "Test Mode Rules (30 days):" -ForegroundColor Yellow
Write-Host "---------------------------" -ForegroundColor Yellow
Write-Host $rules -ForegroundColor White
Write-Host ""

# Copy to clipboard
$rules | Set-Clipboard
Write-Host "Rules copied to clipboard!" -ForegroundColor Green
Write-Host ""

# Open Firebase Console
$firestoreUrl = "https://console.firebase.google.com/project/m1alive/firestore/rules"
Write-Host "Opening Firebase Console..." -ForegroundColor Cyan
Write-Host "URL: $firestoreUrl" -ForegroundColor White
Write-Host ""

Start-Process $firestoreUrl

Write-Host "Instructions:" -ForegroundColor Cyan
Write-Host "1. The rules above have been copied to your clipboard" -ForegroundColor White
Write-Host "2. Firebase Console should open in your browser" -ForegroundColor White
Write-Host "3. Paste the rules (Ctrl+V) into the Rules editor" -ForegroundColor White
Write-Host "4. Click 'Publish' button" -ForegroundColor White
Write-Host "5. Wait for confirmation" -ForegroundColor White
Write-Host "6. Run: node scripts/migrate-mock-data-to-firestore.js" -ForegroundColor White
Write-Host ""

