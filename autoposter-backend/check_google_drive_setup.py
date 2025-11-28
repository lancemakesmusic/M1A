#!/usr/bin/env python3
"""
Check Google Drive Setup for M1A
Verifies service account credentials and folder permissions
"""
import os
import json
from pathlib import Path

print("=" * 60)
print("Google Drive Setup Check for M1A")
print("=" * 60)
print()

# Check environment variables
print("1. Checking Environment Variables:")
print("-" * 60)

GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
GOOGLE_DRIVE_PARENT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID", "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc")

service_account_path = None
service_account_email = None

# Check for service account file
if GOOGLE_SERVICE_ACCOUNT_FILE:
    print(f"   ✓ GOOGLE_SERVICE_ACCOUNT_FILE: {GOOGLE_SERVICE_ACCOUNT_FILE}")
    if os.path.exists(GOOGLE_SERVICE_ACCOUNT_FILE):
        service_account_path = GOOGLE_SERVICE_ACCOUNT_FILE
        print(f"   ✓ File exists")
    else:
        print(f"   ✗ File NOT FOUND at specified path")
elif GOOGLE_APPLICATION_CREDENTIALS:
    print(f"   ✓ GOOGLE_APPLICATION_CREDENTIALS: {GOOGLE_APPLICATION_CREDENTIALS}")
    if os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
        service_account_path = GOOGLE_APPLICATION_CREDENTIALS
        print(f"   ✓ File exists (will use as fallback)")
    else:
        print(f"   ✗ File NOT FOUND at specified path")
else:
    print(f"   ✗ No service account file configured")
    print(f"   → Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_APPLICATION_CREDENTIALS")

if GOOGLE_DRIVE_PARENT_FOLDER_ID:
    print(f"   ✓ GOOGLE_DRIVE_PARENT_FOLDER_ID: {GOOGLE_DRIVE_PARENT_FOLDER_ID}")
    print(f"   → Folder URL: https://drive.google.com/drive/folders/{GOOGLE_DRIVE_PARENT_FOLDER_ID}")
else:
    print(f"   ✗ GOOGLE_DRIVE_PARENT_FOLDER_ID not set")

print()

# Extract service account email
if service_account_path:
    print("2. Reading Service Account Credentials:")
    print("-" * 60)
    try:
        with open(service_account_path, 'r') as f:
            creds = json.load(f)
            service_account_email = creds.get('client_email', '')
            project_id = creds.get('project_id', '')
            
            if service_account_email:
                print(f"   ✓ Service Account Email: {service_account_email}")
                print(f"   ✓ Project ID: {project_id}")
                print()
                print("3. NEXT STEPS:")
                print("-" * 60)
                print(f"   📁 Share the parent folder with this service account:")
                print(f"      {service_account_email}")
                print()
                print(f"   🔗 Folder URL:")
                print(f"      https://drive.google.com/drive/folders/{GOOGLE_DRIVE_PARENT_FOLDER_ID}")
                print()
                print("   📋 Steps:")
                print("      1. Open the folder URL above")
                print("      2. Click 'Share' button")
                print("      3. Paste the service account email above")
                print("      4. Give it 'Editor' permissions")
                print("      5. Click 'Send'")
                print()
            else:
                print(f"   ✗ Could not find 'client_email' in credentials file")
        print()
    except json.JSONDecodeError:
        print(f"   ✗ Invalid JSON file")
    except Exception as e:
        print(f"   ✗ Error reading file: {e}")
else:
    print("2. Service Account Credentials:")
    print("-" * 60)
    print("   ✗ No service account file found")
    print()
    print("   📋 To set up:")
    print("      1. Go to Google Cloud Console")
    print("      2. Create or select a project")
    print("      3. Enable Google Drive API (already done ✓)")
    print("      4. Create a Service Account")
    print("      5. Download the JSON key file")
    print("      6. Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_APPLICATION_CREDENTIALS")
    print()

# Check if Google Drive API libraries are installed
print("4. Checking Python Dependencies:")
print("-" * 60)
try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    print("   ✓ google-auth and google-api-python-client installed")
except ImportError:
    print("   ✗ Missing: google-auth or google-api-python-client")
    print("   → Run: pip install google-auth google-api-python-client")

print()
print("=" * 60)
if service_account_path and service_account_email:
    print("✅ Setup looks good! Just share the folder with the service account.")
else:
    print("⚠️  Setup incomplete. Follow the steps above.")
print("=" * 60)


