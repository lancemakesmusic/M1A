#!/usr/bin/env python3
"""
Post Executor Service
Handles actual posting to social media platforms
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import base64
import tempfile
import mimetypes
import urllib.request

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger(__name__)

class PostExecutor:
    """Executes posts to social media platforms"""
    
    def __init__(self):
        self.platform_clients = {}
        self._load_credentials()
    
    def _load_credentials(self):
        """Load platform credentials from environment or config"""
        # Try to load from .env
        self.instagram_username = os.getenv("IG_USERNAME")
        self.instagram_password = os.getenv("IG_PASSWORD")
        self.twitter_api_key = os.getenv("TWITTER_API_KEY")
        self.twitter_api_secret = os.getenv("TWITTER_API_SECRET")
        self.twitter_access_token = os.getenv("TWITTER_ACCESS_TOKEN")
        self.twitter_access_secret = os.getenv("TWITTER_ACCESS_SECRET")
        
        # Check if credentials are available
        self.instagram_available = bool(self.instagram_username and self.instagram_password)
        self.twitter_available = bool(
            self.twitter_api_key and self.twitter_api_secret and 
            self.twitter_access_token and self.twitter_access_secret
        )
        
        logger.info(f"Instagram available: {self.instagram_available}")
        logger.info(f"Twitter available: {self.twitter_available}")

    def _load_platform_config(self) -> Dict[str, Any]:
        return {
            "IG_USERNAME": os.getenv("IG_USERNAME"),
            "IG_PASSWORD": os.getenv("IG_PASSWORD"),
            "IG_2FA_CODE": os.getenv("IG_2FA_CODE"),
            "TWITTER_API_KEY": os.getenv("TWITTER_API_KEY"),
            "TWITTER_API_SECRET": os.getenv("TWITTER_API_SECRET"),
            "TWITTER_ACCESS_TOKEN": os.getenv("TWITTER_ACCESS_TOKEN"),
            "TWITTER_ACCESS_SECRET": os.getenv("TWITTER_ACCESS_SECRET"),
            "FACEBOOK_ACCESS_TOKEN": os.getenv("FACEBOOK_ACCESS_TOKEN"),
            "FACEBOOK_PAGE_ID": os.getenv("FACEBOOK_PAGE_ID"),
            "LINKEDIN_USERNAME": os.getenv("LINKEDIN_USERNAME"),
            "LINKEDIN_PASSWORD": os.getenv("LINKEDIN_PASSWORD"),
            "YOUTUBE_CREDENTIALS_FILE": os.getenv("YOUTUBE_CREDENTIALS_FILE"),
            "YOUTUBE_CHANNEL_ID": os.getenv("YOUTUBE_CHANNEL_ID"),
            "TIKTOK_USERNAME": os.getenv("TIKTOK_USERNAME"),
            "TIKTOK_PASSWORD": os.getenv("TIKTOK_PASSWORD"),
        }

    def _infer_media_kind(self, file_path: str, mime_type: Optional[str] = None) -> str:
        if mime_type and mime_type.startswith("video/"):
            return "video"
        if mime_type and mime_type.startswith("image/"):
            return "photo"
        ext = Path(file_path).suffix.lower()
        if ext in [".mp4", ".mov", ".avi", ".mkv"]:
            return "video"
        return "photo"

    def _is_safe_local_path(self, file_path: str) -> bool:
        try:
            resolved = Path(file_path).expanduser().resolve()
        except Exception:
            return False

        temp_dir = Path(tempfile.gettempdir()).resolve()
        try:
            resolved.relative_to(PROJECT_ROOT)
            return True
        except Exception:
            pass

        try:
            resolved.relative_to(temp_dir)
            return True
        except Exception:
            return False

    def _resolve_media_file(self, image_url: Optional[str]) -> Optional[Dict[str, Any]]:
        if not image_url:
            return None

        if image_url.startswith("data:"):
            header, encoded = image_url.split(",", 1)
            mime_type = header.split(";")[0].replace("data:", "")
            extension = mimetypes.guess_extension(mime_type) or ".jpg"
            data = base64.b64decode(encoded)
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
            tmp.write(data)
            tmp.close()
            return {"path": tmp.name, "temp": True, "mime": mime_type}

        if image_url.startswith("http://") or image_url.startswith("https://"):
            extension = Path(image_url.split("?")[0]).suffix or ".jpg"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=extension)
            tmp.close()
            urllib.request.urlretrieve(image_url, tmp.name)
            mime_type, _ = mimetypes.guess_type(tmp.name)
            return {"path": tmp.name, "temp": True, "mime": mime_type}

        if image_url.startswith("file://"):
            file_path = image_url.replace("file://", "")
            if not self._is_safe_local_path(file_path) or not Path(file_path).exists():
                logger.warning("Rejected unsafe or missing local media path.")
                return None
            mime_type, _ = mimetypes.guess_type(file_path)
            return {"path": file_path, "temp": False, "mime": mime_type}

        if not self._is_safe_local_path(image_url) or not Path(image_url).exists():
            logger.warning("Rejected unsafe or missing local media path.")
            return None
        mime_type, _ = mimetypes.guess_type(image_url)
        return {"path": image_url, "temp": False, "mime": mime_type}
    
    async def execute_post(self, post: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a post to selected platforms
        
        Args:
            post: Post data with content, platforms, imageUrl, etc.
            
        Returns:
            Dict with execution results for each platform
        """
        results = {
            "postId": post.get("id"),
            "success": False,
            "platforms": {},
            "errors": []
        }
        
        content = post.get("content", "")
        image_url = post.get("imageUrl")
        platforms = post.get("platforms", {})
        
        # Process each selected platform
        for platform, enabled in platforms.items():
            if not enabled:
                continue
            
            try:
                if platform == "instagram":
                    result = await self._post_to_instagram(content, image_url)
                    results["platforms"]["instagram"] = result
                elif platform == "twitter":
                    result = await self._post_to_twitter(content, image_url)
                    results["platforms"]["twitter"] = result
                elif platform == "facebook":
                    result = await self._post_to_facebook(content, image_url)
                    results["platforms"]["facebook"] = result
                elif platform == "linkedin":
                    result = await self._post_to_linkedin(content, image_url)
                    results["platforms"]["linkedin"] = result
                else:
                    results["platforms"][platform] = {
                        "success": False,
                        "error": f"Platform {platform} not yet implemented"
                    }
            except Exception as e:
                logger.error(f"Error posting to {platform}: {e}")
                results["platforms"][platform] = {
                    "success": False,
                    "error": str(e)
                }
                results["errors"].append(f"{platform}: {str(e)}")
        
        # Overall success if at least one platform succeeded
        results["success"] = any(
            r.get("success", False) 
            for r in results["platforms"].values()
        )
        
        return results
    
    async def _post_to_instagram(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to Instagram"""
        if not self.instagram_available:
            return {
                "success": False,
                "error": "Instagram credentials not configured. Add IG_USERNAME and IG_PASSWORD to .env"
            }

        media = self._resolve_media_file(image_url)
        if not media:
            return {
                "success": False,
                "error": "Instagram requires an image or video. Please upload media first."
            }

        try:
            from scripts.platform_abstraction import create_poster, PlatformError
            poster = create_poster("instagram", "default", self._load_platform_config())
            await poster.authenticate()
            media_kind = self._infer_media_kind(media["path"], media.get("mime"))
            if media_kind == "video":
                result = await poster.post_video(media["path"], caption=content)
            else:
                result = await poster.post_photo(media["path"], caption=content)
            return {
                "success": True,
                "platform": "instagram",
                "post_id": result.get("post_id"),
                "url": result.get("url"),
                "message": "Posted successfully to Instagram"
            }
        except PlatformError as e:
            return {
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Instagram posting error: {e}")
            return {
                "success": False,
                "error": f"Instagram posting failed: {str(e)}"
            }
        finally:
            if media and media.get("temp"):
                try:
                    os.unlink(media["path"])
                except Exception:
                    pass
    
    async def _post_to_twitter(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to Twitter/X"""
        if not self.twitter_available:
            return {
                "success": False,
                "error": "Twitter credentials not configured. Add TWITTER_API_KEY, etc. to .env"
            }
        
        media = self._resolve_media_file(image_url)
        try:
            import tweepy

            auth = tweepy.OAuth1UserHandler(
                self.twitter_api_key,
                self.twitter_api_secret,
                self.twitter_access_token,
                self.twitter_access_secret
            )
            api = tweepy.API(auth)

            if media:
                media_kind = self._infer_media_kind(media["path"], media.get("mime"))
                media_obj = api.media_upload(
                    media["path"],
                    media_category="tweet_video" if media_kind == "video" else None
                )
                result = api.update_status(status=content[:280], media_ids=[media_obj.media_id])
            else:
                result = api.update_status(content[:280])  # Twitter limit

            return {
                "success": True,
                "platform": "twitter",
                "post_id": str(result.id),
                "url": f"https://twitter.com/{result.user.screen_name}/status/{result.id}",
                "message": "Posted successfully to Twitter"
            }
        except Exception as e:
            logger.error(f"Twitter posting error: {e}")
            return {
                "success": False,
                "error": f"Twitter posting failed: {str(e)}"
            }
        finally:
            if media and media.get("temp"):
                try:
                    os.unlink(media["path"])
                except Exception:
                    pass
    
    async def _post_to_facebook(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to Facebook"""
        media = self._resolve_media_file(image_url)
        if not media:
            return {
                "success": False,
                "error": "Facebook posting requires a photo or video."
            }
        try:
            from scripts.platform_abstraction import create_poster, PlatformError
            poster = create_poster("facebook", "default", self._load_platform_config())
            await poster.authenticate()
            media_kind = self._infer_media_kind(media["path"], media.get("mime"))
            if media_kind == "video":
                result = await poster.post_video(media["path"], caption=content)
            else:
                result = await poster.post_photo(media["path"], caption=content)
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("post_id"),
                "url": result.get("url"),
                "message": "Posted successfully to Facebook"
            }
        except PlatformError as e:
            return {
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Facebook posting error: {e}")
            return {
                "success": False,
                "error": f"Facebook posting failed: {str(e)}"
            }
        finally:
            if media and media.get("temp"):
                try:
                    os.unlink(media["path"])
                except Exception:
                    pass
    
    async def _post_to_linkedin(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to LinkedIn (text-only for now)"""
        try:
            from linkedin_api import Linkedin
        except ImportError:
            return {
                "success": False,
                "error": "LinkedIn API not available. Install linkedin-api and set LINKEDIN_USERNAME/PASSWORD."
            }

        username = os.getenv("LINKEDIN_USERNAME")
        password = os.getenv("LINKEDIN_PASSWORD")
        if not username or not password:
            return {
                "success": False,
                "error": "LinkedIn credentials not configured. Add LINKEDIN_USERNAME and LINKEDIN_PASSWORD to .env"
            }

        if image_url:
            return {
                "success": False,
                "error": "LinkedIn media posting is not configured yet. Post text-only for now."
            }

        try:
            client = Linkedin(username, password)
            if hasattr(client, "submit_share"):
                result = client.submit_share(commentary=content, visibility="PUBLIC")
            elif hasattr(client, "submit_post"):
                result = client.submit_post(content)
            else:
                return {
                    "success": False,
                    "error": "LinkedIn client does not support posting with this library version."
                }
            post_id = result.get("id") if isinstance(result, dict) else None
            return {
                "success": True,
                "platform": "linkedin",
                "post_id": post_id,
                "url": "https://linkedin.com/feed/",
                "message": "Posted successfully to LinkedIn"
            }
        except Exception as e:
            logger.error(f"LinkedIn posting error: {e}")
            return {
                "success": False,
                "error": f"LinkedIn posting failed: {str(e)}"
            }

# Singleton instance
_executor = None

def get_post_executor() -> PostExecutor:
    """Get singleton post executor instance"""
    global _executor
    if _executor is None:
        _executor = PostExecutor()
    return _executor
















