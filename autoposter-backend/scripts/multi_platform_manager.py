# scripts/multi_platform_manager.py
"""
Multi-platform posting manager
Handles posting to multiple social media platforms simultaneously
"""
import asyncio
import logging
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
from datetime import datetime
import json

from platform_abstraction import (
    create_poster, 
    get_supported_platforms, 
    get_platform_capabilities,
    PlatformError,
    AuthenticationError,
    PostingError
)

logger = logging.getLogger(__name__)

class MultiPlatformManager:
    """Manages posting to multiple social media platforms"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        self.client_name = client_name
        self.config = config
        self.platforms = {}
        self.logger = logging.getLogger(f"MultiPlatformManager.{client_name}")
        
        # Initialize platform configurations
        self._initialize_platforms()
    
    def _initialize_platforms(self):
        """Initialize platform configurations"""
        platform_configs = self.config.get("platforms", {})
        
        for platform, enabled in platform_configs.items():
            if enabled and platform in get_supported_platforms():
                try:
                    poster = create_poster(platform, self.client_name, self.config)
                    self.platforms[platform] = poster
                    self.logger.info(f"Initialized {platform} poster for {self.client_name}")
                except Exception as e:
                    self.logger.error(f"Failed to initialize {platform}: {e}")
    
    async def authenticate_all(self) -> Dict[str, bool]:
        """Authenticate with all enabled platforms"""
        auth_results = {}
        
        for platform, poster in self.platforms.items():
            try:
                auth_results[platform] = await poster.authenticate()
                self.logger.info(f"Authentication successful for {platform}")
            except AuthenticationError as e:
                self.logger.error(f"Authentication failed for {platform}: {e}")
                auth_results[platform] = False
            except Exception as e:
                self.logger.error(f"Unexpected error during {platform} authentication: {e}")
                auth_results[platform] = False
        
        return auth_results
    
    async def post_to_platforms(
        self, 
        file_path: str, 
        content_type: str, 
        caption: str = None,
        platforms: List[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Post content to multiple platforms
        
        Args:
            file_path: Path to the content file
            content_type: Type of content (photo, video, story)
            caption: Post caption
            platforms: List of platforms to post to (None for all enabled)
            **kwargs: Additional platform-specific parameters
        
        Returns:
            Dictionary with posting results for each platform
        """
        if platforms is None:
            platforms = list(self.platforms.keys())
        
        # Filter platforms that support the content type
        supported_platforms = self._filter_supported_platforms(platforms, content_type)
        
        if not supported_platforms:
            raise PostingError(f"No platforms support {content_type} content")
        
        # Post to all supported platforms concurrently
        tasks = []
        for platform in supported_platforms:
            task = self._post_to_platform(platform, file_path, content_type, caption, **kwargs)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        posting_results = {}
        for i, platform in enumerate(supported_platforms):
            result = results[i]
            if isinstance(result, Exception):
                posting_results[platform] = {
                    "success": False,
                    "error": str(result),
                    "platform": platform,
                    "timestamp": datetime.now().isoformat()
                }
            else:
                posting_results[platform] = result
        
        return posting_results
    
    async def _post_to_platform(
        self, 
        platform: str, 
        file_path: str, 
        content_type: str, 
        caption: str = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Post to a specific platform"""
        poster = self.platforms[platform]
        
        try:
            if content_type == "photo":
                return await poster.post_photo(file_path, caption, **kwargs)
            elif content_type == "video":
                return await poster.post_video(file_path, caption, **kwargs)
            elif content_type == "story":
                return await poster.post_story(file_path, **kwargs)
            else:
                raise PostingError(f"Unsupported content type: {content_type}")
                
        except Exception as e:
            self.logger.error(f"Failed to post to {platform}: {e}")
            raise
    
    def _filter_supported_platforms(self, platforms: List[str], content_type: str) -> List[str]:
        """Filter platforms that support the given content type"""
        supported = []
        
        for platform in platforms:
            if platform not in self.platforms:
                continue
            
            capabilities = get_platform_capabilities(platform)
            
            if content_type == "photo" and capabilities.get("supports_photos", False):
                supported.append(platform)
            elif content_type == "video" and capabilities.get("supports_videos", False):
                supported.append(platform)
            elif content_type == "story" and capabilities.get("supports_stories", False):
                supported.append(platform)
        
        return supported
    
    def get_platform_status(self) -> Dict[str, Any]:
        """Get status of all platforms"""
        status = {}
        
        for platform, poster in self.platforms.items():
            capabilities = get_platform_capabilities(platform)
            status[platform] = {
                "enabled": True,
                "capabilities": capabilities,
                "poster_class": poster.__class__.__name__
            }
        
        return status
    
    def get_supported_content_types(self) -> Dict[str, List[str]]:
        """Get supported content types for each platform"""
        content_types = {}
        
        for platform, poster in self.platforms.items():
            platform_types = []
            capabilities = get_platform_capabilities(platform)
            
            if capabilities.get("supports_photos", False):
                platform_types.append("photo")
            if capabilities.get("supports_videos", False):
                platform_types.append("video")
            if capabilities.get("supports_stories", False):
                platform_types.append("story")
            
            content_types[platform] = platform_types
        
        return content_types
    
    def validate_content(self, file_path: str, content_type: str, platforms: List[str] = None) -> Dict[str, bool]:
        """Validate content for specified platforms"""
        if platforms is None:
            platforms = list(self.platforms.keys())
        
        validation_results = {}
        
        for platform in platforms:
            if platform not in self.platforms:
                validation_results[platform] = False
                continue
            
            try:
                poster = self.platforms[platform]
                poster.validate_file(file_path, content_type)
                validation_results[platform] = True
            except Exception as e:
                self.logger.warning(f"Content validation failed for {platform}: {e}")
                validation_results[platform] = False
        
        return validation_results

class PlatformScheduler:
    """Schedules posts across multiple platforms with optimal timing"""
    
    def __init__(self, client_name: str, config: Dict[str, Any]):
        self.client_name = client_name
        self.config = config
        self.manager = MultiPlatformManager(client_name, config)
        self.logger = logging.getLogger(f"PlatformScheduler.{client_name}")
    
    async def schedule_post(
        self,
        file_path: str,
        content_type: str,
        caption: str = None,
        platforms: List[str] = None,
        schedule_time: datetime = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Schedule a post across multiple platforms"""
        
        if schedule_time is None:
            schedule_time = datetime.now()
        
        # Validate content for all platforms
        validation_results = self.manager.validate_content(file_path, content_type, platforms)
        valid_platforms = [p for p, valid in validation_results.items() if valid]
        
        if not valid_platforms:
            raise PostingError("Content not valid for any platform")
        
        # Schedule the post
        schedule_info = {
            "client": self.client_name,
            "file_path": file_path,
            "content_type": content_type,
            "caption": caption,
            "platforms": valid_platforms,
            "schedule_time": schedule_time.isoformat(),
            "status": "scheduled",
            "created_at": datetime.now().isoformat(),
            "kwargs": kwargs
        }
        
        self.logger.info(f"Scheduled {content_type} post for {len(valid_platforms)} platforms")
        return schedule_info
    
    async def execute_scheduled_post(self, schedule_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a scheduled post"""
        try:
            results = await self.manager.post_to_platforms(
                file_path=schedule_info["file_path"],
                content_type=schedule_info["content_type"],
                caption=schedule_info["caption"],
                platforms=schedule_info["platforms"],
                **schedule_info.get("kwargs", {})
            )
            
            # Update schedule status
            schedule_info["status"] = "completed"
            schedule_info["completed_at"] = datetime.now().isoformat()
            schedule_info["results"] = results
            
            return schedule_info
            
        except Exception as e:
            schedule_info["status"] = "failed"
            schedule_info["error"] = str(e)
            schedule_info["failed_at"] = datetime.now().isoformat()
            
            self.logger.error(f"Failed to execute scheduled post: {e}")
            return schedule_info

# Utility functions
def create_multi_platform_manager(client_name: str, config: Dict[str, Any]) -> MultiPlatformManager:
    """Create a multi-platform manager for a client"""
    return MultiPlatformManager(client_name, config)

def get_available_platforms() -> List[str]:
    """Get list of available platforms"""
    return get_supported_platforms()

def create_platform_config_template() -> Dict[str, Any]:
    """Create a template for platform configuration"""
    return {
        "platforms": {
            "instagram": True,
            "twitter": False,
            "linkedin": False,
            "youtube": False,
            "tiktok": False,
            "facebook": False
        },
        "credentials": {
            "instagram": {
                "IG_USERNAME": "",
                "IG_PASSWORD": ""
            },
            "twitter": {
                "TWITTER_API_KEY": "",
                "TWITTER_API_SECRET": "",
                "TWITTER_ACCESS_TOKEN": "",
                "TWITTER_ACCESS_SECRET": ""
            },
            "linkedin": {
                "LINKEDIN_USERNAME": "",
                "LINKEDIN_PASSWORD": ""
            },
            "youtube": {
                "YOUTUBE_CREDENTIALS_FILE": "",
                "YOUTUBE_CHANNEL_ID": ""
            },
            "tiktok": {
                "TIKTOK_USERNAME": "",
                "TIKTOK_PASSWORD": ""
            },
            "facebook": {
                "FACEBOOK_ACCESS_TOKEN": "",
                "FACEBOOK_PAGE_ID": ""
            }
        }
    }

# Example usage
async def example_usage():
    """Example of how to use the multi-platform manager"""
    
    # Client configuration
    config = {
        "platforms": {
            "instagram": True,
            "twitter": True,
            "linkedin": False
        },
        "IG_USERNAME": "username",
        "IG_PASSWORD": "password",
        "TWITTER_API_KEY": "api_key",
        "TWITTER_API_SECRET": "api_secret",
        "TWITTER_ACCESS_TOKEN": "access_token",
        "TWITTER_ACCESS_SECRET": "access_secret"
    }
    
    # Create manager
    manager = MultiPlatformManager("test_client", config)
    
    # Authenticate
    auth_results = await manager.authenticate_all()
    print(f"Authentication results: {auth_results}")
    
    # Post to multiple platforms
    results = await manager.post_to_platforms(
        file_path="/path/to/content.jpg",
        content_type="photo",
        caption="Check out this amazing content! #hashtag",
        platforms=["instagram", "twitter"]
    )
    
    print(f"Posting results: {results}")

if __name__ == "__main__":
    asyncio.run(example_usage())
