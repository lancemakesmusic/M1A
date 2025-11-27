# Google Drive Service Account Setup Script
# This script helps you set up Google Drive integration for M1A
# Run from the project root directory

param(
    [string]$ServiceAccountJsonPath = "",
    [string]$ParentFolderId = "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc",
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
    $LogFile = Join-Path $logDir "setup-google-drive_$timestamp.log"
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
        
        # Check if it's a service account email format
        if ($email -notmatch '@.*\.iam\.gserviceaccount\.com$') {
            Write-Log "Warning: Email doesn't match service account format: $email" "WARN"
            return $false
        }
        
        # Check for required fields
        $required = @('type', 'project_id', 'private_key_id', 'private_key', 'client_email')
        foreach ($field in $required) {
            if (-not $json.$field) {
                Write-Log "Missing required field: $field" "ERROR"
                return $false
            }
        }
        
        # Check if private key looks valid
        if ($json.private_key -notmatch 'BEGIN PRIVATE KEY') {
            Write-Log "Private key format appears invalid" "WARN"
            return $false
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
        
        # Service account keys don't expire by default, but check for any expiration info
        if ($json.expires_at) {
            $expires = [DateTimeOffset]::FromUnixTimeSeconds($json.expires_at).DateTime
            $daysUntilExpiry = ($expires - (Get-Date)).Days
            if ($daysUntilExpiry -lt 30) {
                Write-Log "WARNING: Credentials expire in $daysUntilExpiry days" "WARN"
                return $false
            }
        }
        
        # Check key age (if private_key_id suggests it's old)
        # Note: Google doesn't provide creation date in JSON, but we can warn about key rotation
        Write-Log "Credential expiration check passed (service account keys don't expire by default)" "INFO"
        return $true
    } catch {
        Write-Log "Error checking credential expiration: $_" "WARN"
        return $true  # Don't fail on expiration check errors
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

function Test-ValidJsonPath {
    param([string]$Path)
    if (-not $Path) { return $false }
    if (-not (Test-Path $Path)) { return $false }
    if (-not $Path.EndsWith(".json")) { return $false }
    try {
        $content = Get-Content $Path -Raw -ErrorAction Stop
        $json = $content | ConvertFrom-Json -ErrorAction Stop
        if (-not $json.client_email) { return $false }
        if (-not $json.private_key) { return $false }
        return $true
    } catch {
        return $false
    }
}

function Copy-FileWithProgress {
    param([string]$Source, [string]$Destination)
    Write-Progress -Activity "Copying service account file" -Status "Copying..." -PercentComplete 0
    try {
        Copy-Item -Path $Source -Destination $Destination -Force
        Write-Progress -Activity "Copying service account file" -Status "Complete" -PercentComplete 100
        Write-Log "File copied: $Source -> $Destination"
        return $true
    } catch {
        Write-Progress -Activity "Copying service account file" -Status "Failed" -PercentComplete 0
        Write-Log "Failed to copy file: $_" "ERROR"
        return $false
    } finally {
        Start-Sleep -Milliseconds 500
        Write-Progress -Activity "Copying service account file" -Completed
    }
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
Write-Host "  Google Drive Setup for M1A" -ForegroundColor Cyan
Write-Host "$separator`n" -ForegroundColor Cyan

# Audit logging - who is running this script
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$computerName = $env:COMPUTERNAME
Write-AuditLog "Script started" "setup-google-drive.ps1"
Write-Log "Starting Google Drive setup" "INFO"
Write-Log "User: $currentUser | Computer: $computerName" "INFO"
Write-Log "Log file: $LogFile" "INFO"

# Security warning
Write-Host "[!] SECURITY NOTICE:" -ForegroundColor Yellow
Write-Host "   - Service account credentials will be stored in plain text" -ForegroundColor Yellow
Write-Host "   - Ensure .env file and firebase-admin.json are in .gitignore" -ForegroundColor Yellow
Write-Host "   - Consider encrypting credentials for production use" -ForegroundColor Yellow
Write-Host ""

# Set paths relative to script location (project root)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptRoot) {
    $scriptRoot = $PSScriptRoot
}
$backendDir = Join-Path $scriptRoot "autoposter-backend"
$envPath = Join-Path $backendDir ".env"

# Check if .env file exists
if (-not (Test-Path $envPath)) {
    Write-Host "[!] .env file not found. Creating one..." -ForegroundColor Yellow
    if (-not (Test-Path $backendDir)) {
        New-Item -Path $backendDir -ItemType Directory -Force | Out-Null
    }
    New-Item -Path $envPath -ItemType File -Force | Out-Null
}

# Function to read .env file
function Get-EnvVar {
    param([string]$Key)
    if (Test-Path $envPath) {
        $content = Get-Content $envPath
        foreach ($line in $content) {
            if ($line -match "^$Key=(.+)$") {
                return $matches[1].Trim()
            }
        }
    }
    return $null
}

# Function to set .env variable
function Set-EnvVar {
    param([string]$Key, [string]$Value)
    if (Test-Path $envPath) {
        $content = Get-Content $envPath
        $found = $false
        $newContent = @()
        foreach ($line in $content) {
            if ($line -match "^$Key=") {
                $newContent += "$Key=$Value"
                $found = $true
            } else {
                $newContent += $line
            }
        }
        if (-not $found) {
            $newContent += "$Key=$Value"
        }
        $newContent | Set-Content $envPath
    } else {
        "$Key=$Value" | Add-Content $envPath
    }
}

Write-Host "Step 1: Checking current configuration..." -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Log "Checking current configuration" "INFO"

$currentCreds = Get-EnvVar "GOOGLE_APPLICATION_CREDENTIALS"
$currentServiceAccount = Get-EnvVar "GOOGLE_SERVICE_ACCOUNT_FILE"
$currentParentFolder = Get-EnvVar "GOOGLE_DRIVE_PARENT_FOLDER_ID"

if ($currentCreds) {
    Write-Host "[OK] GOOGLE_APPLICATION_CREDENTIALS: $currentCreds" -ForegroundColor Green
    if (Test-Path $currentCreds) {
        Write-Host "  [OK] File exists" -ForegroundColor Green
        $serviceAccountPath = $currentCreds
    } else {
        Write-Host "  [X] File NOT FOUND" -ForegroundColor Red
        $serviceAccountPath = $null
    }
} elseif ($currentServiceAccount) {
    Write-Host "[OK] GOOGLE_SERVICE_ACCOUNT_FILE: $currentServiceAccount" -ForegroundColor Green
    if (Test-Path $currentServiceAccount) {
        Write-Host "  [OK] File exists" -ForegroundColor Green
        $serviceAccountPath = $currentServiceAccount
    } else {
        Write-Host "  [X] File NOT FOUND" -ForegroundColor Red
        $serviceAccountPath = $null
    }
} else {
    Write-Host "[X] No service account configured" -ForegroundColor Red
    $serviceAccountPath = $null
}

if ($currentParentFolder) {
    Write-Host "[OK] GOOGLE_DRIVE_PARENT_FOLDER_ID: $currentParentFolder" -ForegroundColor Green
} else {
    Write-Host "[X] GOOGLE_DRIVE_PARENT_FOLDER_ID not set" -ForegroundColor Red
    Set-EnvVar "GOOGLE_DRIVE_PARENT_FOLDER_ID" $ParentFolderId
    Write-Host "  -> Set to: $ParentFolderId" -ForegroundColor Yellow
}

Write-Host "`nStep 2: Service Account File Setup" -ForegroundColor Yellow
Write-Host (Get-Separator 50) -ForegroundColor Gray
Write-Log "Starting service account file setup" "INFO"

# If path provided as parameter, validate it
if ($ServiceAccountJsonPath) {
    Write-Progress -Activity "Validating service account file" -Status "Checking path..."
    if (Test-ValidJsonPath $ServiceAccountJsonPath) {
        $serviceAccountPath = $ServiceAccountJsonPath
        Write-Host "[OK] Using provided path: $serviceAccountPath" -ForegroundColor Green
        Write-Log "Using provided service account path: $serviceAccountPath" "INFO"
    } else {
        Write-Host "[X] Invalid JSON file or path: $ServiceAccountJsonPath" -ForegroundColor Red
        Write-Host "   File must be a valid service account JSON with client_email and private_key" -ForegroundColor Yellow
        Write-Log "Invalid service account file provided: $ServiceAccountJsonPath" "ERROR"
        $serviceAccountPath = $null
    }
    Write-Progress -Activity "Validating service account file" -Completed
} elseif (-not $serviceAccountPath) {
    Write-Host "`nNo service account file found. Options:" -ForegroundColor Yellow
    Write-Host "  1. Provide path to existing JSON file" -ForegroundColor White
    Write-Host "  2. Download from Firebase Console" -ForegroundColor White
    Write-Host "  3. Create new service account in Google Cloud Console" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter path to service account JSON file (or press Enter to skip)"
    # Clean up the input - remove quotes and trim whitespace
    if ($choice) {
        $choice = $choice.Trim().Trim('"').Trim("'")
        # Remove any command-line arguments that might have been pasted
        if ($choice -match '^-ServiceAccountJsonPath\s+["'']?(.+?)["'']?\s*$') {
            $choice = $matches[1]
        }
    }
    if ($choice) {
        Write-Progress -Activity "Validating input path" -Status "Checking..."
        if (Test-ValidJsonPath $choice) {
            $serviceAccountPath = $choice
            Write-Log "User provided valid path: $choice" "INFO"
        } else {
            Write-Host "[X] Invalid JSON file. Please provide a valid service account JSON file." -ForegroundColor Red
            Write-Log "Invalid path provided by user: $choice" "ERROR"
            $serviceAccountPath = $null
        }
        Write-Progress -Activity "Validating input path" -Completed
    }
    if (-not $serviceAccountPath) {
        Write-Host "`n[!] Manual Setup Required:" -ForegroundColor Cyan
        Write-Host "  1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts" -ForegroundColor White
        Write-Host "  2. Create or select a service account" -ForegroundColor White
        Write-Host "  3. Create a JSON key and download it" -ForegroundColor White
        Write-Host "  4. Run this script again with: -ServiceAccountJsonPath 'path\to\file.json'" -ForegroundColor White
        Write-Host ""
        exit
    }
}

# Validate and process JSON file
if ($serviceAccountPath -and (Test-ValidJsonPath $serviceAccountPath)) {
    Write-Progress -Activity "Processing service account" -Status "Reading JSON..."
    try {
        $jsonContent = Invoke-WithRetry -ScriptBlock {
            Get-Content $serviceAccountPath -Raw | ConvertFrom-Json
        } -MaxRetries 3
        $serviceAccountEmail = $jsonContent.client_email
        $projectId = $jsonContent.project_id
        Write-Progress -Activity "Processing service account" -Completed
        
        if ($serviceAccountEmail) {
            # Validate service account permissions
            Write-Progress -Activity "Validating service account" -Status "Checking permissions..."
            if (-not (Test-ServiceAccountPermissions -JsonPath $serviceAccountPath)) {
                Write-Host "[X] Service account validation failed" -ForegroundColor Red
                Write-Host "   Please ensure the JSON file is a valid service account key" -ForegroundColor Yellow
                Write-Log "Service account validation failed" "ERROR"
                exit 1
            }
            
            # Check credential expiration
            Write-Progress -Activity "Checking credentials" -Status "Validating expiration..."
            Test-CredentialExpiration -JsonPath $serviceAccountPath | Out-Null
            
            Write-Progress -Activity "Validating service account" -Completed
            
            Write-Host "`n[OK] Service Account Details:" -ForegroundColor Green
            Write-Host "  Email: $serviceAccountEmail" -ForegroundColor White
            Write-Host "  Project: $projectId" -ForegroundColor White
            Write-Log "Service account validated: $serviceAccountEmail" "INFO"
            Write-AuditLog "Service account configured" "Email: $serviceAccountEmail"
            
            # Set environment variable - use backend directory for default location
            $defaultPath = Join-Path $backendDir "firebase-admin.json"
            if ($serviceAccountPath -ne $defaultPath) {
                # Copy to default location if different (with progress)
                if (Copy-FileWithProgress -Source $serviceAccountPath -Destination $defaultPath) {
                    Write-Host "`n[OK] Copied to: $defaultPath" -ForegroundColor Green
                } else {
                    Write-Host "`n[X] Failed to copy file" -ForegroundColor Red
                    exit 1
                }
            }
            
            Write-Progress -Activity "Updating configuration" -Status "Writing .env file..."
            Set-EnvVar "GOOGLE_APPLICATION_CREDENTIALS" $defaultPath
            Write-Host "[OK] Updated .env file" -ForegroundColor Green
            Write-Log "Updated .env file with GOOGLE_APPLICATION_CREDENTIALS" "INFO"
            Write-AuditLog "Configuration updated" "GOOGLE_APPLICATION_CREDENTIALS set to $defaultPath"
            
            # Security warning about .env file
            Write-Host "`n[!] Security Reminder:" -ForegroundColor Yellow
            Write-Host "   - The .env file contains sensitive credentials" -ForegroundColor Yellow
            Write-Host "   - Ensure it's in .gitignore and not committed to version control" -ForegroundColor Yellow
            Write-Host "   - Restrict file permissions: icacls `"$envPath`" /inheritance:r /grant:r `"$currentUser`:R`"" -ForegroundColor Gray
            Write-Progress -Activity "Updating configuration" -Completed
            
            Write-Host "`nStep 3: Share Folder with Service Account" -ForegroundColor Yellow
            Write-Host (Get-Separator 50) -ForegroundColor Gray
            Write-Log "Prompting user to share folder with service account" "INFO"
            Write-Host "`n[!] IMPORTANT: Share the parent folder with this service account:" -ForegroundColor Cyan
            Write-Host "   Email: $serviceAccountEmail" -ForegroundColor White
            Write-Host "`n   Folder URL:" -ForegroundColor Yellow
            Write-Host "   https://drive.google.com/drive/folders/$ParentFolderId" -ForegroundColor Cyan
            Write-Host "`n   Steps:" -ForegroundColor Yellow
            Write-Host "   1. Open the folder URL above" -ForegroundColor White
            Write-Host "   2. Click 'Share' button" -ForegroundColor White
            Write-Host "   3. Paste: $serviceAccountEmail" -ForegroundColor White
            Write-Host "   4. Give 'Editor' permissions" -ForegroundColor White
            Write-Host "   5. Uncheck 'Notify people'" -ForegroundColor White
            Write-Host "   6. Click 'Send'" -ForegroundColor White
            Write-Host ""
            
            $shared = Read-Host "Have you shared the folder? (y/n)"
            if ($shared -eq "y" -or $shared -eq "Y") {
                Write-Host "`n[OK] Setup complete! Run verify-google-drive.ps1 to test." -ForegroundColor Green
            } else {
                Write-Host "`n[!] Remember to share the folder before testing!" -ForegroundColor Yellow
            }
        } else {
            Write-Host "[X] Invalid JSON file: missing 'client_email'" -ForegroundColor Red
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[X] Error reading JSON file: $errorMsg" -ForegroundColor Red
    }
} else {
    Write-Host "[X] Service account file not found" -ForegroundColor Red
}

$separator = Get-Separator
Write-Host "`n$separator" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "$separator`n" -ForegroundColor Cyan
Write-Log "Setup completed. Log saved to: $LogFile" "INFO"
Write-Host "Log file: $LogFile" -ForegroundColor Gray

