#!/usr/bin/env python3
"""
Create Google Drive folders for existing users who don't have one yet.
This script will:
1. Get all users from Firestore
2. Check which users don't have a googleDriveFolderId
3. Create a folder for each user using their username
4. Update their Firestore document with the folder ID
"""

import os
import sys
import logging
import time
import json
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Try to import tqdm for progress bars, fallback to None if not available
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    # Create a dummy tqdm class for compatibility
    class tqdm:
        def __init__(self, *args, **kwargs):
            pass
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def update(self, n=1):
            pass
        def set_description(self, desc=None):
            pass

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Initialize Firebase Admin
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    
    # Check if already initialized
    try:
        firebase_admin.get_app()
    except ValueError:
        # Not initialized, try to initialize
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("[OK] Firebase Admin initialized")
        else:
            print("[ERROR] GOOGLE_APPLICATION_CREDENTIALS not set or file not found")
            sys.exit(1)
    
    db = firestore.client()
except ImportError:
    print("[ERROR] firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Failed to initialize Firebase: {e}")
    sys.exit(1)

def validate_service_account_permissions(cred_path):
    """Validate service account has required permissions"""
    try:
        import json
        with open(cred_path, 'r') as f:
            cred_data = json.load(f)
        
        # Check required fields
        required_fields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email']
        for field in required_fields:
            if field not in cred_data:
                return False, f"Missing required field: {field}"
        
        # Check email format
        email = cred_data.get('client_email', '')
        if not email.endswith('.iam.gserviceaccount.com'):
            return False, "Email doesn't match service account format"
        
        # Check private key format
        private_key = cred_data.get('private_key', '')
        if 'BEGIN PRIVATE KEY' not in private_key:
            return False, "Invalid private key format"
        
        return True, "Valid"
    except Exception as e:
        return False, f"Validation error: {str(e)}"

def check_credential_expiration(cred_path):
    """Check if credentials are expired or expiring soon"""
    try:
        import json
        with open(cred_path, 'r') as f:
            cred_data = json.load(f)
        
        # Service account keys don't expire by default, but check if expiration is set
        if 'expires_at' in cred_data:
            from datetime import datetime
            expires = datetime.fromtimestamp(cred_data['expires_at'])
            days_until_expiry = (expires - datetime.now()).days
            if days_until_expiry < 30:
                return False, f"Credentials expire in {days_until_expiry} days"
        
        return True, "Valid"
    except Exception as e:
        return True, "Could not check expiration"  # Don't fail on expiration check

# Global cache for credentials and service
_cached_credentials = None
_cached_drive_service = None
_credential_lock = Lock()

def get_google_drive_service(use_cache=True):
    """Initialize Google Drive service using service account with caching"""
    global _cached_credentials, _cached_drive_service
    
    # Return cached service if available and caching is enabled
    if use_cache and _cached_drive_service is not None:
        return _cached_drive_service, os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID", "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc")
    
    with _credential_lock:
        # Double-check after acquiring lock (thread-safe singleton pattern)
        if use_cache and _cached_drive_service is not None:
            return _cached_drive_service, os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID", "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc")
        
        SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "")
        FIREBASE_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        PARENT_FOLDER_ID = os.getenv("GOOGLE_DRIVE_PARENT_FOLDER_ID", "1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc")
        
        cred_path = None
        if SERVICE_ACCOUNT_FILE and os.path.exists(SERVICE_ACCOUNT_FILE):
            cred_path = SERVICE_ACCOUNT_FILE
        elif FIREBASE_CREDENTIALS and os.path.exists(FIREBASE_CREDENTIALS):
            cred_path = FIREBASE_CREDENTIALS
        else:
            print("[ERROR] No service account file found. Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_APPLICATION_CREDENTIALS")
            return None, None
        
        # Validate permissions
        is_valid, message = validate_service_account_permissions(cred_path)
        if not is_valid:
            print(f"[ERROR] Service account validation failed: {message}")
            return None, None
        
        # Check expiration
        is_valid_exp, exp_message = check_credential_expiration(cred_path)
        if not is_valid_exp:
            print(f"[WARN] Credential expiration warning: {exp_message}")
        
        try:
            SCOPES = ['https://www.googleapis.com/auth/drive']
            _cached_credentials = service_account.Credentials.from_service_account_file(
                cred_path, scopes=SCOPES
            )
            _cached_drive_service = build('drive', 'v3', credentials=_cached_credentials)
            print(f"[OK] Google Drive service initialized using: {cred_path}")
            if use_cache:
                print(f"[INFO] Credentials cached for reuse")
            return _cached_drive_service, PARENT_FOLDER_ID
        except Exception as e:
            print(f"[ERROR] Failed to initialize Google Drive service: {e}")
            return None, None

def sanitize_folder_name(name):
    """Sanitize folder name for Google Drive compatibility"""
    if not name:
        return None
    
    # Google Drive folder name restrictions:
    # - Max 255 characters
    # - Cannot contain: / \ : * ? " < > |
    # - Cannot start/end with space or dot
    # - Recommended: alphanumeric, spaces, hyphens, underscores
    
    # Remove invalid characters
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        name = name.replace(char, '-')
    
    # Remove leading/trailing spaces and dots
    name = name.strip(' .')
    
    # Truncate to 255 characters (Google Drive limit)
    if len(name) > 255:
        name = name[:252] + '...'
    
    # If empty after sanitization, return None
    if not name or name.isspace():
        return None
    
    return name

def find_or_create_subfolder(drive_service, parent_id, name, logger=None):
    """Find a subfolder by name under a parent, or create it if missing."""
    if logger is None:
        import logging
        logger = logging.getLogger('create_folders')

    query = (
        f"'{parent_id}' in parents and "
        f"mimeType='application/vnd.google-apps.folder' and "
        f"name='{name}' and trashed=false"
    )
    try:
        results = drive_service.files().list(
            q=query,
            fields='files(id, name, webViewLink)',
            pageSize=1
        ).execute()
        files = results.get('files', [])
        if files:
            return files[0]
    except Exception as e:
        logger.debug(f"  [WARN] Could not search for folder '{name}': {e}")

    folder = drive_service.files().create(
        body={
            'name': name,
            'mimeType': 'application/vnd.google-apps.folder',
            'parents': [parent_id],
        },
        fields='id, name, webViewLink'
    ).execute()
    return folder


def create_folder_for_user(
    drive_service,
    parent_folder_id,
    username,
    user_id,
    existing_root_id=None,
    max_retries=3,
    logger=None
):
    """Create Google Drive folder structure for a user with retry logic."""
    if logger is None:
        import logging
        logger = logging.getLogger('create_folders')
    
    # Use username as folder name, or fallback to user_id
    folder_name = username if username else f"user-{user_id[:8]}"
    
    # Sanitize folder name
    folder_name = sanitize_folder_name(folder_name)
    if not folder_name:
        folder_name = f"user-{user_id[:8]}"
    
    # Retry logic for transient errors
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            # Determine root folder (use existing if provided)
            root_folder = None
            if existing_root_id:
                root_id = existing_root_id
                root_folder = {'id': root_id, 'name': folder_name, 'webViewLink': None}
            else:
                root_folder = drive_service.files().create(
                    body={
                        'name': folder_name,
                        'mimeType': 'application/vnd.google-apps.folder',
                        'parents': [parent_folder_id],
                    },
                    fields='id, name, webViewLink'
                ).execute()
                root_id = root_folder.get('id')

            # Create/find subfolder: ProjectFiles
            project_files_folder = find_or_create_subfolder(drive_service, root_id, 'ProjectFiles', logger=logger)
            
            symbols = get_unicode_symbols()
            logger.debug(f"  {symbols['success']} Folder structure ready: {folder_name}")
            logger.debug(f"      {symbols['folder']} Root ID: {root_id}")
            logger.debug(f"      {symbols['folder']} ProjectFiles ID: {project_files_folder['id']}")
            
            return {
                'root_folder_id': root_id,
                'root_folder_name': folder_name,
                'root_folder_url': root_folder.get('webViewLink'),
                'project_files_folder_id': project_files_folder.get('id'),
                'project_files_folder_url': project_files_folder.get('webViewLink'),
                'user_id': user_id
            }
        except HttpError as e:
            last_error = e
            # Retry on rate limit or server errors (5xx)
            if e.resp.status in [429, 500, 502, 503, 504] and attempt < max_retries:
                wait_time = 2 ** attempt  # Exponential backoff: 2s, 4s, 8s
                logger.warning(f"  [RETRY] Attempt {attempt}/{max_retries} failed: {e.resp.status}")
                logger.debug(f"      Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            else:
                logger.error(f"  [ERROR] Google Drive API error: {e}")
                if e.resp.status == 403:
                    logger.error(f"      Permission denied - check folder sharing")
                elif e.resp.status == 404:
                    logger.error(f"      Parent folder not found")
                return None
        except Exception as e:
            last_error = e
            if attempt < max_retries:
                wait_time = 2 ** attempt
                logger.warning(f"  [RETRY] Attempt {attempt}/{max_retries} failed: {str(e)}")
                logger.debug(f"      Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            else:
                logger.error(f"  [ERROR] Failed to create folder: {e}")
                return None
    
    # All retries exhausted
    logger.error(f"  [ERROR] Failed after {max_retries} attempts: {last_error}")
    return None

def update_user_folder_info(user_id, folder_info, logger=None):
    """Update user's Firestore document with folder information"""
    if logger is None:
        import logging
        logger = logging.getLogger('create_folders')
    
    try:
        user_ref = db.collection('users').document(user_id)
        user_ref.update({
            'googleDriveFolderId': folder_info['project_files_folder_id'],
            'googleDriveFolderName': 'ProjectFiles',
            'googleDriveFolderUrl': folder_info.get('project_files_folder_url'),
            'googleDriveRootFolderId': folder_info.get('root_folder_id'),
            'googleDriveRootFolderName': folder_info.get('root_folder_name'),
            'googleDriveRootFolderUrl': folder_info.get('root_folder_url'),
            'googleDriveProjectFilesFolderId': folder_info.get('project_files_folder_id'),
            'googleDriveFolderCreatedAt': firestore.SERVER_TIMESTAMP,
        })
        logger.info(f"  [OK] Updated Firestore document")
        return True
    except Exception as e:
        error_msg = str(e)
        # Provide user-friendly error messages
        if "403" in error_msg or "Missing or insufficient permissions" in error_msg:
            logger.warning(f"  [WARN] Firestore Permission Denied")
            logger.info(f"  [INFO] The service account doesn't have write permissions to Firestore.")
            logger.info(f"  [INFO] This is common when using a Google Drive-only service account.")
            logger.info(f"  [INFO] The folder was created successfully in Google Drive.")
            logger.info(f"  [INFO] To update Firestore, either:")
            logger.info(f"         1. Grant Firestore write permissions to the service account, OR")
            logger.info(f"         2. Manually update the user document with:")
            logger.info(f"            googleDriveFolderId: {folder_info['project_files_folder_id']}")
            logger.info(f"            googleDriveRootFolderId: {folder_info.get('root_folder_id')}")
            logger.info(f"            googleDriveProjectFilesFolderId: {folder_info.get('project_files_folder_id')}")
        elif "404" in error_msg or "not found" in error_msg.lower():
            logger.warning(f"  [WARN] User document not found in Firestore")
            logger.info(f"  [INFO] User ID '{user_id}' doesn't exist in Firestore.")
            logger.info(f"  [INFO] The folder was created successfully in Google Drive.")
            logger.info(f"  [INFO] You may need to create the user document first.")
        else:
            logger.warning(f"  [WARN] Could not update Firestore: {error_msg}")
            logger.info(f"  [INFO] Folder created successfully, but Firestore update failed.")
            logger.info(f"  [INFO] You may need to manually update the user document with:")
            logger.info(f"         googleDriveFolderId: {folder_info['project_files_folder_id']}")
            logger.info(f"         googleDriveRootFolderId: {folder_info.get('root_folder_id')}")
            logger.info(f"         googleDriveProjectFilesFolderId: {folder_info.get('project_files_folder_id')}")
        return False

def get_unicode_symbols():
    """Get Unicode symbols with ASCII fallbacks"""
    try:
        # Try to use Unicode symbols
        import sys
        if sys.stdout.encoding and 'utf' in sys.stdout.encoding.lower():
            return {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️',
                'folder': '📁',
                'user': '👤',
                'check': '✓',
                'cross': '✗'
            }
    except:
        pass
    # ASCII fallbacks
    return {
        'success': '[OK]',
        'error': '[X]',
        'warning': '[!]',
        'info': '[i]',
        'folder': '[FOLDER]',
        'user': '[USER]',
        'check': '[+]',
        'cross': '[-]'
    }

def setup_logging(log_file=None):
    """Setup logging to both console and file with audit logging"""
    if log_file is None:
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = log_dir / f"create_folders_{timestamp}.log"
    
    # Create logger
    logger = logging.getLogger('create_folders')
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    logger.handlers = []
    
    # File handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter('%(message)s')
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # Audit logging - who is running this script
    import getpass
    import platform
    user = getpass.getuser()
    computer = platform.node()
    logger.info(f"[AUDIT] Script started by user: {user} on computer: {computer}")
    
    return logger, log_file

def save_state_file(state_file, users_processed, users_failed):
    """Save progress state to file for resume capability"""
    try:
        state = {
            'timestamp': datetime.now().isoformat(),
            'users_processed': users_processed,
            'users_failed': users_failed,
            'total_processed': len(users_processed) + len(users_failed)
        }
        with open(state_file, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
        return True
    except Exception as e:
        return False

def load_state_file(state_file):
    """Load progress state from file"""
    try:
        if not os.path.exists(state_file):
            return None
        with open(state_file, 'r', encoding='utf-8') as f:
            state = json.load(f)
        return state
    except Exception as e:
        return None

def validate_user_id(user_id):
    """Validate user ID format"""
    if not user_id or not isinstance(user_id, str):
        return False, "User ID must be a non-empty string"
    if len(user_id) < 3:
        return False, "User ID must be at least 3 characters"
    if len(user_id) > 128:
        return False, "User ID must be less than 128 characters"
    # Check for invalid characters (Firestore document ID restrictions)
    invalid_chars = ['/', '\\', '.', '..']
    for char in invalid_chars:
        if char in user_id:
            return False, f"User ID cannot contain '{char}'"
    return True, "Valid"

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Create Google Drive folders for users')
    parser.add_argument('--user-ids', nargs='+', help='User IDs to create folders for (space-separated)')
    parser.add_argument('--username', help='Username for the folder (if providing single user ID)')
    parser.add_argument('--all', action='store_true', help='Try to get all users (requires Firestore read permissions)')
    parser.add_argument('--log-file', help='Path to log file (default: logs/create_folders_TIMESTAMP.log)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    parser.add_argument('--batch-size', type=int, default=10, help='Maximum folders to create per batch (default: 10)')
    parser.add_argument('--rate-limit', type=int, default=60, help='Seconds to wait between batches (default: 60)')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without creating folders')
    parser.add_argument('--parallel', action='store_true', help='Enable parallel processing for multiple users')
    parser.add_argument('--max-workers', type=int, default=5, help='Maximum parallel workers (default: 5, only used with --parallel)')
    parser.add_argument('--resume-from', help='Resume from state file (path to state JSON file)')
    parser.add_argument('--state-file', help='Path to save/load state file for resume capability (default: logs/create_folders_state.json)')
    args = parser.parse_args()
    
    # Setup logging
    logger, log_file = setup_logging(args.log_file)
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Get Unicode symbols
    symbols = get_unicode_symbols()
    
    logger.info("=" * 60)
    logger.info("Create Google Drive Folders for Existing Users")
    logger.info("=" * 60)
    logger.info("")
    logger.info(f"{symbols['info']} Log file: {log_file}")
    logger.info("")
    
    # Setup state file for resume capability
    if args.state_file:
        state_file = Path(args.state_file)
    else:
        log_dir = Path(__file__).parent.parent / "logs"
        log_dir.mkdir(exist_ok=True)
        state_file = log_dir / "create_folders_state.json"
    
    # Load previous state if resuming
    users_processed = set()
    users_failed = set()
    if args.resume_from:
        resume_state_file = Path(args.resume_from)
        if resume_state_file.exists():
            state = load_state_file(resume_state_file)
            if state:
                users_processed = set(state.get('users_processed', []))
                users_failed = set(state.get('users_failed', []))
                logger.info(f"{symbols['info']} Resuming from previous state:")
                logger.info(f"  {symbols['success']} Previously processed: {len(users_processed)} users")
                logger.info(f"  {symbols['error']} Previously failed: {len(users_failed)} users")
                logger.info("")
    
    # Initialize Google Drive service
    logger.info("Initializing Google Drive service...")
    drive_service, parent_folder_id = get_google_drive_service()
    if not drive_service:
        logger.error("Failed to initialize Google Drive service")
        sys.exit(1)
    
    logger.info(f"[OK] Parent folder ID: {parent_folder_id}")
    
    # Security warnings
    if not args.dry_run:
        logger.warning("[SECURITY] Credentials are stored in plain text")
        logger.warning("[SECURITY] Ensure .env and firebase-admin.json are in .gitignore")
        logger.warning("[SECURITY] Restrict file permissions in production")
    
    logger.info("")
    
    users_to_process = []
    
    # If user IDs provided via command line
    if args.user_ids:
        logger.info(f"{symbols['info']} Processing {len(args.user_ids)} user(s) from command line...")
        for user_id in args.user_ids:
            # Validate user ID
            is_valid, validation_msg = validate_user_id(user_id)
            if not is_valid:
                logger.warning(f"{symbols['warning']} Invalid user ID '{user_id}': {validation_msg}")
                continue
            
            # Skip if already processed (when resuming)
            if user_id in users_processed:
                logger.info(f"  {symbols['info']} Skipping {user_id} (already processed)")
                continue
            if user_id in users_failed and not args.resume_from:
                logger.info(f"  {symbols['warning']} Skipping {user_id} (previously failed)")
                continue
            
            # Try to get user data from Firestore
            try:
                user_ref = db.collection('users').document(user_id)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    username = user_data.get('username') or user_data.get('displayName') or user_data.get('email', '').split('@')[0]
                    if not user_data.get('googleDriveProjectFilesFolderId') or not user_data.get('googleDriveRootFolderId'):
                        users_to_process.append({
                            'id': user_id,
                            'username': username,
                            'email': user_data.get('email', 'N/A'),
                            'existing_root_id': user_data.get('googleDriveRootFolderId'),
                        })
                    else:
                        logger.info(f"  {symbols['info']} User {user_id} already has a folder")
                        users_processed.add(user_id)
                else:
                    # User doesn't exist in Firestore, use provided username or user_id
                    username = args.username if args.username and len(args.user_ids) == 1 else user_id[:8]
                    users_to_process.append({
                        'id': user_id,
                        'username': username,
                        'email': 'N/A'
                    })
            except Exception as e:
                error_msg = str(e)
                if "403" in error_msg or "Missing or insufficient permissions" in error_msg:
                    logger.warning(f"  {symbols['warning']} Could not fetch user {user_id} from Firestore: Permission denied")
                    logger.info(f"  {symbols['info']} This is normal if the service account doesn't have Firestore read permissions")
                    logger.info(f"  {symbols['info']} Proceeding with provided user ID...")
                else:
                    logger.warning(f"  {symbols['warning']} Could not fetch user {user_id} from Firestore: {e}")
                # Use provided username or user_id
                username = args.username if args.username and len(args.user_ids) == 1 else user_id[:8]
                users_to_process.append({
                    'id': user_id,
                    'username': username,
                    'email': 'N/A'
                })
    
    # If --all flag, try to get all users (may fail due to permissions)
    elif args.all:
        logger.info(f"{symbols['info']} Fetching users from Firestore...")
        try:
            users_ref = db.collection('users')
            users = users_ref.stream()
            user_list = list(users)
            logger.info(f"{symbols['success']} Found {len(user_list)} users")
            logger.info("")
            
            for user_doc in user_list:
                user_id = user_doc.id
                # Skip if already processed
                if user_id in users_processed:
                    continue
                
                user_data = user_doc.to_dict()
                if not user_data.get('googleDriveProjectFilesFolderId') or not user_data.get('googleDriveRootFolderId'):
                    username = user_data.get('username') or user_data.get('displayName') or user_data.get('email', '').split('@')[0]
                    users_to_process.append({
                        'id': user_id,
                        'username': username,
                        'email': user_data.get('email', 'N/A'),
                        'existing_root_id': user_data.get('googleDriveRootFolderId'),
                    })
                else:
                    users_processed.add(user_id)
        except Exception as e:
            error_msg = str(e)
            if "403" in error_msg or "Missing or insufficient permissions" in error_msg:
                logger.error(f"{symbols['error']} Firestore Permission Denied")
                logger.info(f"{symbols['info']} The service account doesn't have read permissions to Firestore.")
                logger.info(f"{symbols['info']} This is common when using a Google Drive-only service account.")
                logger.info(f"{symbols['info']} Try using --user-ids instead to specify users directly")
            else:
                logger.error(f"{symbols['error']} Failed to fetch users: {e}")
                logger.info(f"{symbols['info']} Try using --user-ids instead to specify users directly")
            sys.exit(1)
    
    else:
        # Interactive mode - ask for user IDs
        logger.info(f"{symbols['info']} Enter user IDs (one per line, empty line to finish):")
        user_ids = []
        while True:
            user_id = input(f"{symbols['user']} User ID (or press Enter to finish): ").strip()
            if not user_id:
                break
            # Validate user ID
            is_valid, validation_msg = validate_user_id(user_id)
            if not is_valid:
                logger.warning(f"{symbols['warning']} Invalid user ID: {validation_msg}")
                continue
            user_ids.append(user_id)
        
        if not user_ids:
            logger.info(f"{symbols['warning']} No user IDs provided. Exiting.")
            return
        
        for user_id in user_ids:
            # Skip if already processed
            if user_id in users_processed:
                logger.info(f"  {symbols['info']} Skipping {user_id} (already processed)")
                continue
            
            try:
                user_ref = db.collection('users').document(user_id)
                user_doc = user_ref.get()
                if user_doc.exists:
                    user_data = user_doc.to_dict()
                    username = user_data.get('username') or user_data.get('displayName') or user_data.get('email', '').split('@')[0]
                    if not user_data.get('googleDriveProjectFilesFolderId') or not user_data.get('googleDriveRootFolderId'):
                        users_to_process.append({
                            'id': user_id,
                            'username': username,
                            'email': user_data.get('email', 'N/A'),
                            'existing_root_id': user_data.get('googleDriveRootFolderId'),
                        })
                    else:
                        logger.info(f"  {symbols['info']} User {user_id} already has a folder")
                        users_processed.add(user_id)
                else:
                    users_to_process.append({
                        'id': user_id,
                        'username': user_id[:8],
                        'email': 'N/A'
                    })
            except Exception as e:
                error_msg = str(e)
                if "403" in error_msg or "Missing or insufficient permissions" in error_msg:
                    logger.warning(f"  {symbols['warning']} Could not fetch user {user_id}: Permission denied")
                    logger.info(f"  {symbols['info']} Proceeding with provided user ID...")
                else:
                    logger.warning(f"  {symbols['warning']} Could not fetch user {user_id}: {e}")
                users_to_process.append({
                    'id': user_id,
                    'username': user_id[:8],
                    'email': 'N/A'
                })
    
    # Filter out already processed users
    users_to_process = [u for u in users_to_process if u['id'] not in users_processed]
    
    if not users_to_process:
        logger.info(f"{symbols['success']} No users to process! All users already have folders.")
        if users_processed:
            logger.info(f"{symbols['info']} Total users with folders: {len(users_processed)}")
        return
    
    logger.info(f"\n{symbols['info']} Found {len(users_to_process)} user(s) to create folders for")
    if users_processed:
        logger.info(f"{symbols['info']} {len(users_processed)} user(s) already processed (skipped)")
    logger.info("")
    
    # Show users
    logger.info(f"{symbols['folder']} Users to create folders for:")
    for i, user in enumerate(users_to_process, 1):
        logger.info(f"  {i}. {symbols['user']} {user['username']} ({user['email']}) - ID: {user['id']}")
    logger.info("")
    
    if not args.dry_run:
        response = input(f"{symbols['info']} Create folders for these users? (yes/no): ").strip().lower()
        if response not in ['yes', 'y']:
            logger.info(f"{symbols['warning']} Cancelled.")
            return
    
    logger.info("")
    if args.dry_run:
        logger.info(f"{symbols['warning']} DRY RUN MODE - No folders will be created")
        logger.info("")
    
    logger.info(f"{symbols['folder']} Creating folders...")
    logger.info("-" * 60)
    
    success_count = 0
    error_count = 0
    total_users = len(users_to_process)
    
    # Thread-safe counters
    success_lock = Lock()
    error_lock = Lock()
    
    def process_single_user(user, idx, pbar=None):
        """Process a single user - used for both sequential and parallel processing"""
        progress = f"[{idx}/{total_users}]"
        user_desc = f"{user['username']} ({user['email']})"
        
        if pbar:
            pbar.set_description(f"Processing: {user['username']}")
        
        logger.debug(f"{progress} Processing: {user_desc}")
        logger.debug(f"User ID: {user['id']}")
        
        if args.dry_run:
            logger.debug(f"{progress} {symbols['info']} [DRY RUN] Would create folder for: {user_desc}")
            if pbar:
                pbar.update(1)
            return {'success': True, 'user_id': user['id']}
        
        # Create folder
        folder_info = create_folder_for_user(
            drive_service, 
            parent_folder_id, 
            user['username'], 
            user['id'],
            existing_root_id=user.get('existing_root_id'),
            logger=logger
        )
        
        if folder_info:
            logger.debug(f"{progress} {symbols['success']} Folder created successfully")
            # Update Firestore (optional - folder is already created)
            update_user_folder_info(user['id'], folder_info, logger=logger)
            logger.debug(f"Successfully processed user {user['id']}")
            if pbar:
                pbar.update(1)
            return {'success': True, 'user_id': user['id'], 'folder_info': folder_info}
        else:
            logger.warning(f"{progress} {symbols['error']} Failed to create folder for user {user['id']}")
            if pbar:
                pbar.update(1)
            return {'success': False, 'user_id': user['id']}
    
    # Create progress bar
    pbar_desc = "Creating folders" if not args.dry_run else "Previewing folders"
    with tqdm(total=total_users, desc=pbar_desc, disable=not HAS_TQDM, unit="user") as pbar:
        # Process users either in parallel or sequentially
        if args.parallel and total_users > 1:
            logger.info(f"{symbols['info']} Using parallel processing with {args.max_workers} workers")
            logger.info("")
            
            # Process in batches to respect rate limits
            batch_size = args.batch_size
            batch_count = 0
            
            for batch_start in range(0, total_users, batch_size):
                batch_end = min(batch_start + batch_size, total_users)
                batch_count += 1
                batch_users = users_to_process[batch_start:batch_end]
                
                logger.info(f"{symbols['info']} Processing batch {batch_count} ({len(batch_users)} users)...")
                
                # Process batch in parallel
                with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
                    # Submit all tasks in the batch
                    future_to_user = {
                        executor.submit(process_single_user, user, batch_start + idx + 1, pbar): user
                        for idx, user in enumerate(batch_users)
                    }
                    
                    # Collect results as they complete
                    for future in as_completed(future_to_user):
                        user = future_to_user[future]
                        try:
                            result = future.result()
                            if result['success']:
                                with success_lock:
                                    success_count += 1
                                    users_processed.add(user['id'])
                            else:
                                with error_lock:
                                    error_count += 1
                                    users_failed.add(user['id'])
                        except Exception as e:
                            logger.error(f"{symbols['error']} Exception processing user {user['id']}: {e}")
                            with error_lock:
                                error_count += 1
                                users_failed.add(user['id'])
                
                # Save state after each batch
                save_state_file(state_file, list(users_processed), list(users_failed))
                
                # Rate limiting between batches (except for the last batch)
                if batch_end < total_users:
                    logger.info(f"{symbols['info']} Rate limiting: waiting {args.rate_limit} seconds before next batch...")
                    time.sleep(args.rate_limit)
        else:
            # Sequential processing
            if args.parallel:
                logger.info(f"{symbols['info']} Parallel processing requested but only 1 user - processing sequentially")
            else:
                logger.info(f"{symbols['info']} Processing sequentially (use --parallel for parallel processing)")
            logger.info("")
            
            # Process in batches to respect rate limits
            batch_size = args.batch_size
            batch_count = 0
            
            for batch_start in range(0, total_users, batch_size):
                batch_end = min(batch_start + batch_size, total_users)
                batch_count += 1
                batch_users = users_to_process[batch_start:batch_end]
                
                logger.info(f"{symbols['info']} Processing batch {batch_count} ({len(batch_users)} users)...")
                
                for idx, user in enumerate(batch_users):
                    result = process_single_user(user, batch_start + idx + 1, pbar)
                    if result['success']:
                        success_count += 1
                        users_processed.add(user['id'])
                    else:
                        error_count += 1
                        users_failed.add(user['id'])
                    
                    # Save state periodically (every 5 users or at end of batch)
                    if (idx + 1) % 5 == 0 or idx == len(batch_users) - 1:
                        save_state_file(state_file, list(users_processed), list(users_failed))
                
                # Rate limiting between batches (except for the last batch)
                if batch_end < total_users:
                    logger.info(f"{symbols['info']} Rate limiting: waiting {args.rate_limit} seconds before next batch...")
                    time.sleep(args.rate_limit)
    
    # Final state save
    save_state_file(state_file, list(users_processed), list(users_failed))
    
    logger.info("")
    logger.info("=" * 60)
    logger.info(f"{symbols['info']} Summary:")
    logger.info(f"  {symbols['success']} Successfully created: {success_count} folders")
    logger.info(f"  {symbols['error']} Errors: {error_count}")
    logger.info(f"  {symbols['info']} Total processed: {total_users}")
    if args.parallel and total_users > 1:
        logger.info(f"  {symbols['info']} Processing mode: Parallel ({args.max_workers} workers)")
    else:
        logger.info(f"  {symbols['info']} Processing mode: Sequential")
    logger.info(f"  {symbols['folder']} Log file: {log_file}")
    if state_file.exists():
        logger.info(f"  {symbols['info']} State file: {state_file} (for resume capability)")
    logger.info("=" * 60)
    
    # Audit log completion
    import getpass
    import platform
    logger.info(f"[AUDIT] Script completed by {getpass.getuser()} on {platform.node()}")

if __name__ == "__main__":
    main()

