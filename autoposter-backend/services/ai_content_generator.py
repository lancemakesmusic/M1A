#!/usr/bin/env python3
"""
AI Content Generator Service
Integrates with OpenAI/Anthropic for real content generation
"""

import os
import httpx
from typing import Optional, Dict, Any
import json
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # python-dotenv not available
except Exception:
    pass  # Error loading .env, continue anyway

class AIContentGenerator:
    """AI Content Generation Service"""
    
    def __init__(self):
        # Ensure .env is loaded
        try:
            from dotenv import load_dotenv
            # Try multiple possible .env locations
            env_paths = [
                Path(__file__).parent.parent / ".env",
                Path.cwd() / ".env",
                Path(__file__).parent / ".env"
            ]
            for env_path in env_paths:
                if env_path.exists():
                    load_dotenv(env_path, override=True)
                    break
        except ImportError:
            pass  # python-dotenv not available
        except Exception:
            pass  # Error loading .env
        
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.use_openai = bool(self.openai_api_key)
        self.use_anthropic = bool(self.anthropic_api_key) and not self.use_openai
        
        # Debug output
        if self.use_openai:
            print(f"[AI] OpenAI API key loaded (length: {len(self.openai_api_key) if self.openai_api_key else 0})")
        elif self.use_anthropic:
            print(f"[AI] Anthropic API key loaded")
        else:
            print("[AI] No AI API keys found")
        
    def is_available(self) -> bool:
        """Check if AI service is available"""
        return self.use_openai or self.use_anthropic
    
    async def generate_content(
        self,
        prompt: str,
        content_type: str,
        platform: str,
        brand_voice: str = "professional",
        target_audience: str = "general"
    ) -> Dict[str, Any]:
        """
        Generate content using AI
        
        Args:
            prompt: User's prompt/request
            content_type: Type of content (post, story, reel, etc.)
            platform: Social media platform (instagram, facebook, twitter, etc.)
            brand_voice: Brand voice/tone
            target_audience: Target audience description
            
        Returns:
            Dict with generated content and metadata
        """
        if not self.is_available():
            return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
        
        if self.use_openai:
            return await self._generate_with_openai(prompt, content_type, platform, brand_voice, target_audience)
        elif self.use_anthropic:
            return await self._generate_with_anthropic(prompt, content_type, platform, brand_voice, target_audience)
        else:
            return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
    
    async def _generate_with_openai(
        self,
        prompt: str,
        content_type: str,
        platform: str,
        brand_voice: str,
        target_audience: str
    ) -> Dict[str, Any]:
        """Generate content using OpenAI API"""
        try:
            system_prompt = self._create_system_prompt(content_type, platform, brand_voice, target_audience)
            user_prompt = self._create_user_prompt(prompt, content_type, platform)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openai_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o-mini",  # Cost-effective and fast
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.8,  # More creative
                        "top_p": 1.0,
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    return {
                        "success": True,
                        "content": content,
                        "model": "gpt-4o-mini",
                        "usage": data.get("usage", {}),
                        "message": "Content generated successfully with OpenAI"
                    }
                else:
                    error_msg = f"OpenAI API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        error_msg = error_data.get("error", {}).get("message", error_msg)
                    except:
                        pass
                    
                    # Fallback to template if API fails
                    return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
                    
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            # Fallback to template
            return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
    
    async def _generate_with_anthropic(
        self,
        prompt: str,
        content_type: str,
        platform: str,
        brand_voice: str,
        target_audience: str
    ) -> Dict[str, Any]:
        """Generate content using Anthropic Claude API"""
        try:
            system_prompt = self._create_system_prompt(content_type, platform, brand_voice, target_audience)
            user_prompt = self._create_user_prompt(prompt, content_type, platform)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": self.anthropic_api_key,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "claude-3-haiku-20240307",  # Fast and cost-effective
                        "max_tokens": 1000,
                        "system": system_prompt,
                        "messages": [
                            {"role": "user", "content": user_prompt}
                        ]
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data["content"][0]["text"]
                    
                    return {
                        "success": True,
                        "content": content,
                        "model": "claude-3-haiku",
                        "usage": data.get("usage", {}),
                        "message": "Content generated successfully with Claude"
                    }
                else:
                    # Fallback to template
                    return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
                    
        except Exception as e:
            print(f"Error calling Anthropic API: {e}")
            # Fallback to template
            return self._generate_fallback_content(prompt, content_type, platform, brand_voice, target_audience)
    
    def _create_system_prompt(
        self,
        content_type: str,
        platform: str,
        brand_voice: str,
        target_audience: str
    ) -> str:
        """Create system prompt for AI"""
        platform_guidelines = {
            "instagram": "Instagram posts should be visually engaging, use emojis strategically, include relevant hashtags (5-10), and be concise (125-150 words ideal). Focus on storytelling and visual appeal.",
            "facebook": "Facebook posts can be longer (200-300 words), more conversational, and include questions to encourage engagement. Use a friendly, community-focused tone.",
            "twitter": "Twitter/X posts must be concise (under 280 characters), punchy, and use trending topics when relevant. Include 1-2 hashtags maximum.",
            "linkedin": "LinkedIn posts should be professional, value-driven, and include insights or thought leadership. Aim for 150-300 words with professional tone.",
            "tiktok": "TikTok captions should be short, catchy, include trending hashtags (3-5), and encourage engagement with questions or calls to action."
        }
        
        platform_guide = platform_guidelines.get(platform.lower(), "Create engaging social media content.")
        
        return f"""You are an expert social media content creator specializing in {content_type} content for {platform}.

Your task is to create high-quality, engaging content that:
- Matches the {brand_voice} brand voice
- Resonates with {target_audience} audience
- Follows {platform} best practices: {platform_guide}
- Includes relevant hashtags when appropriate
- Has a clear call-to-action
- Is authentic and engaging

Generate ONLY the content text - no explanations, no markdown formatting unless specifically requested. Make it ready to post directly."""

    def _create_user_prompt(self, prompt: str, content_type: str, platform: str) -> str:
        """Create user prompt"""
        return f"""Create a {content_type} for {platform} based on this prompt:

"{prompt}"

Make it engaging, authentic, and optimized for {platform}. Include appropriate hashtags and a call-to-action."""

    def _generate_fallback_content(
        self,
        prompt: str,
        content_type: str,
        platform: str,
        brand_voice: str,
        target_audience: str
    ) -> Dict[str, Any]:
        """Generate fallback template content when AI is not available"""
        # Enhanced template with better structure
        hashtags = {
            "instagram": "#content #socialmedia #automation #m1a #creative",
            "facebook": "#content #socialmedia #community",
            "twitter": "#content #socialmedia",
            "linkedin": "#content #professional #networking",
            "tiktok": "#content #viral #trending #fyp"
        }
        
        platform_hashtags = hashtags.get(platform.lower(), "#content #socialmedia")
        
        content = f"""🎯 {content_type.title()} for {platform.title()}

{prompt}

✨ Tailored for {target_audience} with a {brand_voice} tone

{platform_hashtags}

💡 Tip: Add your OpenAI API key to enable AI-powered content generation!"""
        
        return {
            "success": True,
            "content": content,
            "model": "template",
            "message": "Template content generated (AI not configured). Add OPENAI_API_KEY or ANTHROPIC_API_KEY to enable AI generation."
        }

# Singleton instance
_ai_generator = None

def get_ai_generator() -> AIContentGenerator:
    """Get singleton AI generator instance"""
    global _ai_generator
    # Always reload environment and recreate if needed
    try:
        from dotenv import load_dotenv
        env_paths = [
            Path(__file__).parent.parent / ".env",
            Path.cwd() / ".env",
        ]
        for env_path in env_paths:
            if env_path.exists():
                load_dotenv(env_path, override=True)
                break
    except:
        pass
    
    if _ai_generator is None:
        _ai_generator = AIContentGenerator()
    else:
        # Reload API keys in case .env was updated
        import os
        _ai_generator.openai_api_key = os.getenv("OPENAI_API_KEY")
        _ai_generator.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        _ai_generator.use_openai = bool(_ai_generator.openai_api_key)
        _ai_generator.use_anthropic = bool(_ai_generator.anthropic_api_key) and not _ai_generator.use_openai
    
    return _ai_generator

