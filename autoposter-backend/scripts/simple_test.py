# scripts/simple_test.py
"""
Simple test script for multi-platform functionality
Tests core functionality without Unicode characters
"""
import os
import sys
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")
    
    try:
        from scripts.platform_abstraction import get_available_platforms
        print("OK Platform abstraction imported")
        
        from scripts.db_multi_platform import init_multi_platform_db
        print("OK Database module imported")
        
        from scripts.multi_platform_manager import MultiPlatformManager
        print("OK Multi-platform manager imported")
        
        return True
    except Exception as e:
        print(f"ERROR Import error: {e}")
        return False

def test_platforms():
    """Test platform discovery"""
    print("\nTesting platform discovery...")
    
    try:
        from scripts.platform_abstraction import get_available_platforms
        
        platforms = get_available_platforms()
        print(f"Found {len(platforms)} platforms: {platforms}")
        
        expected_platforms = ['instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'facebook']
        for platform in expected_platforms:
            if platform in platforms:
                print(f"  OK {platform}")
            else:
                print(f"  MISSING {platform}")
        
        return len(platforms) == 6
    except Exception as e:
        print(f"ERROR Platform discovery error: {e}")
        return False

def test_database():
    """Test database operations"""
    print("\nTesting database operations...")
    
    try:
        from scripts.db_multi_platform import init_multi_platform_db, get_platform_post_stats
        
        # Initialize database
        init_multi_platform_db()
        print("OK Database initialized")
        
        # Get stats
        stats = get_platform_post_stats()
        print(f"OK Database stats retrieved: {stats}")
        
        return True
    except Exception as e:
        print(f"ERROR Database error: {e}")
        return False

def test_manager():
    """Test multi-platform manager creation"""
    print("\nTesting multi-platform manager...")
    
    try:
        from scripts.multi_platform_manager import MultiPlatformManager
        
        # Create test configuration
        config = {
            "platforms": {
                "instagram": True,
                "twitter": True
            },
            "IG_USERNAME": "test",
            "IG_PASSWORD": "test",
            "TWITTER_API_KEY": "test",
            "TWITTER_API_SECRET": "test",
            "TWITTER_ACCESS_TOKEN": "test",
            "TWITTER_ACCESS_SECRET": "test"
        }
        
        # Create manager
        manager = MultiPlatformManager("test_client", config)
        print("OK Multi-platform manager created")
        
        # Test platform status
        status = manager.get_platform_status()
        print(f"OK Platform status: {len(status)} platforms configured")
        
        return True
    except Exception as e:
        print(f"ERROR Manager creation error: {e}")
        return False

def test_files():
    """Test required files exist"""
    print("\nTesting file structure...")
    
    required_files = [
        "scripts/platform_abstraction.py",
        "scripts/multi_platform_manager.py", 
        "scripts/db_multi_platform.py",
        "scripts/setup_multi_platform.py",
        "api/main.py",
        "api/multi_platform_api.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = PROJECT_ROOT / file_path
        if full_path.exists():
            print(f"OK {file_path}")
        else:
            print(f"MISSING {file_path}")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def main():
    """Run all tests"""
    print("M1Autoposter Multi-Platform Test")
    print("=" * 50)
    
    tests = [
        ("File Structure", test_files),
        ("Imports", test_imports),
        ("Platform Discovery", test_platforms),
        ("Database Operations", test_database),
        ("Multi-Platform Manager", test_manager)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        if test_func():
            passed += 1
            print(f"PASSED {test_name}")
        else:
            print(f"FAILED {test_name}")
    
    print(f"\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("SUCCESS! Multi-platform system is ready!")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Configure credentials: python scripts/setup_multi_platform.py --create-client 'MyBrand'")
        print("3. Start API server: python -m uvicorn api.main:app --host 0.0.0.0 --port 8000")
        print("4. Test API: http://localhost:8000/docs")
        return 0
    else:
        print("FAILED. Some tests failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    exit(main())
