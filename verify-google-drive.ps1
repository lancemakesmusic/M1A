# Google Drive Setup Verification Script
# Verifies that Google Drive integration is properly configured
# Run from the project root directory

param(
    [string]$TestFolderName = "test-m1a-folder-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    [string]$LogFile = "",
    [switch]$Verbose
)

# Setup logging
$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}
if (-not $LogFile) {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $LogFile = Join-Path $logDir "verify-google-drive_$timestamp.log"
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logMessage
    if ($Level -eq "ERROR" -or $Verbose) {
        Write-Host $logMessage
    }
}

function Write-AuditLog {
    param([string]$Action, [string]$Details = "")
    $user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $computer = $env:COMPUTERNAME
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $auditMessage = "[AUDIT] User: $user | Computer: $computer | Action: $Action | Details: $Details"
    Add-Content -Path $LogFile -Value $auditMessage
    Write-Log "Audit: $Action by $user on $computer" "AUDIT"
}

function Test-ServiceAccountPermissions {
    param([string]$JsonPath)
    try {
        $json = Get-Content $JsonPath -Raw | ConvertFrom-Json
        $email = $json.client_email
        
        if ($email -notmatch '@.*\.iam\.gserviceaccount\.com$') {
            Write-Log "Warning: Email doesn't match service account format" "WARN"
            return $false
        }
        
        $required = @('type', 'project_id', 'private_key_id', 'private_key', 'client_email')
        foreach ($field in $required) {
            if (-not $json.$field) {
                Write-Log "Missing required field: $field" "ERROR"
                return $false
            }
        }
        
        return $true
    } catch {
        Write-Log "Error validating service account: $_" "ERROR"
        return $false
    }
}

function Test-CredentialExpiration {
    param([string]$JsonPath)
    try {
        $json = Get-Content $JsonPath -Raw | ConvertFrom-Json
        if ($json.expires_at) {
            $expires = [DateTimeOffset]::FromUnixTimeSeconds($json.expires_at).DateTime
            $daysUntilExpiry = ($expires - (Get-Date)).Days
            if ($daysUntilExpiry -lt 30) {
                Write-Log "WARNING: Credentials expire in $daysUntilExpiry days" "WARN"
                return $false
            }
        }
        return $true
    } catch {
        return $true
    }
}

function Get-Separator {
    param([int]$Length = 0)
    if ($Length -eq 0) {
        try {
            $Length = $Host.UI.RawUI.WindowSize.Width - 4
            if ($Length -lt 40) { $Length = 40 }
            if ($Length -gt 100) { $Length = 100 }
        } catch {
            $Length = 60
        }
    }
    return "-" * $Length
}

function Invoke-WithRetry {
    param(
        [scriptblock]$ScriptBlock,
        [int]$MaxRetries = 3,
        [int]$DelaySeconds = 2
    )
    $attempt = 0
    $lastError = $null
    while ($attempt -lt $MaxRetries) {
        try {
            return & $ScriptBlock
        } catch {
            $attempt++
            $lastError = $_
            if ($attempt -lt $MaxRetries) {
                Write-Log "Attempt $attempt failed, retrying in $DelaySeconds seconds..." "WARN"
                Start-Sleep -Seconds $DelaySeconds
                $DelaySeconds = $DelaySeconds * 2  # Exponential backoff
            }
        }
    }
    throw $lastError
}

$separator = Get-Separator
Write-Host "`n$separator" -ForegroundColor Cyan
Write-Host "  Google Drive Verification" -ForegroundColor Cyan
Write-Host "$separator`n" -ForegroundColor Cyan

# Audit logging
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$computerName = $env:COMPUTERNAME
Write-AuditLog "Script started" "verify-google-drive.ps1"
Write-Log "Starting Google Drive verification" "INFO"
Write-Log "User: $currentUser | Computer: $computerName" "INFO"
Write-Log "Log file: $LogFile" "INFO"

