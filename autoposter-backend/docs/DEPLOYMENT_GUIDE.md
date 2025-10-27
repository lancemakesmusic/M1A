# M1Autoposter Deployment Guide

## Overview

This guide covers deploying M1Autoposter as a subscription-based service for M1A platform integration.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (for containerized deployment)
- SSL certificates (for production)

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.template .env

# Edit configuration
nano .env
```

Required environment variables:
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/m1autoposter

# Security (CHANGE THESE!)
M1AUTOPOSTER_MASTER_KEY=your-256-bit-master-key-here
M1AUTOPOSTER_JWT_SECRET=your-jwt-secret-key-here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

### 2. Database Migration

```bash
# Install dependencies
pip install -r requirements.txt

# Run database migration
python scripts/db_migrate_postgres.py --postgres-url $DATABASE_URL
```

### 3. Start Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

#### Option B: Manual Deployment

```bash
# Start database
# (Configure PostgreSQL separately)

# Start Redis
redis-server

# Start application
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 4. Verify Deployment

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## Production Deployment

### 1. Security Configuration

#### Generate Secure Keys

```bash
# Generate master key (256-bit)
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64
```

#### Update Environment

```bash
# Production .env
DATABASE_URL=postgresql://user:password@prod-db:5432/m1autoposter
M1AUTOPOSTER_MASTER_KEY=<generated-256-bit-key>
M1AUTOPOSTER_JWT_SECRET=<generated-jwt-secret>
DEBUG=false
LOG_LEVEL=INFO
```

### 2. Database Setup

#### PostgreSQL Configuration

```sql
-- Create database
CREATE DATABASE m1autoposter;

-- Create user
CREATE USER m1autoposter WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE m1autoposter TO m1autoposter;
```

#### Run Migration

```bash
python scripts/db_migrate_postgres.py --postgres-url $DATABASE_URL
```

### 3. SSL Configuration

#### Generate SSL Certificates

```bash
# Create SSL directory
mkdir -p ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# For production, use Let's Encrypt or commercial certificates
```

#### Update Nginx Configuration

```bash
# Update nginx.conf with your domain
server_name api.yourdomain.com;
```

### 4. Load Balancer Setup

#### Nginx Configuration

```nginx
upstream m1autoposter {
    server app1:8000;
    server app2:8000;
    server app3:8000;
}

server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://m1autoposter;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## M1A Integration

### 1. API Authentication

#### Generate JWT Tokens

```python
import jwt
import datetime

# Generate token for M1A integration
payload = {
    'tenant_id': 'm1a-tenant-id',
    'user_id': 'm1a-user-id',
    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
}

token = jwt.encode(payload, 'your-jwt-secret', algorithm='HS256')
```

#### Configure M1A Client

```python
# M1A integration example
import requests

API_BASE = "https://api.yourdomain.com/api/v1"
TOKEN = "your-jwt-token"

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Create client
client_data = {
    'name': 'm1a_client',
    'daily_quota': 10,
    'timezone': 'America/New_York'
}

response = requests.post(f'{API_BASE}/clients', json=client_data, headers=headers)
```

### 2. Subscription Management

#### Stripe Integration

```python
# Add to requirements.txt
stripe==7.0.0

# Environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Subscription Tiers

| Tier | Clients | Posts/Day | Price/Month |
|------|---------|-----------|-------------|
| Starter | 1 | 20 | $29 |
| Professional | 5 | 100 | $79 |
| Agency | 20 | 500 | $199 |
| Enterprise | Unlimited | Unlimited | Custom |

### 3. Webhook Configuration

#### Set up webhooks for real-time notifications

```python
# Webhook endpoints
WEBHOOK_URLS = {
    'job.completed': 'https://m1a-platform.com/webhooks/job-completed',
    'job.failed': 'https://m1a-platform.com/webhooks/job-failed',
    'quota.exceeded': 'https://m1a-platform.com/webhooks/quota-exceeded'
}
```

## Monitoring & Maintenance

### 1. Health Monitoring

```bash
# Check application health
curl http://localhost:8000/health

# Database health
python scripts/health_check.py

# System metrics
docker stats
```

### 2. Log Management

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# Log rotation (configured in logging.json)
```

### 3. Backup Strategy

#### Database Backup

```bash
# Daily backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

#### File System Backup

```bash
# Backup content and configuration
tar -czf backup_$(date +%Y%m%d).tar.gz content/ config/ data/
```

### 4. Performance Optimization

#### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_jobs_status_eta ON jobs(status, eta);
CREATE INDEX CONCURRENTLY idx_jobs_tenant_client ON jobs(tenant_id, client_id);
```

#### Application Optimization

```python
# Configure connection pooling
DATABASE_CONFIG = {
    'pool_size': 20,
    'max_overflow': 30,
    'pool_timeout': 30,
    'pool_recycle': 3600
}
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check database connectivity
python -c "import psycopg2; print('Database OK')"

# Check connection string
echo $DATABASE_URL
```

#### 2. Authentication Issues

```bash
# Verify JWT secret
python -c "import jwt; print('JWT OK')"

# Check token validity
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/status
```

#### 3. File Permission Issues

```bash
# Fix permissions
chmod -R 755 content/
chmod -R 755 logs/
chmod -R 755 data/
```

### Performance Issues

#### 1. High Memory Usage

```bash
# Check memory usage
docker stats

# Optimize worker count
API_WORKERS=2  # Reduce if memory constrained
```

#### 2. Database Performance

```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

## Security Checklist

- [ ] Change default passwords
- [ ] Enable SSL/TLS
- [ ] Configure firewall rules
- [ ] Set up log monitoring
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] Access control policies

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  app:
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
```

### Load Balancing

```nginx
upstream m1autoposter {
    least_conn;
    server app1:8000 weight=3;
    server app2:8000 weight=3;
    server app3:8000 weight=2;
}
```

## Support

- **Documentation**: https://docs.m1autoposter.com
- **Support Email**: support@m1autoposter.com
- **Status Page**: https://status.m1autoposter.com
- **GitHub Issues**: https://github.com/m1autoposter/issues

## Changelog

### v1.0.0 (2024-01-15)
- Initial production release
- M1A platform integration
- Subscription management
- Multi-tenancy support
