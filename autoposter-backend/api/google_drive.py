"""
Google Drive API endpoints for client content library
Provides pass-through access to Google Drive files
"""
import os
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from google.oauth2.credentials import Credentials
from google.oauth2 import service_account
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request

# Initialize Firebase Admin if not already initialized
try:
    import firebase_admin
    from firebase_admin import firestore, auth
    
    # Check if Firebase Admin is already initialized
    try:
        firebase_admin.get_app()
    except ValueError:
        # Not initialized, try to initialize
        try:
            # Try to use service account file from environment
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                cred = firebase_admin.credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Try default initialization (uses environment or metadata service)
                firebase_admin.initialize_app()
            print("[OK] Firebase Admin initialized for Google Drive")
        except Exception as init_error:
            print(f"[WARN] Firebase Admin not initialized: {init_error}")
            print("[WARN] Google Drive routes may not work without Firebase Admin")
except ImportError:
    print("[WARN] firebase-admin not installed. Google Drive routes will not work.")
    firebase_admin = None
    firestore = None
    auth = None

router = APIRouter(prefix="/api/google-drive", tags=["google-drive"])

# Security dependency for Firebase Auth token verification
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify Firebase Auth ID token"""
    try:
        if not auth:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not initialized"
            )
        token = credentials.credentials
        decoded_token = auth.verify_id_token(token)
        return {
            "userId": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "email_verified": decoded_token.get('email_verified', False)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Google Drive API configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8001/auth/google-drive/callback")

def get_google_credentials(user_id: str) -> Optional[Credentials]:
    """Get Google OAuth credentials for a user from Firestore"""
    try:
        if not firestore:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not initialized"
            )
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return None
        
        user_data = user_doc.to_dict()
        token_data = user_data.get('googleDriveTokens', {})
        
        if not token_data or not token_data.get('token'):
            return None
        
        credentials = Credentials(
            token=token_data.get('token'),
            refresh_token=token_data.get('refresh_token'),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
        )
        
        # Refresh token if expired
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            # Update stored token
            user_ref.update({
                'googleDriveTokens.token': credentials.token,
            })
        
        return credentials
    except Exception as e:
        print(f"Error getting Google credentials: {str(e)}")
        return None

def get_drive_service(user_id: str, allow_service_account: bool = False):
    """Get Google Drive service instance for a user, optionally falling back to service account."""
    credentials = get_google_credentials(user_id)
    if credentials:
        return build('drive', 'v3', credentials=credentials)

    if not allow_service_account:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Drive not connected. Please connect your Google Drive account."
        )

    service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if service_account_file and os.path.exists(service_account_file):
        scopes = ['https://www.googleapis.com/auth/drive.readonly']
        sa_credentials = service_account.Credentials.from_service_account_file(
            service_account_file,
            scopes=scopes
        )
        return build('drive', 'v3', credentials=sa_credentials)

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google Drive not connected and service account not configured."
    )


def get_user_folder_id(user_id: str) -> Optional[str]:
    """Get user's Google Drive folder ID from Firestore."""
    try:
        if not firestore:
            return None
        db = firestore.client()
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return None
        return user_doc.to_dict().get('googleDriveFolderId')
    except Exception as e:
        print(f"Error fetching user folder ID: {str(e)}")
        return None

@router.get("/files")
async def list_files(
    folderId: str = Query(..., description="Google Drive folder ID"),
    user: dict = Depends(verify_token)
):
    """List files in a Google Drive folder"""
    try:
        stored_folder_id = get_user_folder_id(user["userId"])
        if stored_folder_id:
            folderId = stored_folder_id
        elif not folderId:
            return {"files": []}

        drive_service = get_drive_service(user["userId"], allow_service_account=True)
        
        # List files in the folder
        results = drive_service.files().list(
            q=f"'{folderId}' in parents and trashed=false",
            fields="files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink)",
            orderBy="modifiedTime desc"
        ).execute()
        
        files = results.get('files', [])
        
        # Format files for frontend
        formatted_files = []
        for file in files:
            file_type = 'file'
            if file.get('mimeType', '').startswith('video/'):
                file_type = 'video'
            elif file.get('mimeType', '').startswith('audio/'):
                file_type = 'audio'
            elif file.get('mimeType', '').startswith('image/'):
                file_type = 'image'
            elif 'folder' in file.get('mimeType', ''):
                file_type = 'folder'
            
            formatted_files.append({
                "id": file.get('id'),
                "name": file.get('name'),
                "type": file_type,
                "mimeType": file.get('mimeType'),
                "size": int(file.get('size', 0)) if file.get('size') else 0,
                "modifiedTime": file.get('modifiedTime'),
                "thumbnailUrl": file.get('thumbnailLink'),
                "webViewLink": file.get('webViewLink'),
                "downloadUrl": file.get('webContentLink'),
            })
        
        return {
            "files": formatted_files
        }
    except HttpError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Drive API error: {str(e)}"
        )
    except Exception as e:
        print(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list files: {str(e)}"
        )

