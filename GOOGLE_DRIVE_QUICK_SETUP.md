# Google Drive Quick Setup Guide

## Current Status
✅ Google Drive API is enabled  
❌ Service account credentials file is missing  
✅ Parent folder ID is configured  

## Quick Fix Options

### Option 1: Use Firebase Service Account (Recommended)
If you already have Firebase set up, you can use the same service account:

1. **Get your Firebase service account JSON:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file (e.g., `firebase-service-account.json`)

2. **Place it in your backend folder:**
   ```bash
   # Copy the file to:
   C:\Users\admin\M1A\autoposter-backend\firebase-admin.json
   ```

3. **Or update your .env file:**
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\firebase-service-account.json
   ```

### Option 2: Create a New Service Account for Google Drive

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create one)

2. **Create Service Account:**
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name it (e.g., "m1a-drive-service")
   - Click "Create and Continue"
   - Skip role assignment, click "Done"

3. **Create and Download Key:**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Choose "JSON"
   - Download the file

4. **Set Environment Variable:**
   - Place the JSON file in your backend folder
   - Update `.env`:
     ```bash
     GOOGLE_SERVICE_ACCOUNT_FILE=C:\Users\admin\M1A\autoposter-backend\service-account.json
     ```

## Share Folder with Service Account

**IMPORTANT:** After getting the service account, you MUST share the parent folder with it:

1. **Get the service account email:**
   - Open the JSON file you downloaded
   - Find the `"client_email"` field
   - Copy that email (looks like: `something@project-id.iam.gserviceaccount.com`)

2. **Share the folder:**
   - Open: https://drive.google.com/drive/folders/1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc
   - Click "Share" button
   - Paste the service account email
   - Give it "Editor" permissions
   - **Uncheck "Notify people"** (service accounts don't need notifications)
   - Click "Send"

## Verify Setup

Run the check script:
```bash
cd autoposter-backend
python check_google_drive_setup.py
```

You should see:
- ✅ Service account file found
- ✅ Service account email displayed
- ✅ Instructions to share the folder

## Test Folder Creation

After sharing the folder, test by creating a new account in the app:
1. Sign up with a new email
2. Select a persona
3. Check the parent folder - a new folder with the username should appear

## Troubleshooting

**"File NOT FOUND" error:**
- Check the path in your `.env` file
- Make sure the JSON file exists at that location
- Use absolute paths (full path starting with `C:\`)

**"Permission denied" when creating folder:**
- Make sure you shared the parent folder with the service account email
- Check that you gave "Editor" permissions (not just "Viewer")
- Wait a few minutes after sharing (Google Drive can take a moment to propagate)

**"API not enabled" error:**
- You already enabled it ✅
- Make sure you're using the correct Google Cloud project

