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

# Detect Python (check for venv first)
Write-Host "Step 1: Checking Python..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$pythonCmd = "python"
$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$parentVenvPython = Join-Path (Split-Path $PSScriptRoot) ".venv\Scripts\python.exe"

# Check for venv in current, parent, or root directory
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
    Write-Host "✓ Using virtual environment: .venv" -ForegroundColor Green
} elseif (Test-Path $parentVenvPython) {
    $pythonCmd = $parentVenvPython
    Write-Host "✓ Using virtual environment: ..\.venv" -ForegroundColor Green
} elseif (Test-Path $rootVenvPython) {
    $pythonCmd = $rootVenvPython
    Write-Host "✓ Using virtual environment: ..\..\.venv" -ForegroundColor Green
} else {
    Write-Host "⚠️  No virtual environment found, using system Python" -ForegroundColor Yellow
    Write-Host "   Looking for: $venvPython" -ForegroundColor Gray
    Write-Host "   Or: $parentVenvPython" -ForegroundColor Gray
    Write-Host "   Or: $rootVenvPython" -ForegroundColor Gray
}

try {
    $pythonVersion = & $pythonCmd --version 2>&1
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found" -ForegroundColor Red
    exit 1
}

# Check required packages
Write-Host "`nStep 2: Checking Python packages..." -ForegroundColor Yellow
Write-Host "-" * 40 -ForegroundColor Gray

$packages = @(
    @{Name="google.auth"; Import="google.auth"},
    @{Name="google-api-python-client"; Import="googleapiclient.discovery"}
)

$allInstalled = $true
$missingPackages = @()

foreach ($pkg in $packages) {
    try {
        $testScript = "import $($pkg.Import)"
        & $pythonCmd -c $testScript 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $($pkg.Name) installed" -ForegroundColor Green
        } else {
            throw "Import failed"
        }
    } catch {
        Write-Host "✗ $($pkg.Name) NOT installed" -ForegroundColor Red
        $allInstalled = $false
        $missingPackages += $pkg.Name
    }
}

if (-not $allInstalled) {
    Write-Host "`n⚠️  Installing missing packages..." -ForegroundColor Yellow
    $pipCmd = $pythonCmd -replace "python.exe$", "pip.exe"
    if (-not (Test-Path $pipCmd)) {
        $pipCmd = "pip"
    }
    
    foreach ($pkg in $missingPackages) {
        Write-Host "   Installing $pkg..." -ForegroundColor White
        & $pipCmd install $pkg 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✓ $pkg installed" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Failed to install $pkg" -ForegroundColor Red
            Write-Host "`n   Try manually: $pipCmd install $pkg" -ForegroundColor Yellow
            exit 1
        }
    }
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

$testScriptPath = Join-Path $PSScriptRoot "test_drive_creation.py"

try {
    Write-Host "Creating test folder: $TestFolderName" -ForegroundColor White
    $result = & $pythonCmd $testScriptPath $serviceAccountPath $parentFolderId $TestFolderName 2>&1
    
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


