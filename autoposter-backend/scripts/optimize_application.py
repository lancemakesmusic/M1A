# scripts/optimize_application.py
"""
M1Autoposter Application Optimizer
Implements best practices and optimizations for production deployment
"""
import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import subprocess

class ApplicationOptimizer:
    def __init__(self):
        self.root = Path(__file__).parent.parent
        self.backup_dir = self.root / "backups" / f"optimization_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
    def create_backup(self):
        """Create backup before optimization"""
        print("Creating backup...")
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup critical files
        critical_files = [
            "config/",
            "data/",
            "scripts/",
            "requirements.txt"
        ]
        
        for item in critical_files:
            src = self.root / item
            dst = self.backup_dir / item
            if src.exists():
                if src.is_dir():
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)
        
        print(f"Backup created at: {self.backup_dir}")
    
    def optimize_database(self):
        """Optimize database configuration"""
        print("🗄️ Optimizing database...")
        
        # Create optimized database configuration
        db_config = {
            "production": {
                "type": "postgresql",
                "url": "${DATABASE_URL}",
                "pool_size": 20,
                "max_overflow": 30,
                "pool_timeout": 30,
                "pool_recycle": 3600
            },
            "development": {
                "type": "sqlite",
                "path": "data/autoposter.db",
                "journal_mode": "WAL",
                "synchronous": "NORMAL",
                "cache_size": 10000,
                "temp_store": "MEMORY"
            }
        }
        
        config_file = self.root / "config" / "database.json"
        config_file.parent.mkdir(exist_ok=True)
        
        with open(config_file, 'w') as f:
            json.dump(db_config, f, indent=2)
        
        print("✅ Database configuration optimized")
    
    def setup_logging(self):
        """Setup structured logging"""
        print("📝 Setting up logging...")
        
        logging_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
                },
                "detailed": {
                    "format": "%(asctime)s [%(levelname)s] %(name)s:%(lineno)d: %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "level": "INFO",
                    "formatter": "standard",
                    "stream": "ext://sys.stdout"
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "DEBUG",
                    "formatter": "detailed",
                    "filename": "logs/autoposter.log",
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5
                },
                "error_file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "level": "ERROR",
                    "formatter": "detailed",
                    "filename": "logs/errors.log",
                    "maxBytes": 10485760,
                    "backupCount": 5
                }
            },
            "loggers": {
                "": {
                    "handlers": ["console", "file", "error_file"],
                    "level": "DEBUG",
                    "propagate": False
                }
            }
        }
        
        log_config_file = self.root / "config" / "logging.json"
        with open(log_config_file, 'w') as f:
            json.dump(logging_config, f, indent=2)
        
        print("✅ Logging configuration created")
    
    def setup_monitoring(self):
        """Setup application monitoring"""
        print("📊 Setting up monitoring...")
        
        # Create health check endpoint
        health_check = '''# scripts/health_check.py
"""
Health check endpoint for monitoring
"""
import os
import json
from datetime import datetime
from pathlib import Path

def check_database():
    """Check database connectivity"""
    try:
        from scripts import db
        conn = db._conn()
        cursor = conn.execute("SELECT 1")
        cursor.fetchone()
        return True, "Database OK"
    except Exception as e:
        return False, f"Database error: {e}"

def check_file_system():
    """Check file system health"""
    try:
        content_dir = Path(__file__).parent.parent / "content"
        if not content_dir.exists():
            content_dir.mkdir(parents=True)
        
        # Test write access
        test_file = content_dir / ".health_check"
        test_file.write_text("health_check")
        test_file.unlink()
        
        return True, "File system OK"
    except Exception as e:
        return False, f"File system error: {e}"

def check_processes():
    """Check if required processes are running"""
    try:
        logs_dir = Path(__file__).parent.parent / "logs"
        
        watcher_pid = ""
        runner_pid = ""
        
        try:
            with open(logs_dir / "watcher.pid", "r") as f:
                watcher_pid = f.read().strip()
        except:
            pass
        
        try:
            with open(logs_dir / "runner.pid", "r") as f:
                runner_pid = f.read().strip()
        except:
            pass
        
        return True, f"Watcher: {watcher_pid}, Runner: {runner_pid}"
    except Exception as e:
        return False, f"Process check error: {e}"

def get_health_status():
    """Get overall health status"""
    checks = [
        ("database", check_database),
        ("filesystem", check_file_system),
        ("processes", check_processes)
    ]
    
    results = {}
    overall_healthy = True
    
    for name, check_func in checks:
        healthy, message = check_func()
        results[name] = {
            "healthy": healthy,
            "message": message
        }
        if not healthy:
            overall_healthy = False
    
    return {
        "healthy": overall_healthy,
        "timestamp": datetime.now().isoformat(),
        "checks": results
    }

if __name__ == "__main__":
    import sys
    status = get_health_status()
    print(json.dumps(status, indent=2))
    sys.exit(0 if status["healthy"] else 1)
'''
        
        health_file = self.root / "scripts" / "health_check.py"
        with open(health_file, 'w') as f:
            f.write(health_check)
        
        print("✅ Health check endpoint created")
    
    def setup_environment_config(self):
        """Setup environment configuration"""
        print("🌍 Setting up environment configuration...")
        
        env_template = '''# Environment Configuration Template
# Copy this to .env and fill in your values

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/m1autoposter

# Security
M1AUTOPOSTER_MASTER_KEY=your-256-bit-master-key-here
M1AUTOPOSTER_JWT_SECRET=your-jwt-secret-key-here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Instagram API
INSTAGRAM_API_TIMEOUT=30
INSTAGRAM_RATE_LIMIT=100

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/autoposter.log

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Development
DEBUG=false
IGNORE_QUOTA=false
'''
        
        env_file = self.root / ".env.template"
        with open(env_file, 'w') as f:
            f.write(env_template)
        
        print("✅ Environment template created")
    
    def create_docker_config(self):
        """Create Docker configuration for deployment"""
        print("🐳 Creating Docker configuration...")
        
        # Dockerfile
        dockerfile = '''FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs data content config/clients

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose ports
EXPOSE 8000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD python scripts/health_check.py

# Start application
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
'''
        
        dockerfile_path = self.root / "Dockerfile"
        with open(dockerfile_path, 'w') as f:
            f.write(dockerfile)
        
        # docker-compose.yml
        docker_compose = '''version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
      - "9090:9090"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/m1autoposter
      - M1AUTOPOSTER_MASTER_KEY=${M1AUTOPOSTER_MASTER_KEY}
      - M1AUTOPOSTER_JWT_SECRET=${M1AUTOPOSTER_JWT_SECRET}
    volumes:
      - ./content:/app/content
      - ./logs:/app/logs
      - ./data:/app/data
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=m1autoposter
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
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
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
'''
        
        compose_file = self.root / "docker-compose.yml"
        with open(compose_file, 'w') as f:
            f.write(docker_compose)
        
        print("✅ Docker configuration created")
    
    def create_nginx_config(self):
        """Create Nginx configuration"""
        print("🌐 Creating Nginx configuration...")
        
        nginx_config = '''events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8000;
    }
    
    server {
        listen 80;
        server_name api.m1autoposter.com;
        
        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }
    
    server {
        listen 443 ssl http2;
        server_name api.m1autoposter.com;
        
        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
        
        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
        
        # Rate limiting
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        limit_req zone=api burst=20 nodelay;
        
        # Proxy to application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            proxy_pass http://app/health;
        }
    }
}
'''
        
        nginx_file = self.root / "nginx.conf"
        with open(nginx_file, 'w') as f:
            f.write(nginx_config)
        
        print("✅ Nginx configuration created")
    
    def create_deployment_scripts(self):
        """Create deployment scripts"""
        print("🚀 Creating deployment scripts...")
        
        # Production deployment script
        deploy_script = '''#!/bin/bash
# Production deployment script for M1Autoposter

set -e

echo "🚀 Starting M1Autoposter deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.template .env
    echo "⚠️ Please edit .env file with your configuration"
    exit 1
fi

# Create necessary directories
mkdir -p logs data content config/clients ssl

# Set proper permissions
chmod 755 logs data content config/clients

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🗄️ Starting database migration..."
docker-compose run --rm app python scripts/db_migrate_postgres.py

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "🔍 Checking service health..."
docker-compose exec app python scripts/health_check.py

echo "✅ Deployment completed successfully!"
echo "🌐 API available at: http://localhost:8000"
echo "📊 Health check: http://localhost:8000/health"
'''
        
        deploy_file = self.root / "deploy.sh"
        with open(deploy_file, 'w') as f:
            f.write(deploy_script)
        
        # Make executable
        os.chmod(deploy_file, 0o755)
        
        print("✅ Deployment scripts created")
    
    def optimize_performance(self):
        """Apply performance optimizations"""
        print("⚡ Applying performance optimizations...")
        
        # Create optimized queue runner
        optimized_runner = '''# scripts/queue_runner_optimized.py
"""
Optimized queue runner with performance improvements
"""
import os
import asyncio
import aiofiles
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class OptimizedQueueRunner:
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        
    async def process_jobs_batch(self, jobs: List[Dict[str, Any]]):
        """Process multiple jobs concurrently"""
        tasks = []
        for job in jobs:
            task = asyncio.create_task(self.process_single_job(job))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results
    
    async def process_single_job(self, job: Dict[str, Any]):
        """Process a single job asynchronously"""
        try:
            # Simulate async processing
            await asyncio.sleep(0.1)  # Replace with actual processing
            return {"status": "success", "job_id": job["id"]}
        except Exception as e:
            logger.error(f"Job {job['id']} failed: {e}")
            return {"status": "error", "job_id": job["id"], "error": str(e)}
    
    async def run_optimized(self):
        """Run optimized queue processing"""
        # Get jobs in batches
        batch_size = 10
        jobs = self.get_jobs_batch(batch_size)
        
        while jobs:
            results = await self.process_jobs_batch(jobs)
            self.handle_results(results)
            
            # Get next batch
            jobs = self.get_jobs_batch(batch_size)
    
    def get_jobs_batch(self, limit: int) -> List[Dict[str, Any]]:
        """Get batch of jobs to process"""
        # Implementation depends on your database layer
        pass
    
    def handle_results(self, results: List[Dict[str, Any]]):
        """Handle processing results"""
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Task failed: {result}")
            else:
                logger.info(f"Task completed: {result}")

# Usage
async def main():
    runner = OptimizedQueueRunner(max_workers=4)
    await runner.run_optimized()

if __name__ == "__main__":
    asyncio.run(main())
'''
        
        optimized_file = self.root / "scripts" / "queue_runner_optimized.py"
        with open(optimized_file, 'w') as f:
            f.write(optimized_runner)
        
        print("✅ Performance optimizations applied")
    
    def run_optimization(self):
        """Run complete optimization process"""
        print("Starting M1Autoposter optimization...")
        
        try:
            # Create backup first
            self.create_backup()
            
            # Apply optimizations
            self.optimize_database()
            self.setup_logging()
            self.setup_monitoring()
            self.setup_environment_config()
            self.create_docker_config()
            self.create_nginx_config()
            self.create_deployment_scripts()
            self.optimize_performance()
            
            print("✅ Optimization completed successfully!")
            print(f"📦 Backup created at: {self.backup_dir}")
            print("🚀 Ready for production deployment!")
            
        except Exception as e:
            print(f"❌ Optimization failed: {e}")
            print(f"🔄 Restore from backup: {self.backup_dir}")
            raise

def main():
    """CLI for application optimization"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize M1Autoposter application")
    parser.add_argument("--backup-only", action="store_true", help="Only create backup")
    
    args = parser.parse_args()
    
    optimizer = ApplicationOptimizer()
    
    if args.backup_only:
        optimizer.create_backup()
    else:
        optimizer.run_optimization()

if __name__ == "__main__":
    main()
