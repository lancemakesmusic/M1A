#!/usr/bin/env python3
"""
Test script for the AutoPoster API
"""

import requests
import json
import time

def test_api():
    base_url = "http://localhost:8000"
    
    print("🧪 Testing M1A AutoPoster API...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/api/health", timeout=5)
        print(f"✅ Health check: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test content generation
    try:
        data = {
            "prompt": "Test prompt for content generation",
            "content_type": "post",
            "platform": "instagram",
            "brand_voice": "professional",
            "target_audience": "general"
        }
        response = requests.post(f"{base_url}/api/generate-content", json=data, timeout=10)
        print(f"✅ Content generation: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Content generation failed: {e}")
        return False
    
    # Test scheduled posts
    try:
        response = requests.get(f"{base_url}/api/scheduled-posts", timeout=5)
        print(f"✅ Scheduled posts: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Scheduled posts failed: {e}")
        return False
    
    print("🎉 All API tests passed!")
    return True

if __name__ == "__main__":
    print("Waiting 3 seconds for server to start...")
    time.sleep(3)
    test_api()
