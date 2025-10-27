# Multi-Platform Social Media Posting Guide

## Overview

The M1Autoposter now supports posting to multiple popular social media platforms simultaneously. This guide covers setup, configuration, and usage of the multi-platform posting system.

## Supported Platforms

### ✅ Currently Supported
- **Instagram** - Feed posts, Reels, Stories
- **Twitter/X** - Images, Videos, Text posts
- **LinkedIn** - Professional posts, Videos
- **YouTube** - Shorts (videos only)
- **TikTok** - Short videos
- **Facebook** - Posts, Videos, Stories

### 📱 Platform Capabilities

| Platform | Photos | Videos | Stories | Text Posts |
|----------|--------|--------|---------|------------|
| Instagram | ✅ | ✅ | ✅ | ✅ |
| Twitter/X | ✅ | ✅ | ❌ | ✅ |
| LinkedIn | ✅ | ✅ | ❌ | ✅ |
| YouTube | ❌ | ✅ | ❌ | ❌ |
| TikTok | ❌ | ✅ | ❌ | ✅ |
| Facebook | ✅ | ✅ | ✅ | ✅ |

## Quick Start

### 1. Initialize Multi-Platform Database

```bash
# Initialize the multi-platform database schema
python scripts/setup_multi_platform.py --init-db
```

### 2. Create Multi-Platform Client

```bash
# Create a client with multiple platforms
python scripts/setup_multi_platform.py --create-client "MyBrand" --platforms instagram twitter linkedin
```

### 3. Configure Platform Credentials

The setup script will prompt you for credentials for each platform:

#### Instagram
- Username
- Password
- 2FA code (if enabled)

#### Twitter/X
- API Key
- API Secret
- Access Token
- Access Secret

#### LinkedIn
- Username/Email
- Password

#### YouTube
- Credentials file path
- Channel ID

#### TikTok
- Username
- Password

#### Facebook
- Access Token
- Page ID

### 4. Create Content Structure

```bash
# Create organized content directories
python scripts/setup_multi_platform.py --create-content-structure "MyBrand"
```

This creates:
```
content/MyBrand/
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

### 1. Content Organization

Place your content files in the appropriate directories:

```bash
# Instagram feed post
content/MyBrand/instagram/photos/amazing_photo.jpg

# Cross-platform video
content/MyBrand/instagram/videos/promo_video.mp4
content/MyBrand/twitter/videos/promo_video.mp4
content/MyBrand/facebook/videos/promo_video.mp4
```

### 2. Automatic Posting

The file watcher will automatically detect new files and queue them for posting:

```bash
# Start the multi-platform runner
python scripts/multi_platform_runner.py --client "MyBrand"
```

### 3. Manual Posting

Post content to specific platforms:

```python
from scripts.multi_platform_manager import MultiPlatformManager

# Load client configuration
config = load_client_config("MyBrand")
manager = MultiPlatformManager("MyBrand", config)

# Post to multiple platforms
results = await manager.post_to_platforms(
    file_path="/path/to/content.jpg",
    content_type="photo",
    caption="Check out this amazing content! #hashtag",
    platforms=["instagram", "twitter", "linkedin"]
)
```

## API Usage

### Multi-Platform API Endpoints

#### Get Available Platforms
```bash
GET /api/v1/multi-platform/platforms
```

#### Get Client Platforms
```bash
GET /api/v1/multi-platform/clients/{client_name}/platforms
```

#### Add Platform to Client
```bash
POST /api/v1/multi-platform/clients/{client_name}/platforms
{
    "platform": "instagram",
    "enabled": true,
    "credentials": {
        "IG_USERNAME": "username",
        "IG_PASSWORD": "password"
    }
}
```

#### Post to Multiple Platforms
```bash
POST /api/v1/multi-platform/post
{
    "client": "MyBrand",
    "content_type": "photo",
    "file_path": "/path/to/image.jpg",
    "caption": "Amazing content! #hashtag",
    "platforms": ["instagram", "twitter", "linkedin"]
}
```

#### Get Platform Statistics
```bash
GET /api/v1/multi-platform/stats
```

#### Test Platform Connections
```bash
POST /api/v1/multi-platform/clients/{client_name}/test-connection
```

## Configuration

### Client Configuration File

```json
{
    "name": "MyBrand",
    "platforms": {
        "instagram": true,
        "twitter": true,
        "linkedin": false,
        "youtube": false,
        "tiktok": false,
        "facebook": false
    },
    "daily_quota": 10,
    "timezone": "America/New_York",
    "preferred_hours": [11, 15, 19],
    "IG_USERNAME": "username",
    "IG_PASSWORD": "password",
    "TWITTER_API_KEY": "api_key",
    "TWITTER_API_SECRET": "api_secret",
    "TWITTER_ACCESS_TOKEN": "access_token",
    "TWITTER_ACCESS_SECRET": "access_secret"
}
```

### Platform-Specific Settings

Each platform can have custom settings:

```json
{
    "platform": "instagram",
    "enabled": true,
    "credentials": {
        "IG_USERNAME": "username",
        "IG_PASSWORD": "password"
    },
    "settings": {
        "auto_hashtags": true,
        "max_hashtags": 30,
        "posting_hours": [11, 15, 19]
    }
}
```

## Database Schema

### Multi-Platform Tables

#### Platforms Table
```sql
CREATE TABLE platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

#### Client Platforms Table
```sql
CREATE TABLE client_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT NOT NULL,
    platform TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    credentials TEXT NOT NULL DEFAULT '{}',
    settings TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(client, platform)
);
```

