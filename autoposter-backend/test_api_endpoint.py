#!/usr/bin/env python3
"""Test the API endpoint directly"""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv('.env')

# Add to path
sys.path.insert(0, str(Path(__file__).parent))

# Import the endpoint function directly
from api.main import generate_content
from api.main import ContentGenerationRequest

async def test():
    request = ContentGenerationRequest(
        prompt="Test AI generation",
        content_type="post",
        platform="instagram",
        brand_voice="professional",
        target_audience="general"
    )
    
    print("Calling generate_content endpoint...")
    result = await generate_content(request)
    
    print(f"\nResult:")
    print(f"  Success: {result.success}")
    print(f"  Message: {result.message}")
    print(f"\nContent (first 300 chars):")
    print(result.content[:300])
    print("\n" + "="*50)
    
    # Check if it's AI or template
    if "This is a professionally generated post based" in result.content:
        print("⚠️ Using TEMPLATE")
    elif "🎶" in result.content or "🔥" in result.content:
        print("✅ Using AI!")
    else:
        print("❓ Unknown format")

if __name__ == "__main__":
    asyncio.run(test())



