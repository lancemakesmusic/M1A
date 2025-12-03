#!/usr/bin/env python3
"""Test AI content generation"""
import asyncio
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
load_dotenv('.env')

# Import AI generator
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util

spec = importlib.util.spec_from_file_location("ai_content_generator", Path("services/ai_content_generator.py"))
ai_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ai_module)

gen = ai_module.get_ai_generator()

async def test():
    print("Testing AI Content Generation...")
    print(f"AI Available: {gen.is_available()}")
    print(f"Using OpenAI: {gen.use_openai}")
    print(f"API Key loaded: {'Yes' if gen.openai_api_key else 'No'}")
    print()
    
    result = await gen.generate_content(
        prompt="Exciting new music release",
        content_type="post",
        platform="instagram",
        brand_voice="energetic",
        target_audience="music fans"
    )
    
    print("Result:")
    print(f"  Success: {result.get('success')}")
    print(f"  Message: {result.get('message')}")
    print(f"  Model: {result.get('model', 'unknown')}")
    print()
    print("Content:")
    print(result.get('content', 'No content'))
    print()

if __name__ == "__main__":
    asyncio.run(test())