#### Platform Posts Table
```sql
CREATE TABLE platform_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    platform_post_id TEXT,
    platform_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    posted_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(job_id) REFERENCES jobs(id)
);
```

## Best Practices

### 1. Content Optimization

#### Platform-Specific Content
- **Instagram**: High-quality images, engaging captions, relevant hashtags
- **Twitter**: Concise text, trending hashtags, eye-catching visuals
- **LinkedIn**: Professional tone, industry-relevant content
- **YouTube**: Short, engaging videos with clear titles
- **TikTok**: Trendy, creative short videos
- **Facebook**: Community-focused content with calls-to-action

#### File Format Guidelines
- **Photos**: JPG, JPEG, PNG (max 10MB)
- **Videos**: MP4, MOV (max 100MB for most platforms)
- **Stories**: JPG, JPEG, PNG, MP4, MOV

### 2. Posting Strategy

#### Optimal Timing
- **Instagram**: 11 AM, 3 PM, 7 PM
- **Twitter**: 9 AM, 12 PM, 5 PM
- **LinkedIn**: 8 AM, 12 PM, 5 PM
- **YouTube**: 2 PM, 8 PM
- **TikTok**: 6 PM, 9 PM
- **Facebook**: 1 PM, 3 PM, 9 PM

#### Content Scheduling
```python
# Schedule posts for optimal times
from datetime import datetime, timedelta

# Schedule Instagram post for 3 PM
instagram_time = datetime.now().replace(hour=15, minute=0, second=0)
schedule_post("instagram", content, instagram_time)

# Schedule Twitter post for 12 PM
twitter_time = datetime.now().replace(hour=12, minute=0, second=0)
schedule_post("twitter", content, twitter_time)
```

### 3. Error Handling

#### Retry Failed Posts
```python
# Get failed posts
failed_posts = get_failed_platform_posts()

# Retry specific post
retry_failed_platform_post(post_id)
```

#### Monitor Platform Status
```python
# Check platform authentication
auth_results = await manager.authenticate_all()

# Get platform statistics
stats = get_platform_post_stats()
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures
```bash
# Test platform connections
python scripts/multi_platform_runner.py --client "MyBrand" --dry-run
```

#### 2. Content Validation Errors
```python
# Validate content for all platforms
validation_results = manager.validate_content(
    file_path="/path/to/content.jpg",
    content_type="photo"
)
```

#### 3. Platform-Specific Errors

**Instagram**: Check 2FA settings, account status
**Twitter**: Verify API credentials, rate limits
**LinkedIn**: Check account permissions
**YouTube**: Verify channel access, video format
**TikTok**: Check account status, video requirements
**Facebook**: Verify page permissions, access tokens

### Debug Mode

```bash
# Run with debug logging
python scripts/multi_platform_runner.py --client "MyBrand" --dry-run
```

## Testing

### Run Multi-Platform Tests

```bash
# Run all tests
python scripts/test_multi_platform.py --test all

# Run specific tests
python scripts/test_multi_platform.py --test init
python scripts/test_multi_platform.py --test validation
python scripts/test_multi_platform.py --test posting
```

### Test Results

The test suite validates:
- ✅ Platform initialization
- ✅ Content validation
- ✅ Database operations
- ✅ Platform capabilities
- ✅ Posting functionality (dry run)

## Performance Optimization

### 1. Concurrent Posting
```python
# Post to multiple platforms simultaneously
results = await manager.post_to_platforms(
    file_path=content_path,
    content_type="photo",
    platforms=["instagram", "twitter", "linkedin"]
)
```

### 2. Batch Processing
```python
# Process multiple jobs concurrently
async def process_jobs_batch(jobs):
    tasks = [process_job(job) for job in jobs]
    return await asyncio.gather(*tasks)
```

### 3. Database Optimization
```sql
-- Optimize queries with indexes
CREATE INDEX idx_platform_posts_job_platform ON platform_posts(job_id, platform);
CREATE INDEX idx_platform_posts_status ON platform_posts(status);
```

## Security Considerations

### 1. Credential Encryption
```python
# Encrypt platform credentials
from scripts.security_manager import SecurityManager

sm = SecurityManager(master_key)
encrypted_creds = sm.encrypt_credentials(username, password)
```

### 2. Access Control
```python
# Implement platform-specific permissions
def check_platform_access(client, platform):
    return client_has_platform_access(client, platform)
```

### 3. Rate Limiting
```python
# Implement platform-specific rate limits
rate_limits = {
    "instagram": 100,  # posts per hour
    "twitter": 300,   # posts per hour
    "linkedin": 50    # posts per hour
}
```

## Monitoring and Analytics

### 1. Platform Statistics
```python
# Get posting statistics
stats = get_platform_post_stats()
print(f"Total posts: {stats['total']}")
print(f"Successful: {stats['status_breakdown']['posted']}")
print(f"Failed: {stats['status_breakdown']['failed']}")
```

### 2. Performance Metrics
- Posting success rate per platform
- Average posting time per platform
- Error rates and types
- Content validation success rate

### 3. Health Monitoring
```python
# Check platform health
health_status = await manager.get_platform_status()
for platform, status in health_status.items():
    print(f"{platform}: {status}")
```

## Conclusion

The multi-platform posting system provides comprehensive support for all major social media platforms, enabling efficient cross-platform content distribution. With proper configuration and monitoring, it can significantly enhance your social media presence and engagement.

For additional support or questions, refer to the API documentation or contact the development team.
