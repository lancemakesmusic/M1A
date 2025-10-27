# scripts/demo_multi_platform.py
"""
Multi-platform demonstration script
Shows how to use the multi-platform posting system
"""
import os
import sys
import json
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

def demo_platform_capabilities():
    """Demonstrate platform capabilities"""
    print("=== Multi-Platform Capabilities Demo ===")
    
    try:
        from scripts.platform_abstraction import get_available_platforms, get_platform_capabilities
        
        platforms = get_available_platforms()
        print(f"Available platforms: {platforms}")
        print()
        
        for platform in platforms:
            capabilities = get_platform_capabilities(platform)
            print(f"{platform.upper()}:")
            print(f"  - Supports photos: {capabilities.get('supports_photos', False)}")
            print(f"  - Supports videos: {capabilities.get('supports_videos', False)}")
            print(f"  - Supports stories: {capabilities.get('supports_stories', False)}")
            print()
            
    except Exception as e:
        print(f"Error demonstrating capabilities: {e}")

def demo_database_operations():
    """Demonstrate database operations"""
    print("=== Database Operations Demo ===")
    
    try:
        from scripts.db_multi_platform import (
            init_multi_platform_db, 
            get_platform_post_stats,
            add_client_platform
        )
        
        # Initialize database
        print("Initializing multi-platform database...")
        init_multi_platform_db()
        print("Database initialized successfully!")
        print()
        
        # Get platform statistics
        print("Getting platform statistics...")
        stats = get_platform_post_stats()
        print(f"Total posts: {stats['total']}")
        print(f"Status breakdown: {stats['status_breakdown']}")
        print(f"Platform breakdown: {stats['platform_breakdown']}")
        print()
        
        # Add a test client platform
        print("Adding test client platform...")
        add_client_platform("demo_client", "instagram", {"test": "credentials"})
        print("Test client platform added!")
        print()
        
    except Exception as e:
        print(f"Error demonstrating database operations: {e}")

def demo_multi_platform_manager():
    """Demonstrate multi-platform manager"""
    print("=== Multi-Platform Manager Demo ===")
    
    try:
        from scripts.multi_platform_manager import MultiPlatformManager, get_available_platforms
        
        # Create test configuration
        config = {
            "platforms": {
                "instagram": True,
                "twitter": True,
                "linkedin": False
            },
            "IG_USERNAME": "demo_user",
            "IG_PASSWORD": "demo_password",
            "TWITTER_API_KEY": "demo_key",
            "TWITTER_API_SECRET": "demo_secret",
            "TWITTER_ACCESS_TOKEN": "demo_token",
            "TWITTER_ACCESS_SECRET": "demo_secret"
        }
        
        print("Creating multi-platform manager...")
        manager = MultiPlatformManager("demo_client", config)
        print("Manager created successfully!")
        print()
        
        # Show platform status
        print("Platform status:")
        status = manager.get_platform_status()
        for platform, info in status.items():
            print(f"  {platform}: {info['poster_class']}")
        print()
        
        # Show content type capabilities
        print("Content type capabilities:")
        capabilities = manager.get_supported_content_types()
        for platform, types in capabilities.items():
            print(f"  {platform}: {types}")
        print()
        
    except Exception as e:
        print(f"Error demonstrating multi-platform manager: {e}")

def demo_content_validation():
    """Demonstrate content validation"""
    print("=== Content Validation Demo ===")
    
    try:
        # Create a test content file
        test_content_dir = PROJECT_ROOT / "test_content"
        test_content_dir.mkdir(exist_ok=True)
        
        # Create a simple test image
        from PIL import Image
        test_image = test_content_dir / "demo_image.jpg"
        img = Image.new('RGB', (100, 100), color='blue')
        img.save(test_image)
        print(f"Created test image: {test_image}")
        
        # Test content validation
        from scripts.multi_platform_manager import MultiPlatformManager
        
        config = {
            "platforms": {"instagram": True, "twitter": True, "linkedin": True}
        }
        
        manager = MultiPlatformManager("demo_client", config)
        
        print("Testing content validation...")
        validation_results = manager.validate_content(str(test_image), "photo")
        print(f"Validation results: {validation_results}")
        print()
        
        # Clean up test content
        test_image.unlink()
        test_content_dir.rmdir()
        print("Test content cleaned up!")
        
    except Exception as e:
        print(f"Error demonstrating content validation: {e}")

def demo_api_endpoints():
    """Demonstrate API endpoints"""
    print("=== API Endpoints Demo ===")
    
    try:
        from scripts.multi_platform_manager import get_available_platforms
        
        print("Available API endpoints:")
        print("  GET  /api/v1/multi-platform/platforms")
        print("  GET  /api/v1/multi-platform/clients/{client}/platforms")
        print("  POST /api/v1/multi-platform/post")
        print("  GET  /api/v1/multi-platform/stats")
        print("  POST /api/v1/multi-platform/clients/{client}/test-connection")
        print()
        
        platforms = get_available_platforms()
        print(f"Platforms available via API: {platforms}")
        print()
        
        print("To start the API server:")
        print("  python -m uvicorn api.main:app --host 0.0.0.0 --port 8000")
        print("  Then visit: http://localhost:8000/docs")
        print()
        
    except Exception as e:
        print(f"Error demonstrating API endpoints: {e}")

def main():
    """Run all demonstrations"""
    print("M1Autoposter Multi-Platform System Demo")
    print("=" * 50)
    print()
    
    # Run all demos
    demos = [
        demo_platform_capabilities,
        demo_database_operations,
        demo_multi_platform_manager,
        demo_content_validation,
        demo_api_endpoints
    ]
    
    for demo in demos:
        try:
            demo()
            print("-" * 50)
            print()
        except Exception as e:
            print(f"Demo failed: {e}")
            print("-" * 50)
            print()
    
    print("Demo completed!")
    print()
    print("Next steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Configure real credentials for your platforms")
    print("3. Create a client: python scripts/setup_multi_platform.py --create-client 'MyBrand'")
    print("4. Start posting: python scripts/multi_platform_runner.py --client 'MyBrand'")

if __name__ == "__main__":
    main()
