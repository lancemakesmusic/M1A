# M1Autoposter API Documentation

## Overview

The M1Autoposter API provides programmatic access to Instagram automation features for the M1A platform. This RESTful API enables subscription-based social media management services.

## Base URL

```
https://api.m1autoposter.com/api/v1
```

## Authentication

All API requests require JWT authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting an API Token

Contact M1A support to obtain your API credentials and generate JWT tokens.

## Rate Limits

- **Free Tier**: 100 requests/hour
- **Professional**: 1,000 requests/hour  
- **Enterprise**: 10,000 requests/hour

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Endpoints

### System Status

#### GET /status

Get system health and statistics.

**Response:**
```json
{
  "watcher_status": "running",
  "runner_status": "running", 
  "total_jobs": 150,
  "queued_jobs": 5,
  "completed_jobs": 140,
  "failed_jobs": 5
}
```

### Client Management

#### GET /clients

List all clients for the authenticated tenant.

**Response:**
```json
[
  {
    "name": "client1",
    "daily_quota": 10,
    "timezone": "America/New_York",
    "preferred_hours": [11, 15, 19],
    "created_at": "2024-01-15T10:30:00Z",
    "status": "active"
  }
]
```

#### POST /clients

Create a new client.

**Request Body:**
```json
{
  "name": "new_client",
  "ig_username": "instagram_username",
  "ig_password": "instagram_password",
  "daily_quota": 5,
  "timezone": "America/New_York",
  "preferred_hours": [11, 15, 19]
}
```

**Response:**
```json
{
  "name": "new_client",
  "daily_quota": 5,
  "timezone": "America/New_York", 
  "preferred_hours": [11, 15, 19],
  "created_at": "2024-01-15T10:30:00Z",
  "status": "active"
}
```

#### GET /clients/{client_name}

Get specific client details.

**Response:**
```json
{
  "name": "client1",
  "daily_quota": 10,
  "timezone": "America/New_York",
  "preferred_hours": [11, 15, 19],
  "created_at": "2024-01-15T10:30:00Z",
  "status": "active"
}
```

### Queue Management

#### POST /queue

Add content to the posting queue.

**Request Body:**
```json
{
  "client": "client1",
  "content_type": "feed",
  "file_path": "/path/to/image.jpg",
  "caption": "Check out this amazing content! #hashtag",
  "schedule_time": "2024-01-15T15:00:00Z"
}
```

**Content Types:**
- `feed`: Regular Instagram posts
- `reels`: Instagram Reels
- `stories`: Instagram Stories  
- `weekly`: Weekly content posts

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "client": "client1",
  "content_type": "feed",
  "file_path": "/path/to/image.jpg",
  "caption": "Check out this amazing content! #hashtag",
  "status": "queued",
  "eta": "2024-01-15T15:00:00Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### GET /queue

List queued posts.

**Query Parameters:**
- `client` (optional): Filter by client name

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "client": "client1", 
    "content_type": "feed",
    "file_path": "/path/to/image.jpg",
    "caption": "Check out this amazing content! #hashtag",
    "status": "queued",
    "eta": "2024-01-15T15:00:00Z",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### DELETE /queue/{job_id}

Cancel a queued job.

**Response:**
```json
{
  "message": "Job cancelled successfully"
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "detail": "Error description",
  "error_code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `INVALID_CREDENTIALS`: Authentication failed
- `CLIENT_NOT_FOUND`: Client doesn't exist
- `FILE_NOT_FOUND`: Content file not found
- `QUOTA_EXCEEDED`: Daily posting quota exceeded
- `INVALID_CONTENT_TYPE`: Unsupported content type
- `SCHEDULE_INVALID`: Invalid schedule time format

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Rate Limited
- `500`: Internal Server Error

## Webhooks

Configure webhooks to receive real-time notifications:

### Webhook Events

- `job.completed`: Job finished successfully
- `job.failed`: Job failed with error
- `job.cancelled`: Job was cancelled
- `quota.exceeded`: Daily quota reached

### Webhook Payload

```json
{
  "event": "job.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "job_id": "123e4567-e89b-12d3-a456-426614174000",
    "client": "client1",
    "content_type": "feed",
    "status": "done"
  }
}
```

## SDKs and Examples

### Python Example

```python
import requests

# Set up authentication
headers = {
    'Authorization': 'Bearer your-jwt-token',
    'Content-Type': 'application/json'
}

# Create a client
client_data = {
    'name': 'my_client',
    'daily_quota': 5,
    'timezone': 'America/New_York'
}

response = requests.post(
    'https://api.m1autoposter.com/api/v1/clients',
    json=client_data,
    headers=headers
)

# Add content to queue
post_data = {
    'client': 'my_client',
    'content_type': 'feed',
    'file_path': '/path/to/image.jpg',
    'caption': 'Amazing content! #hashtag'
}

response = requests.post(
    'https://api.m1autoposter.com/api/v1/queue',
    json=post_data,
    headers=headers
)
```

### JavaScript Example

```javascript
const API_BASE = 'https://api.m1autoposter.com/api/v1';
const token = 'your-jwt-token';

// Create client
const clientData = {
  name: 'my_client',
  daily_quota: 5,
  timezone: 'America/New_York'
};

fetch(`${API_BASE}/clients`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(clientData)
});

// Add to queue
const postData = {
  client: 'my_client',
  content_type: 'feed',
  file_path: '/path/to/image.jpg',
  caption: 'Amazing content! #hashtag'
};

fetch(`${API_BASE}/queue`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(postData)
});
```

## Best Practices

### Content Guidelines

1. **File Formats**: 
   - Images: JPG, PNG (max 10MB)
   - Videos: MP4, MOV (max 100MB for Reels)

2. **Captions**: 
   - Keep under 2,200 characters
   - Use relevant hashtags (max 30)
   - Include call-to-action

3. **Scheduling**:
   - Post during optimal hours (11 AM, 3 PM, 7 PM)
   - Space posts at least 1 hour apart
   - Respect daily quotas

### Error Handling

```python
import requests
from requests.exceptions import RequestException

try:
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
    return response.json()
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 429:
        # Handle rate limiting
        retry_after = e.response.headers.get('Retry-After', 60)
        time.sleep(int(retry_after))
    else:
        raise
except RequestException as e:
    # Handle network errors
    print(f"Network error: {e}")
```

## Support

- **Documentation**: https://docs.m1autoposter.com
- **Support Email**: support@m1autoposter.com
- **Status Page**: https://status.m1autoposter.com
- **GitHub**: https://github.com/m1autoposter/api-examples

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Client management
- Queue operations
- Basic authentication
