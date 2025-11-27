# api/multi_platform_api.py
"""
Multi-platform API endpoints
Extends the main API with multi-platform posting capabilities
"""
import os
import sys
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from scripts.multi_platform_manager import MultiPlatformManager, get_available_platforms
from scripts.db_multi_platform import (
    get_client_platforms, 
    add_client_platform, 
    update_client_platform,
    get_platform_post_stats,
    get_failed_platform_posts,
    retry_failed_platform_post
)

# Create router for multi-platform endpoints
router = APIRouter(prefix="/api/v1/multi-platform", tags=["Multi-Platform"])

# Pydantic models
class PlatformConfig(BaseModel):
    platform: str = Field(..., description="Platform name")
    enabled: bool = Field(True, description="Whether platform is enabled")
    credentials: Dict[str, Any] = Field(default_factory=dict, description="Platform credentials")
    settings: Dict[str, Any] = Field(default_factory=dict, description="Platform settings")

class MultiPlatformPost(BaseModel):
    client: str = Field(..., description="Client name")
    content_type: str = Field(..., description="Content type: photo, video, story")
    file_path: str = Field(..., description="Path to content file")
    caption: Optional[str] = Field(None, description="Post caption")
    platforms: List[str] = Field(..., description="Platforms to post to")
    schedule_time: Optional[str] = Field(None, description="ISO datetime to schedule post")

class PlatformPostResult(BaseModel):
    platform: str
    success: bool
    post_id: Optional[str] = None
    url: Optional[str] = None
    error: Optional[str] = None
    timestamp: str

class MultiPlatformPostResult(BaseModel):
    overall_success: bool
    successful_platforms: List[str]
    failed_platforms: List[str]
    results: Dict[str, PlatformPostResult]

class PlatformStats(BaseModel):
    total_posts: int
    successful_posts: int
    failed_posts: int
    platform_breakdown: Dict[str, int]
    status_breakdown: Dict[str, int]

