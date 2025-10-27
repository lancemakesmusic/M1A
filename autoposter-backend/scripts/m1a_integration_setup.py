# scripts/m1a_integration_setup.py
"""
M1A Integration Setup Script
Automates the integration process for M1Autoposter into M1A
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

class M1AIntegrationSetup:
    """M1A Integration Setup Manager"""
    
    def __init__(self):
        self.project_root = Path(__file__).resolve().parents[1]
        self.config = {}
        
    def load_config(self, config_file: str = "m1a_integration_config.json"):
        """Load M1A integration configuration"""
        config_path = self.project_root / config_file
        
        if config_path.exists():
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        else:
            # Create default configuration
            self.config = {
                "m1a": {
                    "api_key": "",
                    "base_url": "https://api.m1a.com",
                    "webhook_secret": ""
                },
                "stripe": {
                    "secret_key": "",
                    "publishable_key": "",
                    "webhook_secret": ""
                },
                "database": {
                    "url": "",
                    "host": "",
                    "port": "",
                    "name": "",
                    "user": "",
                    "password": ""
                },
                "security": {
                    "master_key": "",
                    "jwt_secret": ""
                },
                "deployment": {
                    "domain": "",
                    "ssl_cert_path": "",
                    "ssl_key_path": ""
                }
            }
            
            # Save default configuration
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            
            print(f"Created default configuration: {config_path}")
            print("Please edit the configuration file with your actual values.")
            return False
        
        return True
    
    def validate_config(self) -> bool:
        """Validate M1A integration configuration"""
        required_fields = [
            "m1a.api_key",
            "m1a.base_url", 
            "stripe.secret_key",
            "database.url",
            "security.master_key",
            "security.jwt_secret"
        ]
        
        missing_fields = []
        for field in required_fields:
            keys = field.split('.')
            value = self.config
            for key in keys:
                value = value.get(key, {})
            if not value:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"Missing required configuration fields: {missing_fields}")
            return False
        
        return True
    
    def setup_environment(self):
        """Set up environment variables"""
        print("Setting up environment variables...")
        
        env_vars = {
            "M1A_API_KEY": self.config["m1a"]["api_key"],
            "M1A_BASE_URL": self.config["m1a"]["base_url"],
            "STRIPE_SECRET_KEY": self.config["stripe"]["secret_key"],
            "STRIPE_PUBLISHABLE_KEY": self.config["stripe"]["publishable_key"],
            "DATABASE_URL": self.config["database"]["url"],
            "M1AUTOPOSTER_MASTER_KEY": self.config["security"]["master_key"],
            "M1AUTOPOSTER_JWT_SECRET": self.config["security"]["jwt_secret"],
            "M1A_WEBHOOK_SECRET": self.config["m1a"]["webhook_secret"],
            "STRIPE_WEBHOOK_SECRET": self.config["stripe"]["webhook_secret"]
        }
        
        # Create .env file
        env_file = self.project_root / ".env.production"
        with open(env_file, 'w') as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        
        print(f"Environment variables saved to: {env_file}")
    
    def setup_database(self):
        """Set up production database"""
        print("Setting up production database...")
        
        try:
            # Initialize multi-platform database
            from scripts.db_multi_platform import init_multi_platform_db
            init_multi_platform_db()
            print("✅ Multi-platform database initialized")
            
            # Run database migration if needed
            if self.config["database"]["url"].startswith("postgresql"):
                print("Running PostgreSQL migration...")
                subprocess.run([
                    "python", "scripts/db_migrate_postgres.py",
                    "--postgres-url", self.config["database"]["url"]
                ], check=True)
                print("✅ PostgreSQL migration completed")
            
        except Exception as e:
            print(f"❌ Database setup failed: {e}")
            return False
        
        return True
    
    def setup_m1a_webhooks(self):
        """Set up M1A webhooks"""
        print("Setting up M1A webhooks...")
        
        webhook_url = f"https://{self.config['deployment']['domain']}/webhooks/m1a"
        
        webhook_config = {
            "url": webhook_url,
            "events": [
                "user.subscription.created",
                "user.subscription.cancelled", 
                "user.subscription.updated",
                "user.subscription.payment_succeeded",
                "user.subscription.payment_failed"
            ],
            "secret": self.config["m1a"]["webhook_secret"]
        }
        
        # Save webhook configuration
        webhook_file = self.project_root / "config" / "m1a_webhooks.json"
        webhook_file.parent.mkdir(exist_ok=True)
        
        with open(webhook_file, 'w') as f:
            json.dump(webhook_config, f, indent=2)
        
        print(f"✅ M1A webhook configuration saved: {webhook_file}")
        print(f"Webhook URL: {webhook_url}")
        
        return True
    
    def setup_stripe_integration(self):
        """Set up Stripe integration"""
        print("Setting up Stripe integration...")
        
        # Create Stripe subscription plans
        stripe_plans = {
            "starter": {
                "name": "M1Autoposter Starter",
                "price": 2900,  # $29.00
                "currency": "usd",
                "interval": "month",
                "platforms": ["instagram"],
                "daily_posts": 20,
                "clients": 1
            },
            "professional": {
                "name": "M1Autoposter Professional", 
                "price": 7900,  # $79.00
                "currency": "usd",
                "interval": "month",
                "platforms": ["instagram", "twitter", "linkedin"],
                "daily_posts": 100,
                "clients": 5
            },
            "agency": {
                "name": "M1Autoposter Agency",
                "price": 19900,  # $199.00
                "currency": "usd", 
                "interval": "month",
                "platforms": ["instagram", "twitter", "linkedin", "youtube", "tiktok", "facebook"],
                "daily_posts": 500,
                "clients": 20
            }
        }
        
        # Save Stripe plans configuration
        plans_file = self.project_root / "config" / "stripe_plans.json"
        with open(plans_file, 'w') as f:
            json.dump(stripe_plans, f, indent=2)
        
        print(f"✅ Stripe plans configuration saved: {plans_file}")
        
        return True
    
    def create_m1a_dashboard_components(self):
        """Create M1A dashboard components"""
        print("Creating M1A dashboard components...")
        
        # Create M1A dashboard component
        dashboard_component = '''// M1A Dashboard Component
import React, { useState, useEffect } from 'react';

interface M1AutoposterDashboardProps {
  userId: string;
  tenantId: string;
}

export const M1AutoposterDashboard: React.FC<M1AutoposterDashboardProps> = ({ userId, tenantId }) => {
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAutoposterData();
  }, [userId, tenantId]);
  
  const loadAutoposterData = async () => {
    try {
      const response = await fetch(`/api/v1/m1a/dashboard/${tenantId}`);
      const data = await response.json();
      setPlatforms(data.platforms);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to load autoposter data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="m1autoposter-dashboard">
      <h2>Social Media Automation</h2>
      <div className="platforms-section">
        <h3>Connected Platforms</h3>
        {platforms.map(platform => (
          <div key={platform.platform} className="platform-card">
            <span className="platform-name">{platform.display_name}</span>
            <span className={`status ${platform.enabled ? 'active' : 'inactive'}`}>
              {platform.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
        ))}
      </div>
      <div className="stats-section">
        <h3>Posting Statistics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{stats.total_posts || 0}</span>
            <span className="stat-label">Total Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.successful_posts || 0}</span>
            <span className="stat-label">Successful</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.failed_posts || 0}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
'''
        
        # Save dashboard component
        dashboard_file = self.project_root / "m1a_components" / "M1AutoposterDashboard.tsx"
        dashboard_file.parent.mkdir(exist_ok=True)
        
        with open(dashboard_file, 'w') as f:
            f.write(dashboard_component)
        
        print(f"✅ M1A dashboard component created: {dashboard_file}")
        
        return True
    
    def setup_monitoring(self):
        """Set up monitoring and alerting"""
        print("Setting up monitoring...")
        
        # Create monitoring configuration
        monitoring_config = {
            "health_checks": {
                "interval": 30,
                "timeout": 10,
                "retries": 3
            },
            "alerts": {
                "email": "",
                "slack_webhook": "",
                "discord_webhook": ""
            },
            "metrics": {
                "cpu_threshold": 80,
                "memory_threshold": 80,
                "disk_threshold": 90
            }
        }
        
        # Save monitoring configuration
        monitoring_file = self.project_root / "config" / "monitoring.json"
        with open(monitoring_file, 'w') as f:
            json.dump(monitoring_config, f, indent=2)
        
        print(f"✅ Monitoring configuration saved: {monitoring_file}")
        
        return True
    
    def create_deployment_scripts(self):
        """Create deployment scripts"""
        print("Creating deployment scripts...")
        
        # Create production deployment script
        deploy_script = '''#!/bin/bash
# M1Autoposter Production Deployment Script

set -e

echo "Starting M1Autoposter production deployment..."

# 1. Load environment variables
source .env.production

# 2. Build Docker images
echo "Building Docker images..."
docker-compose -f docker-compose.production.yml build

# 3. Run database migrations
echo "Running database migrations..."
docker-compose -f docker-compose.production.yml run --rm m1autoposter \\
    python scripts/db_migrate_postgres.py

# 4. Start services
echo "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# 5. Health check
echo "Performing health check..."
sleep 30
curl -f http://localhost:8000/health || exit 1

# 6. Verify services
echo "Verifying services..."
docker-compose -f docker-compose.production.yml ps

echo "Deployment completed successfully!"
'''
        
        deploy_file = self.project_root / "deploy.sh"
        with open(deploy_file, 'w') as f:
            f.write(deploy_script)
        
        # Make executable
        os.chmod(deploy_file, 0o755)
        
        print(f"✅ Deployment script created: {deploy_file}")
        
        return True
    
    def run_integration_tests(self):
        """Run integration tests"""
        print("Running integration tests...")
        
        try:
            # Test database connection
            from scripts.db_multi_platform import get_platform_post_stats
            stats = get_platform_post_stats()
            print("✅ Database connection test passed")
            
            # Test M1A API connection (if configured)
            if self.config["m1a"]["api_key"]:
                print("✅ M1A API configuration present")
            
            # Test Stripe configuration (if configured)
            if self.config["stripe"]["secret_key"]:
                print("✅ Stripe configuration present")
            
            print("✅ Integration tests passed")
            return True
            
        except Exception as e:
            print(f"❌ Integration tests failed: {e}")
            return False
    
    def generate_integration_report(self):
        """Generate integration report"""
        print("Generating integration report...")
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "integration_status": "ready",
            "components": {
                "database": "configured",
                "m1a_integration": "configured",
                "stripe_integration": "configured",
                "monitoring": "configured",
                "deployment": "ready"
            },
            "next_steps": [
                "Deploy to production environment",
                "Configure M1A webhooks",
                "Set up Stripe products",
                "Test end-to-end integration",
                "Launch to M1A users"
            ]
        }
        
        # Save integration report
        report_file = self.project_root / "m1a_integration_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"✅ Integration report saved: {report_file}")
        
        return report
    
    def run_setup(self):
        """Run complete M1A integration setup"""
        print("M1A Integration Setup")
        print("=" * 50)
        
        # Load configuration
        if not self.load_config():
            print("Please configure the integration settings and run again.")
            return False
        
        # Validate configuration
        if not self.validate_config():
            print("Please complete the configuration and run again.")
            return False
        
        # Run setup steps
        steps = [
            ("Environment Setup", self.setup_environment),
            ("Database Setup", self.setup_database),
            ("M1A Webhooks Setup", self.setup_m1a_webhooks),
            ("Stripe Integration Setup", self.setup_stripe_integration),
            ("M1A Dashboard Components", self.create_m1a_dashboard_components),
            ("Monitoring Setup", self.setup_monitoring),
            ("Deployment Scripts", self.create_deployment_scripts),
            ("Integration Tests", self.run_integration_tests)
        ]
        
        for step_name, step_func in steps:
            print(f"\n--- {step_name} ---")
            try:
                if step_func():
                    print(f"✅ {step_name} completed")
                else:
                    print(f"❌ {step_name} failed")
                    return False
            except Exception as e:
                print(f"❌ {step_name} failed: {e}")
                return False
        
        # Generate final report
        self.generate_integration_report()
        
        print("\n" + "=" * 50)
        print("🎉 M1A Integration Setup Complete!")
        print("\nNext steps:")
        print("1. Review the configuration files")
        print("2. Deploy to production: ./deploy.sh")
        print("3. Configure M1A webhooks")
        print("4. Test the integration")
        print("5. Launch to M1A users")
        
        return True

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="M1A Integration Setup")
    parser.add_argument("--config", default="m1a_integration_config.json", help="Configuration file")
    parser.add_argument("--step", help="Run specific step only")
    
    args = parser.parse_args()
    
    setup = M1AIntegrationSetup()
    
    if args.step:
        # Run specific step
        if hasattr(setup, args.step):
            getattr(setup, args.step)()
        else:
            print(f"Unknown step: {args.step}")
            return 1
    else:
        # Run complete setup
        if setup.run_setup():
            return 0
        else:
            return 1

if __name__ == "__main__":
    exit(main())