# Set paths relative to script location (project root)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptRoot) {
    $scriptRoot = $PSScriptRoot
}
$backendDir = Join-Path $scriptRoot "autoposter-backend"
$envPath = Join-Path $backendDir ".env"

# Load environment variables from .env
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
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Progress -Activity "Verification" -Status "Step 1/5: Checking Python..." -PercentComplete 0
Write-Log "Checking Python installation" "INFO"
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] Python not found" -ForegroundColor Red
    exit 1
}

# Check required packages
Write-Host "`nStep 2: Checking Python packages..." -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Progress -Activity "Verification" -Status "Step 2/5: Checking packages..." -PercentComplete 20
Write-Log "Checking Python packages" "INFO"
$packages = @("google.auth", "googleapiclient")
$allInstalled = $true
foreach ($pkg in $packages) {
    try {
        python -c "import $($pkg.Replace('.', '_'))" 2>&1 | Out-Null
        Write-Host "[OK] $pkg installed" -ForegroundColor Green
    } catch {
        Write-Host "[X] $pkg NOT installed" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host "`n[!] Install missing packages:" -ForegroundColor Yellow
    Write-Host "   pip install google-auth google-api-python-client" -ForegroundColor White
    exit 1
}

# Check environment variables
Write-Host "`nStep 3: Checking configuration..." -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Progress -Activity "Verification" -Status "Step 3/5: Checking configuration..." -PercentComplete 40
Write-Log "Checking environment variables" "INFO"

$serviceAccountPath = $env:GOOGLE_APPLICATION_CREDENTIALS
if (-not $serviceAccountPath) {
    $serviceAccountPath = $env:GOOGLE_SERVICE_ACCOUNT_FILE
}

$parentFolderId = $env:GOOGLE_DRIVE_PARENT_FOLDER_ID
if (-not $parentFolderId) {
    $parentFolderId = "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc"
}

if ($serviceAccountPath) {
    Write-Host "[OK] Service Account: $serviceAccountPath" -ForegroundColor Green
    if (Test-Path $serviceAccountPath) {
        Write-Host "  [OK] File exists" -ForegroundColor Green
    } else {
        Write-Host "  [X] File NOT FOUND" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[X] No service account configured" -ForegroundColor Red
    Write-Host "  Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_FILE" -ForegroundColor Yellow
    exit 1
}

if ($parentFolderId) {
    Write-Host "[OK] Parent Folder ID: $parentFolderId" -ForegroundColor Green
} else {
    Write-Host "[X] Parent Folder ID not set" -ForegroundColor Red
    exit 1
}

# Read service account email
Write-Host "`nStep 4: Reading service account..." -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Progress -Activity "Verification" -Status "Step 4/5: Reading service account..." -PercentComplete 60
Write-Log "Reading service account details" "INFO"
try {
    $jsonContent = Invoke-WithRetry -ScriptBlock {
        Get-Content $serviceAccountPath -Raw | ConvertFrom-Json
    } -MaxRetries 3
    $serviceAccountEmail = $jsonContent.client_email
    $projectId = $jsonContent.project_id
    
    if ($serviceAccountEmail) {
        # Validate permissions
        if (-not (Test-ServiceAccountPermissions -JsonPath $serviceAccountPath)) {
            Write-Host "[X] Service account validation failed" -ForegroundColor Red
            Write-Log "Service account validation failed" "ERROR"
            exit 1
        }
        
        # Check expiration
        Test-CredentialExpiration -JsonPath $serviceAccountPath | Out-Null
        
        Write-Host "[OK] Service Account Email: $serviceAccountEmail" -ForegroundColor Green
        Write-Host "[OK] Project ID: $projectId" -ForegroundColor Green
        Write-Log "Service account validated: $serviceAccountEmail" "INFO"
        Write-AuditLog "Service account verified" "Email: $serviceAccountEmail"
    } else {
        Write-Host "[X] Invalid JSON: missing client_email" -ForegroundColor Red
        exit 1
    }
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "[X] Error reading JSON: $errorMsg" -ForegroundColor Red
    exit 1
}

# Test folder creation
Write-Host "`nStep 5: Testing folder creation..." -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Progress -Activity "Verification" -Status "Step 5/5: Testing folder creation..." -PercentComplete 80
Write-Log "Testing folder creation" "INFO"

# Escape single quotes for Python script
$escapedServiceAccountPath = $serviceAccountPath -replace "'", "''"
$escapedParentFolderId = $parentFolderId -replace "'", "''"
$escapedTestFolderName = $TestFolderName -replace "'", "''"
$escapedServiceAccountEmail = $serviceAccountEmail -replace "'", "''"

# Build Python script with proper escaping
$testScript = @"
import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

try:
    # Load credentials
    creds_path = r'$escapedServiceAccountPath'
    parent_folder_id = '$escapedParentFolderId'
    test_folder_name = '$escapedTestFolderName'
    service_account_email = '$escapedServiceAccountEmail'
    
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
    
    print('SUCCESS: Folder created')
    print('Folder ID: ' + folder_id)
    print('Folder Name: ' + test_folder_name)
    print('Folder URL: ' + folder_url)
    
    # Clean up - delete test folder
    try:
        drive_service.files().delete(fileId=folder_id).execute()
        print('CLEANUP: Test folder deleted')
    except:
        print('WARNING: Could not delete test folder. Delete manually: ' + folder_url)
    
except HttpError as e:
    if e.resp.status == 403:
        print('ERROR: Permission denied')
        print('Make sure the parent folder is shared with: ' + service_account_email)
        print('Folder URL: https://drive.google.com/drive/folders/' + parent_folder_id)
    else:
        print('ERROR: ' + str(e))
    exit(1)
except Exception as e:
    print('ERROR: ' + str(e))
    exit(1)
"@

$testScriptPath = Join-Path $scriptRoot "test_drive_temp.py"
$testScript | Out-File -FilePath $testScriptPath -Encoding UTF8

try {
    Write-Host "Creating test folder: $TestFolderName" -ForegroundColor White
    Write-Log "Executing test script: $testScriptPath" "INFO"
    $result = Invoke-WithRetry -ScriptBlock {
        python $testScriptPath 2>&1
    } -MaxRetries 2 -DelaySeconds 1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Progress -Activity "Verification" -Status "Complete" -PercentComplete 100
        Write-Host "`n[SUCCESS] Google Drive is properly configured." -ForegroundColor Green
        Write-Host $result -ForegroundColor White
        Write-Host "`n[OK] Service account has access to create folders" -ForegroundColor Green
        Write-Host "[OK] Parent folder permissions are correct" -ForegroundColor Green
        Write-Log "Verification successful" "INFO"
    } else {
        Write-Host "`n[FAILED] Google Drive setup incomplete" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        
        if ($result -match "Permission denied") {
            Write-Host "`n[!] Fix:" -ForegroundColor Yellow
            Write-Host "  1. Open: https://drive.google.com/drive/folders/$parentFolderId" -ForegroundColor White
            Write-Host "  2. Click 'Share'" -ForegroundColor White
            Write-Host "  3. Add: $serviceAccountEmail" -ForegroundColor White
            Write-Host "  4. Give 'Editor' permissions" -ForegroundColor White
            Write-Host "  5. Click 'Send'" -ForegroundColor White
        }
        exit 1
    }
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "[X] Error running test: $errorMsg" -ForegroundColor Red
    exit 1
} finally {
    if (Test-Path $testScriptPath) {
        Remove-Item $testScriptPath -Force
    }
}

Write-Progress -Activity "Verification" -Completed
$separator = Get-Separator
Write-Host "`n$separator" -ForegroundColor Cyan
Write-Host "  Verification Complete!" -ForegroundColor Cyan
Write-Host "$separator`n" -ForegroundColor Cyan
Write-Log "Verification completed. Log saved to: $LogFile" "INFO"
Write-Host "Log file: $LogFile" -ForegroundColor Gray

