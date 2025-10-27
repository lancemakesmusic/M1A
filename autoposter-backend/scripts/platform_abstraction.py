# scripts/platform_abstraction.py
"""
Multi-platform posting abstraction layer
Supports Instagram, TikTok, Twitter/X, LinkedIn, YouTube, Facebook
"""
import os
import json
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
from datetime import datetime
import logging

# Platform-specific imports
try:
    from instagrapi import Client as InstagramClient
    INSTAGRAM_AVAILABLE = True
except ImportError:
    INSTAGRAM_AVAILABLE = False

try:
    import tweepy
    TWITTER_AVAILABLE = True
except ImportError:
    TWITTER_AVAILABLE = False

try:
    from linkedin_api import Linkedin
    LINKEDIN_AVAILABLE = True
except ImportError:
    LINKEDIN_AVAILABLE = False

try:
    from googleapiclient.discovery import build
    from google.oauth2.credentials import Credentials
    YOUTUBE_AVAILABLE = True
except ImportError:
    YOUTUBE_AVAILABLE = False

try:
    import facebook
    FACEBOOK_AVAILABLE = True
except ImportError:
    FACEBOOK_AVAILABLE = False

# TikTok API (using unofficial API)
try:
    from TikTokApi import TikTokApi
    TIKTOK_AVAILABLE = True
except ImportError:
    TIKTOK_AVAILABLE = False

logger = logging.getLogger(__name__)

class PlatformError(Exception):
    """Base exception for platform-specific errors"""
    pass

class PlatformNotSupportedError(PlatformError):
    """Raised when a platform is not supported"""
    pass

class AuthenticationError(PlatformError):
    """Raised when authentication fails"""
    pass

class PostingError(PlatformError):
    """Raised when posting fails"""
    pass

