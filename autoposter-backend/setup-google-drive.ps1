# Google Drive Service Account Setup Script
# This script helps you set up Google Drive integration for M1A

param(
    [string]$ServiceAccountJsonPath = "",
    [string]$ParentFolderId = "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Google Drive Setup for M1A" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if .env file exists
$envPath = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "⚠️  .env file not found. Creating one..." -ForegroundColor Yellow
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
Write-Host "-" * 40 -ForegroundColor Gray

$currentCreds = Get-EnvVar "GOOGLE_APPLICATION_CREDENTIALS"
$currentServiceAccount = Get-EnvVar "GOOGLE_SERVICE_ACCOUNT_FILE"
$currentParentFolder = Get-EnvVar "GOOGLE_DRIVE_PARENT_FOLDER_ID"

if ($currentCreds) {
    Write-Host "✓ GOOGLE_APPLICATION_CREDENTIALS: $currentCreds" -ForegroundColor Green
    if (Test-Path $currentCreds) {
        Write-Host "  ✓ File exists" -ForegroundColor Green
        $serviceAccountPath = $currentCreds
    } else {
        Write-Host "  ✗ File NOT FOUND" -ForegroundColor Red
        $serviceAccountPath = $null
    }
} elseif ($currentServiceAccount) {
    Write-Host "✓ GOOGLE_SERVICE_ACCOUNT_FILE: $currentServiceAccount" -ForegroundColor Green
    if (Test-Path $currentServiceAccount) {
        Write-Host "  ✓ File exists" -ForegroundColor Green
        $serviceAccountPath = $currentServiceAccount
    } else {
        Write-Host "  ✗ File NOT FOUND" -ForegroundColor Red
        $serviceAccountPath = $null
    }
} else {
    Write-Host "✗ No service account configured" -ForegroundColor Red
    $serviceAccountPath = $null
}

if ($currentParentFolder) {
    Write-Host "✓ GOOGLE_DRIVE_PARENT_FOLDER_ID: $currentParentFolder" -ForegroundColor Green
} else {
    Write-Host "✗ GOOGLE_DRIVE_PARENT_FOLDER_ID not set" -ForegroundColor Red
    Set-EnvVar "GOOGLE_DRIVE_PARENT_FOLDER_ID" $ParentFolderId
    Write-Host "  → Set to: $ParentFolderId" -ForegroundColor Yellow
}

Write-Host "`nStep 2: Service Account File Setup" -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

# If path provided as parameter, use it
if ($ServiceAccountJsonPath -and (Test-Path $ServiceAccountJsonPath)) {
    $serviceAccountPath = $ServiceAccountJsonPath
    Write-Host "✓ Using provided path: $serviceAccountPath" -ForegroundColor Green
} elseif (-not $serviceAccountPath) {
    Write-Host "`nNo service account file found. Options:" -ForegroundColor Yellow
    Write-Host "  1. Provide path to existing JSON file" -ForegroundColor White
    Write-Host "  2. Download from Firebase Console" -ForegroundColor White
    Write-Host "  3. Create new service account in Google Cloud Console" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Enter path to service account JSON file (or press Enter to skip)"
    if ($choice -and (Test-Path $choice)) {
        $serviceAccountPath = $choice
    } else {
        Write-Host "`n📋 Manual Setup Required:" -ForegroundColor Cyan
        Write-Host "  1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts" -ForegroundColor White
        Write-Host "  2. Create or select a service account" -ForegroundColor White
        Write-Host "  3. Create a JSON key and download it" -ForegroundColor White
        Write-Host "  4. Run this script again with: -ServiceAccountJsonPath 'path\to\file.json'" -ForegroundColor White
        Write-Host ""
        exit
    }
}

# Validate JSON file
if ($serviceAccountPath -and (Test-Path $serviceAccountPath)) {
    try {
        $jsonContent = Get-Content $serviceAccountPath -Raw | ConvertFrom-Json
        $serviceAccountEmail = $jsonContent.client_email
        $projectId = $jsonContent.project_id
        
        if ($serviceAccountEmail) {
            Write-Host "`n✓ Service Account Details:" -ForegroundColor Green
            Write-Host "  Email: $serviceAccountEmail" -ForegroundColor White
            Write-Host "  Project: $projectId" -ForegroundColor White
            
            # Set environment variable
            $defaultPath = Join-Path $PSScriptRoot "firebase-admin.json"
            if ($serviceAccountPath -ne $defaultPath) {
                # Copy to default location if different
                Copy-Item $serviceAccountPath $defaultPath -Force
                Write-Host "`n✓ Copied to: $defaultPath" -ForegroundColor Green
            }
            
            Set-EnvVar "GOOGLE_APPLICATION_CREDENTIALS" $defaultPath
            Write-Host "✓ Updated .env file" -ForegroundColor Green
            
            Write-Host "`nStep 3: Share Folder with Service Account" -ForegroundColor Yellow
            Write-Host "-" * 40 -ForegroundColor Gray
            Write-Host "`n📋 IMPORTANT: Share the parent folder with this service account:" -ForegroundColor Cyan
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
                Write-Host "`n✓ Setup complete! Run verify-google-drive.ps1 to test." -ForegroundColor Green
            } else {
                Write-Host "`n⚠️  Remember to share the folder before testing!" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ Invalid JSON file: missing 'client_email'" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Error reading JSON file: $_" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Service account file not found" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan


