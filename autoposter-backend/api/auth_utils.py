"""
Shared authentication utilities for M1A backend API
Provides token verification and admin verification functions
"""
import os
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Optional

# Admin emails that have admin access
ADMIN_EMAILS = ['admin@merkabaent.com', 'brogdon.lance@gmail.com']

# Security dependency
security = HTTPBearer()

# Try to import Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    firebase_admin = None
    auth = None

# Initialize Firebase Admin if not already initialized
def ensure_firebase_initialized():
    """Ensure Firebase Admin SDK is initialized"""
    if not FIREBASE_AVAILABLE:
        return False
    
    try:
        # Check if already initialized
        firebase_admin.get_app()
        return True
    except ValueError:
        # Not initialized, try to initialize
        try:
            # Try service account file
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                from firebase_admin import credentials
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                return True
            
            # Try default credentials (for Cloud Run, etc.)
            firebase_admin.initialize_app()
            return True
        except Exception as e:
            print(f"Warning: Could not initialize Firebase Admin: {e}")
            return False

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, any]:
    """
    Verify Firebase Auth ID token from Authorization header
    
    This function verifies that the request includes a valid Firebase Auth ID token
    and returns the authenticated user's information.
    
    Args:
        credentials: HTTPBearer credentials containing the Firebase Auth token
        
    Returns:
        Dict containing userId, email, and email_verified
        
    Raises:
        HTTPException: 401 if token is missing, invalid, or expired
    """
    if not FIREBASE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK not available"
        )
    
    if not ensure_firebase_initialized():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK not initialized"
        )
    
    try:
        token = credentials.credentials
        
        # Verify token with Firebase Admin SDK
        # This validates the token signature, expiration, and issuer
        decoded_token = auth.verify_id_token(token)
        
        # Return user information from decoded token
        return {
            "userId": decoded_token['uid'],
            "email": decoded_token.get('email'),
            "email_verified": decoded_token.get('email_verified', False)
        }
    except ValueError as e:
        # Invalid token format
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except firebase_admin.exceptions.InvalidArgumentError as e:
        # Token verification failed
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Other errors (network, Firebase service unavailable, etc.)
        print(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_admin(user: Dict[str, any] = Depends(verify_token)) -> Dict[str, any]:
    """
    Verify that the authenticated user is an admin
    
    This function must be used after verify_token dependency.
    It checks if the user's email is in the admin emails list.
    
    Args:
        user: User information from verify_token dependency
        
    Returns:
        User information if admin, otherwise raises HTTPException
        
    Raises:
        HTTPException: 403 if user is not an admin
    """
    user_email = user.get('email')
    
    if not user_email or user_email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required. Only authorized administrators can access this endpoint."
        )
    
    return user








