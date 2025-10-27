# M1A Live Integration Guide

## 🚀 Complete Integration Process for M1Autoposter → M1A

This guide covers the complete process of integrating the M1Autoposter multi-platform system live into M1A as a subscription-based service.

## Phase 1: Pre-Integration Setup (1-2 weeks)

### 1.1 Infrastructure Preparation

#### **Cloud Infrastructure Setup**
```bash
# Choose cloud provider (AWS/Azure/GCP recommended)
# Set up production environment

# AWS Example:
aws ec2 create-instance --image-id ami-12345678 --instance-type t3.medium
aws rds create-db-instance --db-instance-identifier m1autoposter-prod
aws s3 mb s3://m1autoposter-content-bucket
```

#### **Database Migration to Production**
```bash
# Set up PostgreSQL production database
export DATABASE_URL="postgresql://user:password@prod-db.amazonaws.com:5432/m1autoposter"

# Run database migration
python scripts/db_migrate_postgres.py --postgres-url $DATABASE_URL

# Verify migration
python -c "from scripts.db_multi_platform import get_platform_post_stats; print(get_platform_post_stats())"
```

#### **Security Configuration**
```bash
# Generate production keys
openssl rand -base64 32  # Master key
openssl rand -base64 64  # JWT secret

# Set environment variables
export M1AUTOPOSTER_MASTER_KEY="your-256-bit-master-key"
export M1AUTOPOSTER_JWT_SECRET="your-jwt-secret"
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

### 1.2 M1A Platform Integration

#### **M1A API Integration**
```python
# Create M1A integration module
# scripts/m1a_integration.py

class M1AIntegration:
    def __init__(self, m1a_api_key, m1a_base_url):
        self.api_key = m1a_api_key
        self.base_url = m1a_base_url
    
    def authenticate_m1a_user(self, user_token):
        """Authenticate M1A user and get tenant info"""
        # Implement M1A user authentication
        pass
    
    def sync_m1a_customers(self):
        """Sync M1A customers to autoposter clients"""
        # Implement customer synchronization
        pass
    
    def send_usage_analytics(self, usage_data):
        """Send usage analytics to M1A"""
        # Implement analytics reporting
        pass
```

#### **M1A Webhook Integration**
```python
# Create webhook handlers for M1A events
# api/m1a_webhooks.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

class M1AWebhookData(BaseModel):
    event_type: str
    user_id: str
    tenant_id: str
    data: dict

@router.post("/webhooks/m1a")
async def handle_m1a_webhook(webhook_data: M1AWebhookData):
    """Handle M1A webhook events"""
    if webhook_data.event_type == "user.subscription.created":
        # Create new autoposter client
        pass
    elif webhook_data.event_type == "user.subscription.cancelled":
        # Deactivate client
        pass
```

## Phase 2: M1A-Specific Development (2-3 weeks)

### 2.1 M1A UI Components

#### **M1A Dashboard Integration**
```typescript
// M1A Dashboard Component
// components/M1AutoposterDashboard.tsx

import React, { useState, useEffect } from 'react';

interface M1AutoposterDashboardProps {
  userId: string;
  tenantId: string;
}

export const M1AutoposterDashboard: React.FC<M1AutoposterDashboardProps> = ({ userId, tenantId }) => {
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    // Load user's autoposter data
    loadAutoposterData(userId, tenantId);
  }, [userId, tenantId]);
  
  return (
    <div className="m1autoposter-dashboard">
      <h2>Social Media Automation</h2>
      <PlatformSelector platforms={platforms} />
      <ContentUploader />
      <SchedulingInterface />
      <AnalyticsPanel stats={stats} />
    </div>
  );
};
```

#### **M1A Menu Integration**
```typescript
// Add to M1A main menu
// components/M1AMenu.tsx

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'autoposter', label: 'Social Media Automation', icon: 'share', component: M1AutoposterDashboard },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  // ... other menu items
];
```

### 2.2 Subscription Management

#### **Stripe Integration for M1A**
```python
# scripts/m1a_subscription_manager.py

import stripe
from typing import Dict, Any

class M1ASubscriptionManager:
    def __init__(self, stripe_secret_key: str):
        stripe.api_key = stripe_secret_key
    
    def create_subscription(self, customer_id: str, plan_id: str) -> Dict[str, Any]:
        """Create subscription for M1A customer"""
        subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': plan_id}],
            metadata={'m1a_tenant': 'true'}
        )
        return subscription
    
    def handle_webhook(self, event: Dict[str, Any]):
        """Handle Stripe webhooks for subscription events"""
        if event['type'] == 'customer.subscription.created':
            self.activate_autoposter_access(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            self.deactivate_autoposter_access(event['data']['object'])
```

#### **Subscription Tiers for M1A**
```python
# M1A-specific subscription plans
M1A_SUBSCRIPTION_PLANS = {
    "starter": {
        "price_id": "price_starter_monthly",
        "platforms": ["instagram"],
        "daily_posts": 20,
        "clients": 1,
        "price": 29
    },
    "professional": {
        "price_id": "price_professional_monthly", 
        "platforms": ["instagram", "twitter", "linkedin"],
        "daily_posts": 100,
        "clients": 5,
        "price": 79
    },
    "agency": {
        "price_id": "price_agency_monthly",
        "platforms": ["instagram", "twitter", "linkedin", "youtube", "tiktok", "facebook"],
        "daily_posts": 500,
        "clients": 20,
        "price": 199
    }
}
```

### 2.3 M1A Authentication & Authorization

#### **M1A SSO Integration**
```python
# scripts/m1a_auth.py

import jwt
from typing import Optional, Dict, Any

class M1AAuthentication:
    def __init__(self, m1a_jwt_secret: str):
        self.jwt_secret = m1a_jwt_secret
    
    def verify_m1a_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify M1A JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return {
                'user_id': payload['user_id'],
                'tenant_id': payload['tenant_id'],
                'subscription_tier': payload.get('subscription_tier', 'starter')
            }
        except jwt.InvalidTokenError:
            return None
    
    def get_user_permissions(self, user_id: str, tenant_id: str) -> Dict[str, Any]:
        """Get user permissions for autoposter access"""
        # Check subscription status
        # Return platform access, quotas, etc.
        pass
```

## Phase 3: Production Deployment (1-2 weeks)

### 3.1 Docker Production Setup

#### **Production Dockerfile**
```dockerfile
# Dockerfile.production
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc g++ libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create directories
RUN mkdir -p logs data content config/clients

# Set permissions
RUN chmod -R 755 logs data content config

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python scripts/health_check.py

# Start application
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

#### **Production Docker Compose**
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  m1autoposter:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - M1AUTOPOSTER_MASTER_KEY=${M1AUTOPOSTER_MASTER_KEY}
      - M1AUTOPOSTER_JWT_SECRET=${M1AUTOPOSTER_JWT_SECRET}
      - M1A_API_KEY=${M1A_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    volumes:
      - content_data:/app/content
      - logs_data:/app/logs
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=m1autoposter
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.production.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - m1autoposter
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  content_data:
  logs_data:
```

### 3.2 Production Configuration

#### **Environment Variables**
```bash
# .env.production
DATABASE_URL=postgresql://user:password@prod-db.amazonaws.com:5432/m1autoposter
M1AUTOPOSTER_MASTER_KEY=your-256-bit-master-key
M1AUTOPOSTER_JWT_SECRET=your-jwt-secret
M1A_API_KEY=your-m1a-api-key
M1A_BASE_URL=https://api.m1a.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
REDIS_URL=redis://redis:6379
LOG_LEVEL=INFO
DEBUG=false
```

#### **Nginx Production Configuration**
```nginx
# nginx.production.conf
events {
    worker_connections 1024;
}

http {
    upstream m1autoposter {
        server m1autoposter:8000;
    }
    
    server {
        listen 443 ssl http2;
        server_name api.m1autoposter.com;
        
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        
        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req zone=api burst=20 nodelay;
        
        location / {
            proxy_pass http://m1autoposter;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Phase 4: M1A Integration Implementation (2-3 weeks)

### 4.1 M1A API Integration

#### **M1A Client SDK**
```python
# scripts/m1a_client.py

import requests
from typing import Dict, Any, List

class M1AClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_user_info(self, user_id: str) -> Dict[str, Any]:
        """Get M1A user information"""
        response = requests.get(
            f"{self.base_url}/users/{user_id}",
            headers=self.headers
        )
        return response.json()
    
    def get_tenant_info(self, tenant_id: str) -> Dict[str, Any]:
        """Get M1A tenant information"""
        response = requests.get(
            f"{self.base_url}/tenants/{tenant_id}",
            headers=self.headers
        )
        return response.json()
    
    def send_notification(self, user_id: str, message: str) -> bool:
        """Send notification to M1A user"""
        response = requests.post(
            f"{self.base_url}/notifications",
            headers=self.headers,
            json={
                'user_id': user_id,
                'message': message,
                'type': 'autoposter'
            }
        )
        return response.status_code == 200
```

### 4.2 M1A Webhook Implementation

#### **M1A Webhook Handlers**
```python
# api/m1a_webhooks.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/webhooks/m1a", tags=["M1A Webhooks"])

class M1AWebhookEvent(BaseModel):
    event_type: str
    user_id: str
    tenant_id: str
    data: Dict[str, Any]

@router.post("/subscription-created")
async def handle_subscription_created(event: M1AWebhookEvent):
    """Handle M1A subscription creation"""
    try:
        # Create autoposter client for new subscriber
        from scripts.setup_multi_platform import MultiPlatformSetup
        
        setup = MultiPlatformSetup()
        setup.create_client_config(
            event.tenant_id,
            ["instagram", "twitter"]  # Default platforms
        )
        
        # Send welcome notification
        m1a_client = M1AClient(M1A_API_KEY, M1A_BASE_URL)
        m1a_client.send_notification(
            event.user_id,
            "Welcome to M1Autoposter! Your social media automation is now active."
        )
        
        return {"status": "success", "message": "Client created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscription-cancelled")
async def handle_subscription_cancelled(event: M1AWebhookEvent):
    """Handle M1A subscription cancellation"""
    try:
        # Deactivate autoposter client
        from scripts.db_multi_platform import update_client_platform
        
        # Disable all platforms for the tenant
        platforms = ["instagram", "twitter", "linkedin", "youtube", "tiktok", "facebook"]
        for platform in platforms:
            update_client_platform(
                event.tenant_id,
                platform,
                settings={"enabled": False}
            )
        
        return {"status": "success", "message": "Client deactivated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 4.3 M1A Dashboard Integration

#### **M1A Dashboard API Endpoints**
```python
# api/m1a_dashboard.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

router = APIRouter(prefix="/api/v1/m1a", tags=["M1A Dashboard"])

@router.get("/dashboard/{tenant_id}")
async def get_dashboard_data(tenant_id: str, user: dict = Depends(verify_m1a_token)):
    """Get dashboard data for M1A tenant"""
    try:
        # Get platform statistics
        from scripts.db_multi_platform import get_platform_post_stats
        
        stats = get_platform_post_stats()
        
        # Get client platforms
        from scripts.db_multi_platform import get_client_platforms
        platforms = get_client_platforms(tenant_id)
        
        # Get recent posts
        from scripts import db
        recent_posts = db.get_due_jobs(limit=10, client=tenant_id)
        
        return {
            "tenant_id": tenant_id,
            "platforms": platforms,
            "stats": stats,
            "recent_posts": recent_posts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/platforms/{tenant_id}/configure")
async def configure_platforms(
    tenant_id: str, 
    platforms: List[str],
    user: dict = Depends(verify_m1a_token)
):
    """Configure platforms for M1A tenant"""
    try:
        from scripts.db_multi_platform import add_client_platform
        
        for platform in platforms:
            add_client_platform(tenant_id, platform, {}, {"enabled": True})
        
        return {"status": "success", "message": "Platforms configured"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Phase 5: Testing & Validation (1 week)

### 5.1 Integration Testing

#### **M1A Integration Test Suite**
```python
# tests/test_m1a_integration.py

import pytest
from scripts.m1a_client import M1AClient
from scripts.m1a_auth import M1AAuthentication

class TestM1AIntegration:
    def test_m1a_authentication(self):
        """Test M1A user authentication"""
        auth = M1AAuthentication("test-secret")
        token = "test-jwt-token"
        user_info = auth.verify_m1a_token(token)
        assert user_info is not None
    
    def test_subscription_webhook(self):
        """Test subscription webhook handling"""
        # Test subscription creation
        # Test subscription cancellation
        pass
    
    def test_dashboard_data(self):
        """Test dashboard data retrieval"""
        # Test dashboard API endpoints
        pass
```

### 5.2 Load Testing

#### **Load Testing Script**
```python
# tests/load_test.py

import asyncio
import aiohttp
import time

async def load_test_api():
    """Load test the M1Autoposter API"""
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(100):  # 100 concurrent requests
            task = session.get('http://localhost:8000/api/v1/multi-platform/platforms')
            tasks.append(task)
        
        start_time = time.time()
        responses = await asyncio.gather(*tasks)
        end_time = time.time()
        
        print(f"100 requests completed in {end_time - start_time:.2f} seconds")
        print(f"Average response time: {(end_time - start_time) / 100:.3f} seconds")

# Run load test
asyncio.run(load_test_api())
```

## Phase 6: Go-Live Deployment (1 week)

### 6.1 Production Deployment

#### **Deployment Script**
```bash
#!/bin/bash
# deploy.sh - Production deployment script

echo "Starting M1Autoposter production deployment..."

# 1. Build Docker images
echo "Building Docker images..."
docker-compose -f docker-compose.production.yml build

# 2. Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm m1autoposter \
    python scripts/db_migrate_postgres.py

# 3. Start services
echo "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# 4. Health check
echo "Performing health check..."
sleep 30
curl -f http://localhost:8000/health || exit 1

# 5. Verify services
echo "Verifying services..."
docker-compose -f docker-compose.production.yml ps

echo "Deployment completed successfully!"
```

### 6.2 M1A Integration Activation

#### **M1A Integration Activation Script**
```python
# scripts/activate_m1a_integration.py

import os
import requests
from typing import Dict, Any

def activate_m1a_integration():
    """Activate M1A integration"""
    
    # 1. Register webhooks with M1A
    webhook_url = "https://api.m1autoposter.com/webhooks/m1a"
    
    webhook_config = {
        "url": webhook_url,
        "events": [
            "user.subscription.created",
            "user.subscription.cancelled",
            "user.subscription.updated"
        ]
    }
    
    # Register webhook with M1A
    m1a_response = requests.post(
        f"{M1A_BASE_URL}/webhooks",
        headers={"Authorization": f"Bearer {M1A_API_KEY}"},
        json=webhook_config
    )
    
    if m1a_response.status_code == 200:
        print("✅ M1A webhooks registered successfully")
    else:
        print(f"❌ Failed to register M1A webhooks: {m1a_response.text}")
        return False
    
    # 2. Test integration
    test_response = requests.get(
        f"{M1A_BASE_URL}/test",
        headers={"Authorization": f"Bearer {M1A_API_KEY}"}
    )
    
    if test_response.status_code == 200:
        print("✅ M1A integration test passed")
    else:
        print(f"❌ M1A integration test failed: {test_response.text}")
        return False
    
    # 3. Activate monitoring
    print("✅ M1A integration activated successfully")
    return True

if __name__ == "__main__":
    activate_m1a_integration()
```

## Phase 7: Monitoring & Maintenance (Ongoing)

### 7.1 Production Monitoring

#### **Monitoring Dashboard**
```python
# scripts/monitoring.py

import time
import requests
from datetime import datetime

class M1AutoposterMonitor:
    def __init__(self):
        self.api_url = "https://api.m1autoposter.com"
        self.m1a_api_url = "https://api.m1a.com"
    
    def check_health(self):
        """Check system health"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            if response.status_code == 200:
                return True, "System healthy"
            else:
                return False, f"Health check failed: {response.status_code}"
        except Exception as e:
            return False, f"Health check error: {e}"
    
    def check_m1a_integration(self):
        """Check M1A integration"""
        try:
            response = requests.get(f"{self.m1a_api_url}/test", timeout=10)
            if response.status_code == 200:
                return True, "M1A integration healthy"
            else:
                return False, f"M1A integration failed: {response.status_code}"
        except Exception as e:
            return False, f"M1A integration error: {e}"
    
    def generate_report(self):
        """Generate monitoring report"""
        health_ok, health_msg = self.check_health()
        m1a_ok, m1a_msg = self.check_m1a_integration()
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "system_health": health_ok,
            "health_message": health_msg,
            "m1a_integration": m1a_ok,
            "m1a_message": m1a_msg,
            "overall_status": "healthy" if (health_ok and m1a_ok) else "unhealthy"
        }
        
        return report
```

### 7.2 Performance Optimization

#### **Performance Monitoring**
```python
# scripts/performance_monitor.py

import psutil
import time
from typing import Dict, Any

class PerformanceMonitor:
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "timestamp": time.time()
        }
    
    def get_application_metrics(self) -> Dict[str, Any]:
        """Get application-specific metrics"""
        from scripts.db_multi_platform import get_platform_post_stats
        
        stats = get_platform_post_stats()
        
        return {
            "total_posts": stats["total"],
            "successful_posts": stats["status_breakdown"].get("posted", 0),
            "failed_posts": stats["status_breakdown"].get("failed", 0),
            "platform_breakdown": stats["platform_breakdown"]
        }
```

## 🎯 Integration Timeline

### **Week 1-2: Infrastructure Setup**
- [ ] Set up cloud infrastructure
- [ ] Configure production database
- [ ] Set up security and monitoring
- [ ] Deploy base application

### **Week 3-4: M1A Integration Development**
- [ ] Implement M1A API integration
- [ ] Create M1A dashboard components
- [ ] Set up subscription management
- [ ] Implement webhook handlers

### **Week 5-6: Testing & Validation**
- [ ] Integration testing
- [ ] Load testing
- [ ] Security testing
- [ ] User acceptance testing

### **Week 7: Go-Live**
- [ ] Production deployment
- [ ] M1A integration activation
- [ ] Monitoring setup
- [ ] Launch announcement

## 🚀 Success Metrics

### **Technical Metrics**
- ✅ **Uptime**: 99.9% availability
- ✅ **Response Time**: < 200ms average
- ✅ **Error Rate**: < 0.1% of requests
- ✅ **Database Performance**: < 100ms query time

### **Business Metrics**
- ✅ **Customer Acquisition**: 100+ M1A customers in Month 1
- ✅ **Revenue Growth**: $10K+ MRR by Month 3
- ✅ **User Engagement**: 80%+ monthly active users
- ✅ **Customer Satisfaction**: 4.5+ star rating

### **Integration Metrics**
- ✅ **M1A Integration**: Seamless user experience
- ✅ **Webhook Reliability**: 99.9% webhook delivery
- ✅ **Data Sync**: Real-time synchronization
- ✅ **Security**: Zero security incidents

## 🎉 Conclusion

This comprehensive integration guide provides the complete roadmap for deploying M1Autoposter live into M1A as a subscription-based service. The integration will transform M1Autoposter into a powerful revenue-generating feature within the M1A ecosystem.

**Ready to launch the future of social media automation! 🚀**