@router.get("/files/{file_id}/download-url")
async def get_download_url(
    file_id: str,
    user: dict = Depends(verify_token)
):
    """Get download URL for a file (pass-through)"""
    try:
        drive_service = get_drive_service(user["userId"], allow_service_account=True)

        # If using service account, ensure file belongs to user's folder
        stored_folder_id = get_user_folder_id(user["userId"])
        if stored_folder_id:
            parents = drive_service.files().get(
                fileId=file_id,
                fields="parents"
            ).execute().get('parents', [])
            if stored_folder_id not in parents:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="File is not in the user's content folder."
                )
        
        # Get file metadata
        file_metadata = drive_service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, webContentLink"
        ).execute()
        
        # For files that can be downloaded directly
        download_url = file_metadata.get('webContentLink')
        
        if not download_url:
            # Generate export URL for Google Docs/Sheets/etc
            mime_type = file_metadata.get('mimeType', '')
            if 'google-apps' in mime_type:
                # Export as PDF or appropriate format
                export_mime = 'application/pdf'
                download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType={export_mime}"
            else:
                # Use standard download endpoint
                download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        
        return {
            "downloadUrl": download_url,
            "fileName": file_metadata.get('name'),
            "mimeType": file_metadata.get('mimeType'),
        }
    except HttpError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Drive API error: {str(e)}"
        )
    except Exception as e:
        print(f"Error getting download URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get download URL: {str(e)}"
        )

@router.get("/files/{file_id}/thumbnail")
async def get_thumbnail(
    file_id: str,
    user: dict = Depends(verify_token)
):
    """Get thumbnail URL for a file"""
    try:
        drive_service = get_drive_service(user["userId"], allow_service_account=True)

        stored_folder_id = get_user_folder_id(user["userId"])
        if stored_folder_id:
            parents = drive_service.files().get(
                fileId=file_id,
                fields="parents"
            ).execute().get('parents', [])
            if stored_folder_id not in parents:
                return {"thumbnailUrl": None}
        
        # Get file metadata with thumbnail
        file_metadata = drive_service.files().get(
            fileId=file_id,
            fields="thumbnailLink"
        ).execute()
        
        thumbnail_url = file_metadata.get('thumbnailLink')
        
        if thumbnail_url:
            return {"thumbnailUrl": thumbnail_url}
        else:
            # Return placeholder or default thumbnail
            return {"thumbnailUrl": None}
    except HttpError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Drive API error: {str(e)}"
        )
    except Exception as e:
        print(f"Error getting thumbnail: {str(e)}")
        return {"thumbnailUrl": None}

