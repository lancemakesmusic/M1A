# Google Drive Setup Verification Script
# Verifies that Google Drive integration is properly configured

param(
    [string]$TestFolderName = "test-m1a-folder-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Google Drive Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Load environment variables from .env
$envPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    foreach ($line in $envContent) {
        if ($line -match "^([^#][^=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Check Python
Write-Host "Step 1: Checking Python..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found" -ForegroundColor Red
    exit 1
}

# Check required packages
Write-Host "`nStep 2: Checking Python packages..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray
$packages = @("google.auth", "googleapiclient")
$allInstalled = $true
foreach ($pkg in $packages) {
    try {
        python -c "import $($pkg.Replace('.', '_'))" 2>&1 | Out-Null
        Write-Host "✓ $pkg installed" -ForegroundColor Green
    } catch {
        Write-Host "✗ $pkg NOT installed" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host "`n⚠️  Install missing packages:" -ForegroundColor Yellow
    Write-Host "   pip install google-auth google-api-python-client" -ForegroundColor White
    exit 1
}

# Check environment variables
Write-Host "`nStep 3: Checking configuration..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$serviceAccountPath = $env:GOOGLE_APPLICATION_CREDENTIALS
if (-not $serviceAccountPath) {
    $serviceAccountPath = $env:GOOGLE_SERVICE_ACCOUNT_FILE
}

$parentFolderId = $env:GOOGLE_DRIVE_PARENT_FOLDER_ID
if (-not $parentFolderId) {
    $parentFolderId = "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc"
}

if ($serviceAccountPath) {
    Write-Host "✓ Service Account: $serviceAccountPath" -ForegroundColor Green
    if (Test-Path $serviceAccountPath) {
        Write-Host "  ✓ File exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ File NOT FOUND" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✗ No service account configured" -ForegroundColor Red
    Write-Host "  Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_FILE" -ForegroundColor Yellow
    exit 1
}

if ($parentFolderId) {
    Write-Host "✓ Parent Folder ID: $parentFolderId" -ForegroundColor Green
} else {
    Write-Host "✗ Parent Folder ID not set" -ForegroundColor Red
    exit 1
}

# Read service account email
Write-Host "`nStep 4: Reading service account..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray
try {
    $jsonContent = Get-Content $serviceAccountPath -Raw | ConvertFrom-Json
    $serviceAccountEmail = $jsonContent.client_email
    $projectId = $jsonContent.project_id
    
    if ($serviceAccountEmail) {
        Write-Host "✓ Service Account Email: $serviceAccountEmail" -ForegroundColor Green
        Write-Host "✓ Project ID: $projectId" -ForegroundColor Green
    } else {
        Write-Host "✗ Invalid JSON: missing client_email" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Error reading JSON: $_" -ForegroundColor Red
    exit 1
}

# Test folder creation
Write-Host "`nStep 5: Testing folder creation..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$testScript = @"
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

try:
    # Load credentials
    creds_path = r'$serviceAccountPath'
    parent_folder_id = '$parentFolderId'
    test_folder_name = '$TestFolderName'
    
    SCOPES = ['https://www.googleapis.com/auth/drive']
    credentials = service_account.Credentials.from_service_account_file(
        creds_path, scopes=SCOPES
    )
    drive_service = build('drive', 'v3', credentials=credentials)
    
    # Create test folder
    folder_metadata = {
        'name': test_folder_name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_folder_id]
    }
    
    folder = drive_service.files().create(
        body=folder_metadata,
        fields='id, name, webViewLink'
    ).execute()
    
    folder_id = folder.get('id')
    folder_url = folder.get('webViewLink')
    
    print(f'SUCCESS: Folder created')
    print(f'Folder ID: {folder_id}')
    print(f'Folder Name: {test_folder_name}')
    print(f'Folder URL: {folder_url}')
    
    # Clean up - delete test folder
    try:
        drive_service.files().delete(fileId=folder_id).execute()
        print(f'CLEANUP: Test folder deleted')
    except:
        print(f'WARNING: Could not delete test folder. Delete manually: {folder_url}')
    
except HttpError as e:
    if e.resp.status == 403:
        print(f'ERROR: Permission denied')
        print(f'Make sure the parent folder is shared with: $serviceAccountEmail')
        print(f'Folder URL: https://drive.google.com/drive/folders/{parent_folder_id}')
    else:
        print(f'ERROR: {e}')
    exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    exit(1)
"@

$testScriptPath = Join-Path $PSScriptRoot "test_drive_temp.py"
$testScript | Out-File -FilePath $testScriptPath -Encoding UTF8

try {
    Write-Host "Creating test folder: $TestFolderName" -ForegroundColor White
    $result = python $testScriptPath 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ SUCCESS! Google Drive is properly configured." -ForegroundColor Green
        Write-Host $result -ForegroundColor White
        Write-Host "`n✓ Service account has access to create folders" -ForegroundColor Green
        Write-Host "✓ Parent folder permissions are correct" -ForegroundColor Green
    } else {
        Write-Host "`n❌ FAILED: Google Drive setup incomplete" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        
        if ($result -match "Permission denied") {
            Write-Host "`n📋 Fix:" -ForegroundColor Yellow
            Write-Host "  1. Open: https://drive.google.com/drive/folders/$parentFolderId" -ForegroundColor White
            Write-Host "  2. Click 'Share'" -ForegroundColor White
            Write-Host "  3. Add: $serviceAccountEmail" -ForegroundColor White
            Write-Host "  4. Give 'Editor' permissions" -ForegroundColor White
            Write-Host "  5. Click 'Send'" -ForegroundColor White
        }
        exit 1
    }
} catch {
    Write-Host "✗ Error running test: $_" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $testScriptPath) {
        Remove-Item $testScriptPath -Force
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan


