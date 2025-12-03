import os
import json
import sys
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

if len(sys.argv) < 4:
    print("ERROR: Missing arguments")
    print("Usage: python test_drive_creation.py <creds_path> <parent_folder_id> <test_folder_name>")
    sys.exit(1)

creds_path = sys.argv[1]
parent_folder_id = sys.argv[2]
test_folder_name = sys.argv[3]

try:
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
        print(f'Make sure the parent folder is shared with the service account')
        print(f'Folder URL: https://drive.google.com/drive/folders/{parent_folder_id}')
    else:
        print(f'ERROR: {e}')
    sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)

