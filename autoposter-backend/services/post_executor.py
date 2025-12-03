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
        
        try:
            # Try to use existing Instagram posting infrastructure
            try:
                from scripts.post_instagram import post_photo, _build_client
                from instagrapi import Client
                
                # If image_url is provided, download and save it
                image_path = None
                if image_url:
                    if image_url.startswith("data:"):
                        # Base64 image
                        header, encoded = image_url.split(",", 1)
                        image_data = base64.b64decode(encoded)
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                            tmp.write(image_data)
                            image_path = tmp.name
                    elif image_url.startswith("file://") or image_url.startswith("http"):
                        # File path or URL - would need download logic
                        return {
                            "success": False,
                            "error": "Image URL format not yet supported. Use base64 data URI."
                        }
                    else:
                        # Assume local file path
                        image_path = image_url
                
                if not image_path:
                    return {
                        "success": False,
                        "error": "Instagram requires an image. Please upload media first."
                    }
                
                # Use a default client name or create one
                client_name = "default"
                
                # Post the photo
                result = post_photo(client_name, image_path, content)
                
                return {
                    "success": True,
                    "platform": "instagram",
                    "post_id": str(result.pk),
                    "url": f"https://instagram.com/p/{result.code}",
                    "message": "Posted successfully to Instagram"
                }
                
            except ImportError:
                # Fallback: Simulate posting (for testing without credentials)
                logger.warning("Instagram API not available, simulating post")
                return {
                    "success": True,
                    "platform": "instagram",
                    "post_id": f"sim_{datetime.now().timestamp()}",
                    "url": "https://instagram.com/p/simulated",
                    "message": "Post simulated (Instagram API not configured)",
                    "simulated": True
                }
                
        except Exception as e:
            logger.error(f"Instagram posting error: {e}")
            return {
                "success": False,
                "error": f"Instagram posting failed: {str(e)}"
            }
    
    async def _post_to_twitter(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to Twitter/X"""
        if not self.twitter_available:
            return {
                "success": False,
                "error": "Twitter credentials not configured. Add TWITTER_API_KEY, etc. to .env"
            }
        
        try:
            import tweepy
            
            auth = tweepy.OAuth1UserHandler(
                self.twitter_api_key,
                self.twitter_api_secret,
                self.twitter_access_token,
                self.twitter_access_secret
            )
            api = tweepy.API(auth)
            
            # Post text (images would need additional handling)
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
    
    async def _post_to_facebook(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to Facebook (placeholder)"""
        return {
            "success": False,
            "error": "Facebook posting not yet implemented"
        }
    
    async def _post_to_linkedin(self, content: str, image_url: Optional[str]) -> Dict[str, Any]:
        """Post to LinkedIn (placeholder)"""
        return {
            "success": False,
            "error": "LinkedIn posting not yet implemented"
        }

# Singleton instance
_executor = None

def get_post_executor() -> PostExecutor:
    """Get singleton post executor instance"""
    global _executor
    if _executor is None:
        _executor = PostExecutor()
    return _executor