@router.post("/create-folder")
async def create_folder(
    folder_name: str = Query(..., description="Name for the new folder"),
    user: dict = Depends(verify_token)
):
    """Create a Google Drive folder for a user"""
    try:
        service_account_file = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        has_service_account = bool(service_account_file and os.path.exists(service_account_file))
        has_oauth = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
        if not has_service_account and not has_oauth:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Drive integration not configured"
            )
        
        # If user already has a folder structure, return existing IDs
        if firestore:
            try:
                db = firestore.client()
                user_ref = db.collection('users').document(user["userId"])
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    existing_folder_id = user_data.get('googleDriveFolderId')
                    existing_root_id = user_data.get('googleDriveRootFolderId')
                    if existing_folder_id or existing_root_id:
                        return {
                            "success": True,
                            "folderId": existing_folder_id,
                            "rootFolderId": existing_root_id,
                            "message": "Folder already configured"
                        }
            except Exception as read_error:
                print(f"Warning: could not read existing folder ID: {read_error}")

        # Get service account credentials or user credentials
        # For automatic folder creation, we'll use a service account
        # or create folder in a shared parent folder
        
        # Option 1: Use service account (recommended for automatic creation)
        SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
        # Fallback to Firebase service account credentials
        FIREBASE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        PARENT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID", "")
        
        drive_service = None
        
        # Try service account file first
        if SERVICE_ACCOUNT_FILE and os.path.exists(SERVICE_ACCOUNT_FILE):
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            
            SCOPES = ['https://www.googleapis.com/auth/drive']
            credentials = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_FILE, scopes=SCOPES
            )
            drive_service = build('drive', 'v3', credentials=credentials)
            print(f"[OK] Using service account from GOOGLE_SERVICE_ACCOUNT_FILE: {SERVICE_ACCOUNT_FILE}")
        # Fallback to Firebase credentials (also a service account)
        elif FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS):
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            
            SCOPES = ['https://www.googleapis.com/auth/drive']
            credentials = service_account.Credentials.from_service_account_file(
                FIREBASE_CREDENTIALS, scopes=SCOPES
            )
            drive_service = build('drive', 'v3', credentials=credentials)
            print(f"[OK] Using service account from GOOGLE_APPLICATION_CREDENTIALS: {FIREBASE_CREDENTIALS}")
        else:
            # Fallback: Try to use user's credentials if available
            credentials = get_google_credentials(user["userId"])
            if not credentials:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Google Drive not connected. Please connect your Google Drive account first. Service account not configured."
                )
            drive_service = build('drive', 'v3', credentials=credentials)
            print("[OK] Using user OAuth credentials for Google Drive")
        
        # Create root folder: Username
        root_folder_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder',
        }
        if PARENT_FOLDER_ID:
            root_folder_metadata['parents'] = [PARENT_FOLDER_ID]

        root_folder = drive_service.files().create(
            body=root_folder_metadata,
            fields='id, name, webViewLink'
        ).execute()
        root_folder_id = root_folder.get('id')

        # Create subfolder: ProjectFiles
        project_files_folder = drive_service.files().create(
            body={
                'name': 'ProjectFiles',
                'mimeType': 'application/vnd.google-apps.folder',
                'parents': [root_folder_id],
            },
            fields='id, name, webViewLink'
        ).execute()
        project_files_folder_id = project_files_folder.get('id')

        # Store folder IDs in Firestore
        if not firestore:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not initialized"
            )
        db = firestore.client()
        user_ref = db.collection('users').document(user["userId"])
        user_ref.set({
            'googleDriveFolderId': project_files_folder_id,
            'googleDriveFolderName': 'ProjectFiles',
            'googleDriveFolderUrl': project_files_folder.get('webViewLink'),
            'googleDriveRootFolderId': root_folder_id,
            'googleDriveRootFolderName': folder_name,
            'googleDriveRootFolderUrl': root_folder.get('webViewLink'),
            'googleDriveProjectFilesFolderId': project_files_folder_id,
            'googleDriveFolderCreatedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)

        return {
            "success": True,
            "folderId": project_files_folder_id,
            "folderName": "ProjectFiles",
            "folderUrl": project_files_folder.get('webViewLink'),
            "rootFolderId": root_folder_id,
            "message": "Folder structure created successfully"
        }
    except HttpError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Drive API error: {str(e)}"
        )
    except Exception as e:
        print(f"Error creating folder: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create folder: {str(e)}"
        )

@router.post("/connect")
async def connect_google_drive(
    code: str = Query(..., description="OAuth authorization code"),
    user: dict = Depends(verify_token)
):
    """Connect Google Drive account (OAuth callback)"""
    try:
        if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Drive integration not configured"
            )
        
        # Exchange code for tokens
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [GOOGLE_REDIRECT_URI]
                }
            },
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        flow.redirect_uri = GOOGLE_REDIRECT_URI
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        # Store tokens in Firestore
        if not firestore:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Firebase Admin not initialized"
            )
        db = firestore.client()
        user_ref = db.collection('users').document(user["userId"])
        user_ref.set({
            'googleDriveTokens': {
                'token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_uri': credentials.token_uri,
                'client_id': credentials.client_id,
                'client_secret': credentials.client_secret,
                'scopes': credentials.scopes,
            },
            'googleDriveConnectedAt': firestore.SERVER_TIMESTAMP,
        }, merge=True)
        
        return {
            "success": True,
            "message": "Google Drive connected successfully"
        }
    except Exception as e:
        print(f"Error connecting Google Drive: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Google Drive: {str(e)}"
        )