# Import Firebase Admin for authentication
try:
    import firebase_admin
    from firebase_admin import credentials, auth
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi import Depends, HTTPException, status
    
    # Initialize Firebase Admin if not already initialized
    if not firebase_admin._apps:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            # Try default credentials (for Cloud Run, etc.)
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                print(f"Warning: Firebase Admin initialization failed: {e}")
    
    security = HTTPBearer()
    
    def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """
        Verify Firebase Auth ID token from Authorization header
        
        This function verifies that the request includes a valid Firebase Auth ID token
        and returns the authenticated user's information.
        
        Raises:
            HTTPException: 401 if token is missing, invalid, or expired
        """
        try:
            token = credentials.credentials
            
            # Verify token with Firebase Admin SDK
            decoded_token = auth.verify_id_token(token)
            
            # Return user information from decoded token
            return {
                "userId": decoded_token['uid'],
                "user_id": decoded_token['uid'],  # For compatibility
                "email": decoded_token.get('email'),
                "email_verified": decoded_token.get('email_verified', False),
                "tenant_id": decoded_token.get('uid')  # Use user ID as tenant for now
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
except ImportError:
    # Fallback if Firebase Admin not available (should not happen in production)
    from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
    from fastapi import Depends, HTTPException, status
    
    security = HTTPBearer()
    
    def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Fallback authentication - should not be used in production"""
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase Admin SDK not available. Authentication unavailable.",
        )

@router.get("/platforms", response_model=List[str])
async def get_available_platforms_endpoint():
    """Get list of available platforms"""
    return get_available_platforms()

@router.get("/clients/{client_name}/platforms", response_model=List[Dict[str, Any]])
async def get_client_platforms_endpoint(client_name: str, user: dict = Depends(verify_token)):
    """Get platforms configured for a client"""
    try:
        platforms = get_client_platforms(client_name)
        return [
            {
                "platform": p["platform"],
                "display_name": p["display_name"],
                "enabled": p["enabled"],
                "platform_enabled": p["platform_enabled"],
                "credentials": p["credentials"],
                "settings": p["settings"]
            }
            for p in platforms
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get client platforms: {str(e)}")

@router.post("/clients/{client_name}/platforms", response_model=Dict[str, str])
async def add_client_platform_endpoint(
    client_name: str, 
    platform_config: PlatformConfig,
    user: dict = Depends(verify_token)
):
    """Add a platform for a client"""
    try:
        from scripts.db_multi_platform import add_client_platform
        
        add_client_platform(
            client_name,
            platform_config.platform,
            platform_config.credentials,
            platform_config.settings
        )
        
        return {"message": f"Platform {platform_config.platform} added for {client_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add platform: {str(e)}")

@router.put("/clients/{client_name}/platforms/{platform}", response_model=Dict[str, str])
async def update_client_platform_endpoint(
    client_name: str,
    platform: str,
    platform_config: PlatformConfig,
    user: dict = Depends(verify_token)
):
    """Update platform configuration for a client"""
    try:
        update_client_platform(
            client_name,
            platform,
            platform_config.credentials,
            platform_config.settings
        )
        
        return {"message": f"Platform {platform} updated for {client_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update platform: {str(e)}")

@router.post("/post", response_model=MultiPlatformPostResult)
async def post_to_multiple_platforms(
    post_data: MultiPlatformPost,
    user: dict = Depends(verify_token)
):
    """Post content to multiple platforms"""
    try:
        # Load client configuration
        from scripts.secure_config_loader import load_client_config
        config = load_client_config(post_data.client)
        
        if not config:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Create multi-platform manager
        manager = MultiPlatformManager(post_data.client, config)
        
        # Authenticate with platforms
        auth_results = await manager.authenticate_all()
        authenticated_platforms = [p for p, success in auth_results.items() if success]
        
        if not authenticated_platforms:
            raise HTTPException(status_code=401, detail="No platforms authenticated successfully")
        
        # Filter to only authenticated platforms
        valid_platforms = [p for p in post_data.platforms if p in authenticated_platforms]
        
        if not valid_platforms:
            raise HTTPException(status_code=400, detail="No valid platforms specified")
        
        # Post to platforms
        results = await manager.post_to_platforms(
            file_path=post_data.file_path,
            content_type=post_data.content_type,
            caption=post_data.caption,
            platforms=valid_platforms
        )
        
        # Process results
        successful_platforms = []
        failed_platforms = []
        platform_results = {}
        
        for platform, result in results.items():
            if result.get("success"):
                successful_platforms.append(platform)
            else:
                failed_platforms.append(platform)
            
            platform_results[platform] = PlatformPostResult(
                platform=platform,
                success=result.get("success", False),
                post_id=result.get("post_id"),
                url=result.get("url"),
                error=result.get("error"),
                timestamp=result.get("timestamp", datetime.now().isoformat())
            )
        
        return MultiPlatformPostResult(
            overall_success=len(successful_platforms) > 0,
            successful_platforms=successful_platforms,
            failed_platforms=failed_platforms,
            results=platform_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to post to platforms: {str(e)}")

@router.get("/stats", response_model=PlatformStats)
async def get_platform_stats(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Get platform posting statistics"""
    try:
        stats = get_platform_post_stats(platform, status)
        
        return PlatformStats(
            total_posts=stats["total"],
            successful_posts=stats["status_breakdown"].get("posted", 0),
            failed_posts=stats["status_breakdown"].get("failed", 0),
            platform_breakdown=stats["platform_breakdown"],
            status_breakdown=stats["status_breakdown"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.get("/failed-posts", response_model=List[Dict[str, Any]])
async def get_failed_posts(
    limit: int = 50,
    user: dict = Depends(verify_token)
):
    """Get failed platform posts for retry"""
    try:
        failed_posts = get_failed_platform_posts(limit)
        return [
            {
                "id": post["id"],
                "job_id": post["job_id"],
                "platform": post["platform"],
                "client": post["client"],
                "content_type": post["content_type"],
                "error": post["error"],
                "created_at": post["created_at"]
            }
            for post in failed_posts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get failed posts: {str(e)}")

@router.post("/retry/{post_id}", response_model=Dict[str, str])
async def retry_failed_post(
    post_id: int,
    user: dict = Depends(verify_token)
):
    """Retry a failed platform post"""
    try:
        success = retry_failed_platform_post(post_id)
        if success:
            return {"message": f"Post {post_id} marked for retry"}
        else:
            raise HTTPException(status_code=404, detail="Post not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retry post: {str(e)}")

@router.get("/clients/{client_name}/capabilities", response_model=Dict[str, Any])
async def get_client_capabilities(
    client_name: str,
    user: dict = Depends(verify_token)
):
    """Get platform capabilities for a client"""
    try:
        from scripts.secure_config_loader import load_client_config
        config = load_client_config(client_name)
        
        if not config:
            raise HTTPException(status_code=404, detail="Client not found")
        
        manager = MultiPlatformManager(client_name, config)
        capabilities = manager.get_supported_content_types()
        
        return {
            "client": client_name,
            "platforms": capabilities,
            "overall_capabilities": {
                "supports_photos": any("photo" in types for types in capabilities.values()),
                "supports_videos": any("video" in types for types in capabilities.values()),
                "supports_stories": any("story" in types for types in capabilities.values())
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get capabilities: {str(e)}")

@router.post("/clients/{client_name}/test-connection", response_model=Dict[str, Any])
async def test_platform_connections(
    client_name: str,
    platforms: Optional[List[str]] = None,
    user: dict = Depends(verify_token)
):
    """Test connections to client platforms"""
    try:
        from scripts.secure_config_loader import load_client_config
        config = load_client_config(client_name)
        
        if not config:
            raise HTTPException(status_code=404, detail="Client not found")
        
        manager = MultiPlatformManager(client_name, config)
        
        if platforms is None:
            platforms = list(manager.platforms.keys())
        
        # Test authentication for each platform
        auth_results = await manager.authenticate_all()
        
        return {
            "client": client_name,
            "tested_platforms": platforms,
            "auth_results": auth_results,
            "successful_platforms": [p for p, success in auth_results.items() if success],
            "failed_platforms": [p for p, success in auth_results.items() if not success]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test connections: {str(e)}")

# Include router in main API
def include_router(app):
    """Include multi-platform router in main FastAPI app"""
    app.include_router(router)
    return app
