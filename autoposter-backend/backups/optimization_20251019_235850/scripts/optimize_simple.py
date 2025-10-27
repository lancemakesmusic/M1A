# scripts/optimize_simple.py
"""
Simple optimization script for M1Autoposter
Implements best practices without Unicode characters
"""
import os
import json
import shutil
from pathlib import Path
from datetime import datetime

class SimpleOptimizer:
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
    
    def setup_environment(self):
        """Setup environment configuration"""
        print("Setting up environment configuration...")
        
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
        
        print("Environment template created")
    
    def create_docker_config(self):
        """Create Docker configuration"""
        print("Creating Docker configuration...")
        
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
        
        print("Docker configuration created")
    
    def create_health_check(self):
        """Create health check script"""
        print("Creating health check script...")
        
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

def get_health_status():
    """Get overall health status"""
    checks = [
        ("database", check_database),
        ("filesystem", check_file_system)
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
        
        print("Health check script created")
    
    def run_optimization(self):
        """Run complete optimization process"""
        print("Starting M1Autoposter optimization...")
        
        try:
            # Create backup first
            self.create_backup()
            
            # Apply optimizations
            self.setup_environment()
            self.create_docker_config()
            self.create_health_check()
            
            print("Optimization completed successfully!")
            print(f"Backup created at: {self.backup_dir}")
            print("Ready for production deployment!")
            
        except Exception as e:
            print(f"Optimization failed: {e}")
            print(f"Restore from backup: {self.backup_dir}")
            raise

def main():
    """CLI for application optimization"""
    optimizer = SimpleOptimizer()
    optimizer.run_optimization()

if __name__ == "__main__":
    main()
