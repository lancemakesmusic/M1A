# scripts/setup_multi_platform.py
"""
Multi-platform setup and configuration tool
Helps configure clients for multiple social media platforms
"""
import os
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List
import getpass

# Import database modules
import sys
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from scripts.db_multi_platform import init_multi_platform_db, add_client_platform, get_client_platforms
from scripts.multi_platform_manager import get_available_platforms, create_platform_config_template

class MultiPlatformSetup:
    """Multi-platform setup and configuration"""
    
    def __init__(self):
        self.project_root = PROJECT_ROOT
        self.config_dir = self.project_root / "config"
        self.clients_dir = self.config_dir / "clients"
        
    def initialize_database(self):
        """Initialize multi-platform database"""
        print("Initializing multi-platform database...")
        try:
            init_multi_platform_db()
            print("Multi-platform database initialized successfully")
        except Exception as e:
            print(f"Failed to initialize database: {e}")
            return False
        return True
    
    def create_client_config(self, client_name: str, platforms: List[str] = None) -> bool:
        """Create client configuration for multiple platforms"""
        if platforms is None:
            platforms = ["instagram"]  # Default to Instagram only
        
        print(f"🔧 Creating multi-platform configuration for {client_name}...")
        
        # Create client directory
        client_dir = self.clients_dir / client_name
        client_dir.mkdir(parents=True, exist_ok=True)
        
        # Create base configuration
        config = {
            "name": client_name,
            "created": "2024-01-15T10:30:00Z",
            "platforms": {platform: True for platform in platforms},
            "daily_quota": 10,
            "timezone": "America/New_York",
            "preferred_hours": [11, 15, 19]
        }
        
        # Add platform-specific credentials
        credentials = {}
        
        for platform in platforms:
            print(f"\n📱 Configuring {platform.upper()}...")
            
            if platform == "instagram":
                username = input("Instagram username: ").strip()
                password = getpass.getpass("Instagram password: ")
                credentials.update({
                    "IG_USERNAME": username,
                    "IG_PASSWORD": password
                })
            
            elif platform == "twitter":
                api_key = input("Twitter API Key: ").strip()
                api_secret = getpass.getpass("Twitter API Secret: ")
                access_token = input("Twitter Access Token: ").strip()
                access_secret = getpass.getpass("Twitter Access Secret: ")
                credentials.update({
                    "TWITTER_API_KEY": api_key,
                    "TWITTER_API_SECRET": api_secret,
                    "TWITTER_ACCESS_TOKEN": access_token,
                    "TWITTER_ACCESS_SECRET": access_secret
                })
            
            elif platform == "linkedin":
                username = input("LinkedIn username/email: ").strip()
                password = getpass.getpass("LinkedIn password: ")
                credentials.update({
                    "LINKEDIN_USERNAME": username,
                    "LINKEDIN_PASSWORD": password
                })
            
            elif platform == "youtube":
                credentials_file = input("YouTube credentials file path: ").strip()
                channel_id = input("YouTube Channel ID: ").strip()
                credentials.update({
                    "YOUTUBE_CREDENTIALS_FILE": credentials_file,
                    "YOUTUBE_CHANNEL_ID": channel_id
                })
            
            elif platform == "tiktok":
                username = input("TikTok username: ").strip()
                password = getpass.getpass("TikTok password: ")
                credentials.update({
                    "TIKTOK_USERNAME": username,
                    "TIKTOK_PASSWORD": password
                })
            
            elif platform == "facebook":
                access_token = input("Facebook Access Token: ").strip()
                page_id = input("Facebook Page ID: ").strip()
                credentials.update({
                    "FACEBOOK_ACCESS_TOKEN": access_token,
                    "FACEBOOK_PAGE_ID": page_id
                })
        
        # Merge credentials into config
        config.update(credentials)
        
        # Save client configuration
        config_file = client_dir / "client.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2)
        
        # Add client platforms to database
        for platform in platforms:
            try:
                add_client_platform(client_name, platform, credentials)
                print(f"✅ Added {platform} platform for {client_name}")
            except Exception as e:
                print(f"⚠️ Failed to add {platform} platform: {e}")
        
        print(f"✅ Client configuration created: {config_file}")
        return True
    
    def list_available_platforms(self):
        """List all available platforms"""
        platforms = get_available_platforms()
        print("Available platforms:")
        for platform in platforms:
            print(f"  - {platform}")
    
    def list_client_platforms(self, client_name: str):
        """List platforms for a client"""
        try:
            platforms = get_client_platforms(client_name)
            if not platforms:
                print(f"No platforms configured for {client_name}")
                return
            
            print(f"📱 Platforms for {client_name}:")
            for platform in platforms:
                status = "✅ Enabled" if platform["enabled"] else "❌ Disabled"
                print(f"  - {platform['platform']} ({platform['display_name']}) - {status}")
                
        except Exception as e:
            print(f"❌ Error listing platforms: {e}")
    
    def test_platform_connection(self, client_name: str, platform: str):
        """Test connection to a specific platform"""
        print(f"🔍 Testing {platform} connection for {client_name}...")
        
        try:
            # Load client configuration
            config_file = self.clients_dir / client_name / "client.json"
            if not config_file.exists():
                print(f"❌ Client configuration not found: {config_file}")
                return False
            
            with open(config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Test platform connection
            from multi_platform_manager import MultiPlatformManager
            
            manager = MultiPlatformManager(client_name, config)
            
            # This would require async execution in a real scenario
            print(f"⚠️ Platform testing requires async execution")
            print(f"Use: python scripts/multi_platform_runner.py --client {client_name} --dry-run")
            
            return True
            
        except Exception as e:
            print(f"❌ Platform test failed: {e}")
            return False
    
    def create_content_structure(self, client_name: str):
        """Create content directory structure for multi-platform posting"""
        print(f"📁 Creating content structure for {client_name}...")
        
        content_dir = self.project_root / "content" / client_name
        
        # Create platform-specific directories
        platforms = ["instagram", "twitter", "linkedin", "youtube", "tiktok", "facebook"]
        content_types = ["photos", "videos", "stories"]
        
        for platform in platforms:
            for content_type in content_types:
                dir_path = content_dir / platform / content_type
                dir_path.mkdir(parents=True, exist_ok=True)
                print(f"  Created: {dir_path}")
        
        # Create a README file
        readme_content = f"""# Content Structure for {client_name}

## Directory Structure
```
content/{client_name}/
├── instagram/
│   ├── photos/     # Instagram feed posts
│   ├── videos/     # Instagram Reels
│   └── stories/    # Instagram Stories
├── twitter/
│   ├── photos/     # Twitter images
│   └── videos/     # Twitter videos
├── linkedin/
│   ├── photos/     # LinkedIn posts
│   └── videos/     # LinkedIn videos
├── youtube/
│   └── videos/     # YouTube Shorts
├── tiktok/
│   └── videos/     # TikTok videos
└── facebook/
    ├── photos/     # Facebook posts
    ├── videos/     # Facebook videos
    └── stories/    # Facebook Stories
```

## Usage
1. Place your content files in the appropriate platform/content_type directory
2. The file watcher will automatically detect new files
3. Content will be posted to the corresponding platform(s)
4. Use the multi-platform runner to process jobs

## Supported File Formats
- Photos: JPG, JPEG, PNG
- Videos: MP4, MOV, AVI
- Stories: JPG, JPEG, PNG, MP4, MOV
"""
        
        readme_file = content_dir / "README.md"
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print(f"✅ Content structure created: {content_dir}")
        return True

def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(description="Multi-platform setup tool")
    parser.add_argument("--init-db", action="store_true", help="Initialize multi-platform database")
    parser.add_argument("--create-client", help="Create client configuration")
    parser.add_argument("--platforms", nargs="+", help="Platforms to configure")
    parser.add_argument("--list-platforms", action="store_true", help="List available platforms")
    parser.add_argument("--list-client-platforms", help="List platforms for a client")
    parser.add_argument("--test-platform", nargs=2, metavar=("CLIENT", "PLATFORM"), help="Test platform connection")
    parser.add_argument("--create-content-structure", help="Create content structure for client")
    
    args = parser.parse_args()
    
    setup = MultiPlatformSetup()
    
    if args.init_db:
        setup.initialize_database()
    
    elif args.create_client:
        platforms = args.platforms or ["instagram"]
        setup.create_client_config(args.create_client, platforms)
    
    elif args.list_platforms:
        setup.list_available_platforms()
    
    elif args.list_client_platforms:
        setup.list_client_platforms(args.list_client_platforms)
    
    elif args.test_platform:
        client, platform = args.test_platform
        setup.test_platform_connection(client, platform)
    
    elif args.create_content_structure:
        setup.create_content_structure(args.create_content_structure)
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