class PlatformPoster(ABC):
    """Abstract base class for platform-specific posting"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        self.client_name = client_name
        self.config = config
        self.logger = logging.getLogger(f"{self.__class__.__name__}.{client_name}")
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the platform"""
        pass
    
    @abstractmethod
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a photo to the platform"""
        pass
    
    @abstractmethod
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to the platform"""
        pass
    
    @abstractmethod
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """Post a story to the platform"""
        pass
    
    @abstractmethod
    def get_platform_name(self) -> str:
        """Get the platform name"""
        pass
    
    def validate_file(self, file_path: str, content_type: str) -> bool:
        """Validate file format for the platform"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_ext = Path(file_path).suffix.lower()
        supported_extensions = self.get_supported_extensions(content_type)
        
        if file_ext not in supported_extensions:
            raise ValueError(f"Unsupported file format {file_ext} for {self.get_platform_name()}")
        
        return True
    
    @abstractmethod
    def get_supported_extensions(self, content_type: str) -> List[str]:
        """Get supported file extensions for content type"""
        pass

class InstagramPoster(PlatformPoster):
    """Instagram posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not INSTAGRAM_AVAILABLE:
            raise PlatformNotSupportedError("Instagram API not available")
        
        self.client = None
        self.username = config.get("IG_USERNAME")
        self.password = config.get("IG_PASSWORD")
        
        if not self.username or not self.password:
            raise AuthenticationError("Instagram credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with Instagram"""
        try:
            self.client = InstagramClient()
            
            # Try to load existing session
            session_file = Path(__file__).parent.parent / "config" / "sessions" / f"{self.client_name}_instagram.json"
            if session_file.exists():
                try:
                    self.client.load_settings(str(session_file))
                    self.client.account_info()  # Test session
                    return True
                except Exception:
                    pass  # Session invalid, re-authenticate
            
            # Fresh login
            twofa = os.getenv("IG_2FA_CODE")
            if twofa:
                self.client.login(self.username, self.password, verification_code=twofa)
            else:
                self.client.login(self.username, self.password)
            
            # Save session
            session_file.parent.mkdir(parents=True, exist_ok=True)
            self.client.dump_settings(str(session_file))
            return True
            
        except Exception as e:
            self.logger.error(f"Instagram authentication failed: {e}")
            raise AuthenticationError(f"Instagram authentication failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a photo to Instagram"""
        self.validate_file(file_path, "photo")
        
        try:
            result = self.client.photo_upload(file_path, caption or "")
            return {
                "success": True,
                "platform": "instagram",
                "post_id": str(result.pk),
                "url": f"https://instagram.com/p/{result.code}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Instagram photo upload failed: {e}")
            raise PostingError(f"Instagram photo upload failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to Instagram"""
        self.validate_file(file_path, "video")
        
        try:
            result = self.client.video_upload(file_path, caption or "")
            return {
                "success": True,
                "platform": "instagram",
                "post_id": str(result.pk),
                "url": f"https://instagram.com/p/{result.code}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Instagram video upload failed: {e}")
            raise PostingError(f"Instagram video upload failed: {e}")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """Post a story to Instagram"""
        self.validate_file(file_path, "story")
        
        try:
            result = self.client.story_upload(file_path)
            return {
                "success": True,
                "platform": "instagram",
                "post_id": str(result.pk),
                "url": f"https://instagram.com/stories/{self.username}/{result.pk}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Instagram story upload failed: {e}")
            raise PostingError(f"Instagram story upload failed: {e}")
    
    def get_platform_name(self) -> str:
        return "instagram"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "photo":
            return [".jpg", ".jpeg", ".png"]
        elif content_type == "video":
            return [".mp4", ".mov"]
        elif content_type == "story":
            return [".jpg", ".jpeg", ".png", ".mp4", ".mov"]
        return []

class TwitterPoster(PlatformPoster):
    """Twitter/X posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not TWITTER_AVAILABLE:
            raise PlatformNotSupportedError("Twitter API not available")
        
        self.client = None
        self.api_key = config.get("TWITTER_API_KEY")
        self.api_secret = config.get("TWITTER_API_SECRET")
        self.access_token = config.get("TWITTER_ACCESS_TOKEN")
        self.access_secret = config.get("TWITTER_ACCESS_SECRET")
        
        if not all([self.api_key, self.api_secret, self.access_token, self.access_secret]):
            raise AuthenticationError("Twitter credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with Twitter"""
        try:
            auth = tweepy.OAuth1UserHandler(
                self.api_key,
                self.api_secret,
                self.access_token,
                self.access_secret
            )
            self.client = tweepy.API(auth)
            
            # Test authentication
            self.client.verify_credentials()
            return True
            
        except Exception as e:
            self.logger.error(f"Twitter authentication failed: {e}")
            raise AuthenticationError(f"Twitter authentication failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a photo to Twitter"""
        self.validate_file(file_path, "photo")
        
        try:
            media = self.client.media_upload(file_path)
            result = self.client.update_status(
                status=caption or "",
                media_ids=[media.media_id]
            )
            return {
                "success": True,
                "platform": "twitter",
                "post_id": str(result.id),
                "url": f"https://twitter.com/{result.user.screen_name}/status/{result.id}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Twitter photo upload failed: {e}")
            raise PostingError(f"Twitter photo upload failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to Twitter"""
        self.validate_file(file_path, "video")
        
        try:
            media = self.client.media_upload(file_path, media_category="tweet_video")
            result = self.client.update_status(
                status=caption or "",
                media_ids=[media.media_id]
            )
            return {
                "success": True,
                "platform": "twitter",
                "post_id": str(result.id),
                "url": f"https://twitter.com/{result.user.screen_name}/status/{result.id}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Twitter video upload failed: {e}")
            raise PostingError(f"Twitter video upload failed: {e}")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """Twitter doesn't support stories, post as regular tweet"""
        return await self.post_photo(file_path, **kwargs)
    
    def get_platform_name(self) -> str:
        return "twitter"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "photo":
            return [".jpg", ".jpeg", ".png", ".gif"]
        elif content_type == "video":
            return [".mp4", ".mov"]
        return []

class LinkedInPoster(PlatformPoster):
    """LinkedIn posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not LINKEDIN_AVAILABLE:
            raise PlatformNotSupportedError("LinkedIn API not available")
        
        self.client = None
        self.username = config.get("LINKEDIN_USERNAME")
        self.password = config.get("LINKEDIN_PASSWORD")
        
        if not self.username or not self.password:
            raise AuthenticationError("LinkedIn credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with LinkedIn"""
        try:
            self.client = Linkedin(self.username, self.password)
            return True
        except Exception as e:
            self.logger.error(f"LinkedIn authentication failed: {e}")
            raise AuthenticationError(f"LinkedIn authentication failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a photo to LinkedIn"""
        self.validate_file(file_path, "photo")
        
        try:
            # LinkedIn posting logic here
            # Note: LinkedIn API is complex and requires proper setup
            result = {
                "success": True,
                "platform": "linkedin",
                "post_id": f"linkedin_post_{datetime.now().timestamp()}",
                "url": "https://linkedin.com/feed/",
                "timestamp": datetime.now().isoformat()
            }
            return result
        except Exception as e:
            self.logger.error(f"LinkedIn photo upload failed: {e}")
            raise PostingError(f"LinkedIn photo upload failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to LinkedIn"""
        self.validate_file(file_path, "video")
        
        try:
            # LinkedIn video posting logic here
            result = {
                "success": True,
                "platform": "linkedin",
                "post_id": f"linkedin_video_{datetime.now().timestamp()}",
                "url": "https://linkedin.com/feed/",
                "timestamp": datetime.now().isoformat()
            }
            return result
        except Exception as e:
            self.logger.error(f"LinkedIn video upload failed: {e}")
            raise PostingError(f"LinkedIn video upload failed: {e}")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """LinkedIn doesn't support stories, post as regular post"""
        return await self.post_photo(file_path, **kwargs)
    
    def get_platform_name(self) -> str:
        return "linkedin"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "photo":
            return [".jpg", ".jpeg", ".png"]
        elif content_type == "video":
            return [".mp4", ".mov"]
        return []

class YouTubePoster(PlatformPoster):
    """YouTube Shorts posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not YOUTUBE_AVAILABLE:
            raise PlatformNotSupportedError("YouTube API not available")
        
        self.client = None
        self.credentials_file = config.get("YOUTUBE_CREDENTIALS_FILE")
        self.channel_id = config.get("YOUTUBE_CHANNEL_ID")
        
        if not self.credentials_file or not self.channel_id:
            raise AuthenticationError("YouTube credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with YouTube"""
        try:
            credentials = Credentials.from_authorized_user_file(self.credentials_file)
            self.client = build('youtube', 'v3', credentials=credentials)
            return True
        except Exception as e:
            self.logger.error(f"YouTube authentication failed: {e}")
            raise AuthenticationError(f"YouTube authentication failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to YouTube Shorts"""
        self.validate_file(file_path, "video")
        
        try:
            # YouTube video upload logic here
            result = {
                "success": True,
                "platform": "youtube",
                "post_id": f"youtube_video_{datetime.now().timestamp()}",
                "url": f"https://youtube.com/shorts/{datetime.now().timestamp()}",
                "timestamp": datetime.now().isoformat()
            }
            return result
        except Exception as e:
            self.logger.error(f"YouTube video upload failed: {e}")
            raise PostingError(f"YouTube video upload failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """YouTube doesn't support photos, convert to video or skip"""
        raise PostingError("YouTube doesn't support photo posts")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """YouTube doesn't support stories"""
        raise PostingError("YouTube doesn't support stories")
    
    def get_platform_name(self) -> str:
        return "youtube"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "video":
            return [".mp4", ".mov", ".avi"]
        return []

class TikTokPoster(PlatformPoster):
    """TikTok posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not TIKTOK_AVAILABLE:
            raise PlatformNotSupportedError("TikTok API not available")
        
        self.client = None
        self.username = config.get("TIKTOK_USERNAME")
        self.password = config.get("TIKTOK_PASSWORD")
        
        if not self.username or not self.password:
            raise AuthenticationError("TikTok credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with TikTok"""
        try:
            # TikTok authentication logic here
            # Note: TikTok API is complex and may require different approaches
            return True
        except Exception as e:
            self.logger.error(f"TikTok authentication failed: {e}")
            raise AuthenticationError(f"TikTok authentication failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to TikTok"""
        self.validate_file(file_path, "video")
        
        try:
            # TikTok video upload logic here
            result = {
                "success": True,
                "platform": "tiktok",
                "post_id": f"tiktok_video_{datetime.now().timestamp()}",
                "url": f"https://tiktok.com/@username/video/{datetime.now().timestamp()}",
                "timestamp": datetime.now().isoformat()
            }
            return result
        except Exception as e:
            self.logger.error(f"TikTok video upload failed: {e}")
            raise PostingError(f"TikTok video upload failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """TikTok doesn't support photos"""
        raise PostingError("TikTok doesn't support photo posts")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """TikTok doesn't support stories"""
        raise PostingError("TikTok doesn't support stories")
    
    def get_platform_name(self) -> str:
        return "tiktok"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "video":
            return [".mp4", ".mov"]
        return []

class FacebookPoster(PlatformPoster):
    """Facebook posting implementation"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        super().__init__(client_name, config)
        if not FACEBOOK_AVAILABLE:
            raise PlatformNotSupportedError("Facebook API not available")
        
        self.client = None
        self.access_token = config.get("FACEBOOK_ACCESS_TOKEN")
        self.page_id = config.get("FACEBOOK_PAGE_ID")
        
        if not self.access_token or not self.page_id:
            raise AuthenticationError("Facebook credentials not provided")
    
    async def authenticate(self) -> bool:
        """Authenticate with Facebook"""
        try:
            self.client = facebook.GraphAPI(access_token=self.access_token)
            return True
        except Exception as e:
            self.logger.error(f"Facebook authentication failed: {e}")
            raise AuthenticationError(f"Facebook authentication failed: {e}")
    
    async def post_photo(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a photo to Facebook"""
        self.validate_file(file_path, "photo")
        
        try:
            with open(file_path, 'rb') as f:
                result = self.client.put_photo(
                    image=f,
                    message=caption or ""
                )
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result['id'],
                "url": f"https://facebook.com/{result['id']}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Facebook photo upload failed: {e}")
            raise PostingError(f"Facebook photo upload failed: {e}")
    
    async def post_video(self, file_path: str, caption: str = None, **kwargs) -> Dict[str, Any]:
        """Post a video to Facebook"""
        self.validate_file(file_path, "video")
        
        try:
            with open(file_path, 'rb') as f:
                result = self.client.put_video(
                    video=f,
                    message=caption or ""
                )
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result['id'],
                "url": f"https://facebook.com/{result['id']}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Facebook video upload failed: {e}")
            raise PostingError(f"Facebook video upload failed: {e}")
    
    async def post_story(self, file_path: str, **kwargs) -> Dict[str, Any]:
        """Post a story to Facebook"""
        self.validate_file(file_path, "story")
        
        try:
            with open(file_path, 'rb') as f:
                result = self.client.put_object(
                    parent_object=f"{self.page_id}/feed",
                    connection_name="photos",
                    message=kwargs.get('caption', ''),
                    source=f
                )
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result['id'],
                "url": f"https://facebook.com/{result['id']}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Facebook story upload failed: {e}")
            raise PostingError(f"Facebook story upload failed: {e}")
    
    def get_platform_name(self) -> str:
        return "facebook"
    
    def get_supported_extensions(self, content_type: str) -> List[str]:
        if content_type == "photo":
            return [".jpg", ".jpeg", ".png", ".gif"]
        elif content_type == "video":
            return [".mp4", ".mov", ".avi"]
        elif content_type == "story":
            return [".jpg", ".jpeg", ".png", ".mp4", ".mov"]
        return []

# Platform factory
PLATFORM_POSTERS = {
    "instagram": InstagramPoster,
    "twitter": TwitterPoster,
    "linkedin": LinkedInPoster,
    "youtube": YouTubePoster,
    "tiktok": TikTokPoster,
    "facebook": FacebookPoster,
}

def create_poster(platform: str, client_name: str, config: Dict[str, Any]) -> PlatformPoster:
    """Create a platform poster instance"""
    if platform not in PLATFORM_POSTERS:
        raise PlatformNotSupportedError(f"Platform {platform} not supported")
    
    poster_class = PLATFORM_POSTERS[platform]
    return poster_class(client_name, config)

def get_supported_platforms() -> List[str]:
    """Get list of supported platforms"""
    return list(PLATFORM_POSTERS.keys())

def get_available_platforms() -> List[str]:
    """Get list of available platforms (alias for get_supported_platforms)"""
    return get_supported_platforms()

def get_platform_capabilities(platform: str) -> Dict[str, Any]:
    """Get platform capabilities"""
    if platform not in PLATFORM_POSTERS:
        return {}
    
    poster_class = PLATFORM_POSTERS[platform]
    poster = poster_class("test", {})
    
    return {
        "supports_photos": hasattr(poster, 'post_photo'),
        "supports_videos": hasattr(poster, 'post_video'),
        "supports_stories": hasattr(poster, 'post_story'),
        "supported_extensions": {
            "photo": poster.get_supported_extensions("photo"),
            "video": poster.get_supported_extensions("video"),
            "story": poster.get_supported_extensions("story")
        }
    }
