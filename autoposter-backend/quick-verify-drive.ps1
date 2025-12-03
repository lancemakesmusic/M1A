# Quick Google Drive Verification
# Simple script that uses the Python test file directly

param(
    [string]$TestFolderName = "test-m1a-folder-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Google Drive Quick Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Detect Python
$pythonCmd = "python"
$venvPython = Join-Path (Split-Path $PSScriptRoot) ".venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
    Write-Host "✓ Using virtual environment" -ForegroundColor Green
}

# Check service account
$envPath = Join-Path $PSScriptRoot ".env"
$serviceAccountPath = $null
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^GOOGLE_APPLICATION_CREDENTIALS=(.+)$") {
            $serviceAccountPath = $matches[1].Trim()
            break
        }
    }
}

if (-not $serviceAccountPath -or -not (Test-Path $serviceAccountPath)) {
    Write-Host "✗ Service account file not found" -ForegroundColor Red
    Write-Host "  Check .env file for GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Yellow
    exit 1
}

$parentFolderId = "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc"
$testScript = Join-Path $PSScriptRoot "test_drive_creation.py"

Write-Host "`nTesting folder creation..." -ForegroundColor Yellow
Write-Host "  Service Account: $serviceAccountPath" -ForegroundColor Gray
Write-Host "  Parent Folder: $parentFolderId" -ForegroundColor Gray
Write-Host "  Test Folder: $TestFolderName`n" -ForegroundColor Gray

$result = & $pythonCmd $testScript $serviceAccountPath $parentFolderId $TestFolderName 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCCESS! Google Drive is properly configured.`n" -ForegroundColor Green
    Write-Host $result -ForegroundColor White
    Write-Host "`n✓ Service account has access to create folders" -ForegroundColor Green
    Write-Host "✓ Parent folder permissions are correct" -ForegroundColor Green
} else {
    Write-Host "`n❌ FAILED: Google Drive setup incomplete`n" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

