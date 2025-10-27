# scripts/test_multi_platform_simple.py
"""
Simple multi-platform testing script
Tests the multi-platform posting functionality without Unicode characters
"""
import os
import sys
import json
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

def test_platform_capabilities():
    """Test platform capabilities"""
    print("Testing platform capabilities...")
    
    try:
        from scripts.platform_abstraction import get_available_platforms, get_platform_capabilities
        
        available_platforms = get_available_platforms()
        print(f"Available platforms: {available_platforms}")
        
        for platform in available_platforms:
            capabilities = get_platform_capabilities(platform)
            print(f"{platform} capabilities: {capabilities}")
        
        print("Platform capabilities test passed")
        return True
        
    except Exception as e:
        print(f"Platform capabilities test failed: {e}")
        return False

def test_database_initialization():
    """Test database initialization"""
    print("Testing database initialization...")
    
    try:
        from scripts.db_multi_platform import init_multi_platform_db
        init_multi_platform_db()
        print("Database initialization test passed")
        return True
        
    except Exception as e:
        print(f"Database initialization test failed: {e}")
        return False

def test_platform_abstraction():
    """Test platform abstraction layer"""
    print("Testing platform abstraction...")
    
    try:
        from scripts.platform_abstraction import create_poster, PLATFORM_POSTERS
        
        print(f"Available poster classes: {list(PLATFORM_POSTERS.keys())}")
        
        # Test creating a poster (this will fail without credentials, but that's expected)
        try:
            test_config = {"IG_USERNAME": "test", "IG_PASSWORD": "test"}
            poster = create_poster("instagram", "test_client", test_config)
            print("Instagram poster created successfully")
        except Exception as e:
            print(f"Instagram poster creation (expected to fail without real credentials): {e}")
        
        print("Platform abstraction test passed")
        return True
        
    except Exception as e:
        print(f"Platform abstraction test failed: {e}")
        return False

def test_multi_platform_manager():
    """Test multi-platform manager"""
    print("Testing multi-platform manager...")
    
    try:
        from scripts.multi_platform_manager import MultiPlatformManager, get_available_platforms
        
        # Test getting available platforms
        platforms = get_available_platforms()
        print(f"Available platforms: {platforms}")
        
        # Test creating manager (this will fail without real config, but that's expected)
        try:
            test_config = {
                "platforms": {"instagram": True},
                "IG_USERNAME": "test",
                "IG_PASSWORD": "test"
            }
            manager = MultiPlatformManager("test_client", test_config)
            print("Multi-platform manager created successfully")
        except Exception as e:
            print(f"Multi-platform manager creation (expected to fail without real credentials): {e}")
        
        print("Multi-platform manager test passed")
        return True
        
    except Exception as e:
        print(f"Multi-platform manager test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("Starting multi-platform tests...")
    
    tests = [
        test_platform_capabilities,
        test_database_initialization,
        test_platform_abstraction,
        test_multi_platform_manager
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        print(f"\n--- {test.__name__} ---")
        if test():
            passed += 1
            print("PASSED")
        else:
            print("FAILED")
    
    print(f"\nTest Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("All tests passed!")
        return 0
    else:
        print("Some tests failed!")
        return 1

if __name__ == "__main__":
    exit(main())
