# Google Drive Setup - PowerShell Guide

## Quick Start

### 1. Setup (First Time)
```powershell
# Interactive setup - will guide you through the process
.\setup-google-drive.ps1

# OR provide the JSON file path directly
.\setup-google-drive.ps1 -ServiceAccountJsonPath "C:\path\to\service-account.json"
```

### 2. Verify Setup
```powershell
# This will test everything and create/delete a test folder
.\verify-google-drive.ps1
```

## What Each Script Does

### `setup-google-drive.ps1`
- ✅ Checks current configuration
- ✅ Validates service account JSON file
- ✅ Extracts service account email
- ✅ Updates `.env` file automatically
- ✅ Provides instructions for sharing the folder
- ✅ Guides you through the complete setup

### `verify-google-drive.ps1`
- ✅ Checks Python installation
- ✅ Verifies required packages are installed
- ✅ Validates service account file exists
- ✅ Reads service account email
- ✅ **Tests folder creation** (creates a test folder)
- ✅ **Tests folder deletion** (cleans up test folder)
- ✅ Confirms permissions are correct

## Example Output

### Successful Setup:
```
========================================
  Google Drive Setup for M1A
========================================

Step 1: Checking current configuration...
✓ GOOGLE_APPLICATION_CREDENTIALS: C:\...\firebase-admin.json
  ✓ File exists
✓ GOOGLE_DRIVE_PARENT_FOLDER_ID: 1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc

Step 2: Service Account File Setup
✓ Service Account Details:
  Email: m1a-service@project-id.iam.gserviceaccount.com
  Project: your-project-id
✓ Updated .env file

Step 3: Share Folder with Service Account
📋 IMPORTANT: Share the parent folder with this service account:
   Email: m1a-service@project-id.iam.gserviceaccount.com
```

### Successful Verification:
```
========================================
  Google Drive Verification
========================================

Step 1: Checking Python...
✓ Python: Python 3.11.0

Step 2: Checking Python packages...
✓ google.auth installed
✓ googleapiclient installed

Step 3: Checking configuration...
✓ Service Account: C:\...\firebase-admin.json
  ✓ File exists
✓ Parent Folder ID: 1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc

Step 4: Reading service account...
✓ Service Account Email: m1a-service@project-id.iam.gserviceaccount.com
✓ Project ID: your-project-id

Step 5: Testing folder creation...
Creating test folder: test-m1a-folder-20250101-120000

✅ SUCCESS! Google Drive is properly configured.
Folder ID: 1a2b3c4d5e6f7g8h9i0j
Folder Name: test-m1a-folder-20250101-120000
CLEANUP: Test folder deleted

✓ Service account has access to create folders
✓ Parent folder permissions are correct
```

## Troubleshooting

### "File NOT FOUND" Error
```powershell
# Check if the file exists
Test-Path "C:\path\to\service-account.json"

# If using Firebase credentials, check:
$env:GOOGLE_APPLICATION_CREDENTIALS
```

### "Permission denied" Error
The verify script will tell you exactly what to do:
1. Open the folder URL
2. Click "Share"
3. Add the service account email
4. Give "Editor" permissions
5. Click "Send"

### "Python not found"
Make sure Python is in your PATH:
```powershell
python --version
# If not found, add Python to PATH or use full path
```

### "Package not installed"
```powershell
pip install google-auth google-api-python-client
```

## Manual Steps (if scripts don't work)

1. **Get Service Account JSON:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Create or select service account
   - Create JSON key and download

2. **Place file in backend folder:**
   ```powershell
   Copy-Item "C:\Downloads\service-account.json" "C:\Users\admin\M1A\autoposter-backend\firebase-admin.json"
   ```

3. **Update .env file:**
   ```powershell
   Add-Content -Path ".env" -Value "GOOGLE_APPLICATION_CREDENTIALS=C:\Users\admin\M1A\autoposter-backend\firebase-admin.json"
   Add-Content -Path ".env" -Value "GOOGLE_DRIVE_PARENT_FOLDER_ID=1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc"
   ```

4. **Get service account email:**
   ```powershell
   $json = Get-Content "firebase-admin.json" | ConvertFrom-Json
   $json.client_email
   ```

5. **Share folder:**
   - Open: https://drive.google.com/drive/folders/1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc
   - Share with the email from step 4
   - Give "Editor" permissions

6. **Verify:**
   ```powershell
   .\verify-google-drive.ps1
   ```

## Next Steps

After successful verification:
1. ✅ Google Drive is ready
2. ✅ New users will get folders created automatically
3. ✅ Test by creating a new account in the app
4. ✅ Check the parent folder for new user folders


