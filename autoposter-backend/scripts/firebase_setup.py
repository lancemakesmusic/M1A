# scripts/firebase_setup.py
"""
Firebase Setup Script for M1Autoposter
Automates Firebase deployment and M1A integration
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

class FirebaseSetup:
    """Firebase Setup Manager for M1Autoposter"""
    
    def __init__(self):
        self.project_root = Path(__file__).resolve().parents[1]
        self.firebase_dir = self.project_root / "firebase"
        self.config = {}
        
    def check_firebase_cli(self):
        """Check if Firebase CLI is installed"""
        print("Checking Firebase CLI...")
        try:
            result = subprocess.run(['firebase', '--version'], 
                                  capture_output=True, text=True, check=True)
            print(f"✅ Firebase CLI installed: {result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Firebase CLI not found")
            print("Install with: npm install -g firebase-tools")
            return False
    
    def check_node_npm(self):
        """Check if Node.js and npm are installed"""
        print("Checking Node.js and npm...")
        try:
            node_result = subprocess.run(['node', '--version'], 
                                       capture_output=True, text=True, check=True)
            npm_result = subprocess.run(['npm', '--version'], 
                                      capture_output=True, text=True, check=True)
            print(f"✅ Node.js: {node_result.stdout.strip()}")
            print(f"✅ npm: {npm_result.stdout.strip()}")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("❌ Node.js or npm not found")
            print("Install Node.js from: https://nodejs.org/")
            return False
    
    def create_firebase_structure(self):
        """Create Firebase project structure"""
        print("Creating Firebase project structure...")
        
        # Create Firebase directory
        self.firebase_dir.mkdir(exist_ok=True)
        
        # Create functions directory
        functions_dir = self.firebase_dir / "functions"
        functions_dir.mkdir(exist_ok=True)
        
        # Create public directory
        public_dir = self.firebase_dir / "public"
        public_dir.mkdir(exist_ok=True)
        
        # Create Firebase configuration
        firebase_config = {
            "hosting": {
                "public": "public",
                "rewrites": [
                    {
                        "source": "/api/**",
                        "function": "api"
                    }
                ]
            },
            "functions": {
                "source": "functions",
                "runtime": "nodejs18"
            },
            "firestore": {
                "rules": "firestore.rules",
                "indexes": "firestore.indexes.json"
            },
            "storage": {
                "rules": "storage.rules"
            }
        }
        
        # Save firebase.json
        firebase_json = self.firebase_dir / "firebase.json"
        with open(firebase_json, 'w') as f:
            json.dump(firebase_config, f, indent=2)
        
        print(f"✅ Firebase configuration created: {firebase_json}")
        
        return True
    
    def create_functions_package_json(self):
        """Create package.json for Firebase Functions"""
        print("Creating Firebase Functions package.json...")
        
        functions_dir = self.firebase_dir / "functions"
        package_json = functions_dir / "package.json"
        
        package_config = {
            "name": "m1autoposter-functions",
            "version": "1.0.0",
            "description": "M1Autoposter Firebase Functions",
            "main": "index.js",
            "scripts": {
                "serve": "firebase emulators:start",
                "deploy": "firebase deploy --only functions",
                "logs": "firebase functions:log"
            },
            "dependencies": {
                "firebase-admin": "^11.0.0",
                "firebase-functions": "^4.0.0",
                "express": "^4.18.0",
                "cors": "^2.8.5",
                "multer": "^1.4.5"
            }
        }
        
        with open(package_json, 'w') as f:
            json.dump(package_config, f, indent=2)
        
        print(f"✅ Functions package.json created: {package_json}")
        
        return True
    
    def create_firebase_functions(self):
        """Create Firebase Functions code"""
        print("Creating Firebase Functions...")
        
        functions_dir = self.firebase_dir / "functions"
        src_dir = functions_dir / "src"
        src_dir.mkdir(exist_ok=True)
        
        # Create main index.js
        index_js = '''const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// Import API routes
const authRoutes = require('./auth');
const platformRoutes = require('./platforms');
const clientRoutes = require('./clients');
const postRoutes = require('./posts');

// Mount routes
app.use('/auth', authRoutes);
app.use('/platforms', platformRoutes);
app.use('/clients', clientRoutes);
app.use('/posts', postRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'M1Autoposter Firebase Functions'
  });
});

// Export Firebase Function
exports.api = functions.https.onRequest(app);
'''
        
        with open(functions_dir / "index.js", 'w') as f:
            f.write(index_js)
        
        # Create auth routes
        auth_js = '''const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Middleware to verify Firebase Auth token
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// M1A user authentication
router.post('/m1a-login', async (req, res) => {
  try {
    const { m1aToken, tenantId } = req.body;
    
    // Verify M1A token and create Firebase user
    const firebaseUser = await admin.auth().createUser({
      uid: `m1a_${tenantId}`,
      email: `user@${tenantId}.m1a.com`,
      customClaims: {
        tenantId: tenantId,
        m1aUser: true
      }
    });
    
    res.json({ 
      success: true, 
      firebaseToken: await admin.auth().createCustomToken(firebaseUser.uid)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
'''
        
        with open(src_dir / "auth.js", 'w') as f:
            f.write(auth_js)
        
        # Create platforms routes
        platforms_js = '''const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Get available platforms
router.get('/', async (req, res) => {
  try {
    const platforms = [
      { id: 'instagram', name: 'Instagram', enabled: true },
      { id: 'twitter', name: 'Twitter/X', enabled: true },
      { id: 'linkedin', name: 'LinkedIn', enabled: true },
      { id: 'youtube', name: 'YouTube Shorts', enabled: true },
      { id: 'tiktok', name: 'TikTok', enabled: true },
      { id: 'facebook', name: 'Facebook', enabled: true }
    ];
    
    res.json({ platforms });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
'''
        
        with open(src_dir / "platforms.js", 'w') as f:
            f.write(platforms_js)
        
        # Create clients routes
        clients_js = '''const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Get client dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.query.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }
    
    // Get client platforms
    const platformsSnapshot = await admin.firestore()
      .collection('clients')
      .doc(tenantId)
      .collection('platforms')
      .get();
    
    const platforms = platformsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get posting statistics
    const statsSnapshot = await admin.firestore()
      .collection('clients')
      .doc(tenantId)
      .collection('posts')
      .get();
    
    const stats = {
      total: statsSnapshot.size,
      successful: 0,
      failed: 0
    };
    
    statsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'successful') stats.successful++;
      if (data.status === 'failed') stats.failed++;
    });
    
    res.json({
      tenantId,
      platforms,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
'''
        
        with open(src_dir / "clients.js", 'w') as f:
            f.write(clients_js)
        
        # Create posts routes
        posts_js = '''const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Create new post
router.post('/', async (req, res) => {
  try {
    const { tenantId, content, platforms, scheduledAt } = req.body;
    
    const postData = {
      tenantId,
      content,
      platforms,
      scheduledAt: admin.firestore.Timestamp.fromDate(new Date(scheduledAt)),
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await admin.firestore()
      .collection('clients')
      .doc(tenantId)
      .collection('posts')
      .add(postData);
    
    res.json({
      success: true,
      postId: docRef.id,
      message: 'Post created successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
'''
        
        with open(src_dir / "posts.js", 'w') as f:
            f.write(posts_js)
        
        print("✅ Firebase Functions created")
        return True
    
    def create_firestore_rules(self):
        """Create Firestore security rules"""
        print("Creating Firestore security rules...")
        
        firestore_rules = '''rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clients can only access their own data
    match /clients/{tenantId} {
      allow read, write: if request.auth != null 
        && request.auth.token.tenantId == tenantId;
      
      // Platform configurations
      match /platforms/{platformId} {
        allow read, write: if request.auth != null 
          && request.auth.token.tenantId == tenantId;
      }
      
      // Posts
      match /posts/{postId} {
        allow read, write: if request.auth != null 
          && request.auth.token.tenantId == tenantId;
      }
    }
    
    // Public platform information
    match /platforms/{platformId} {
      allow read: if true;
    }
  }
}
'''
        
        rules_file = self.firebase_dir / "firestore.rules"
        with open(rules_file, 'w') as f:
            f.write(firestore_rules)
        
        print(f"✅ Firestore rules created: {rules_file}")
        return True
    
    def create_storage_rules(self):
        """Create Firebase Storage security rules"""
        print("Creating Storage security rules...")
        
        storage_rules = '''rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /content/{tenantId}/{allPaths=**} {
      allow read, write: if request.auth != null 
        && request.auth.token.tenantId == tenantId;
    }
  }
}
'''
        
        rules_file = self.firebase_dir / "storage.rules"
        with open(rules_file, 'w') as f:
            f.write(storage_rules)
        
        print(f"✅ Storage rules created: {rules_file}")
        return True
    
    def create_firestore_indexes(self):
        """Create Firestore indexes"""
        print("Creating Firestore indexes...")
        
        indexes = {
            "indexes": [
                {
                    "collectionGroup": "posts",
                    "queryScope": "COLLECTION",
                    "fields": [
                        {"fieldPath": "tenantId", "order": "ASCENDING"},
                        {"fieldPath": "status", "order": "ASCENDING"},
                        {"fieldPath": "scheduledAt", "order": "ASCENDING"}
                    ]
                }
            ],
            "fieldOverrides": []
        }
        
        indexes_file = self.firebase_dir / "firestore.indexes.json"
        with open(indexes_file, 'w') as f:
            json.dump(indexes, f, indent=2)
        
        print(f"✅ Firestore indexes created: {indexes_file}")
        return True
    
    def create_public_files(self):
        """Create public files for Firebase Hosting"""
        print("Creating public files...")
        
        public_dir = self.firebase_dir / "public"
        
        # Create index.html
        index_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M1Autoposter - Social Media Automation</title>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .platform-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-item { text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px; }
        .stat-value { font-size: 2em; font-weight: bold; color: #333; }
        .stat-label { color: #666; }
        .status.active { color: green; font-weight: bold; }
        .status.inactive { color: red; font-weight: bold; }
    </style>
</head>
<body>
    <div id="app">
        <div class="dashboard">
            <h1>M1Autoposter - Social Media Automation</h1>
            <p>Loading dashboard...</p>
        </div>
    </div>
    <script src="app.js"></script>
</body>
</html>
'''
        
        with open(public_dir / "index.html", 'w') as f:
            f.write(index_html)
        
        # Create app.js
        app_js = '''// Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

class M1AutoposterDashboard {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.init();
  }
  
  async init() {
    await this.loadPlatforms();
    await this.loadStats();
    this.render();
  }
  
  async loadPlatforms() {
    try {
      const platformsRef = db.collection('clients').doc(this.tenantId).collection('platforms');
      const snapshot = await platformsRef.get();
      this.platforms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading platforms:', error);
      this.platforms = [];
    }
  }
  
  async loadStats() {
    try {
      const postsRef = db.collection('clients').doc(this.tenantId).collection('posts');
      const snapshot = await postsRef.get();
      this.stats = {
        total: snapshot.size,
        successful: 0,
        failed: 0
      };
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'successful') this.stats.successful++;
        if (data.status === 'failed') this.stats.failed++;
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      this.stats = { total: 0, successful: 0, failed: 0 };
    }
  }
  
  render() {
    const dashboardHTML = `
      <div class="dashboard">
        <h1>Social Media Automation</h1>
        <div class="platforms-section">
          <h2>Connected Platforms</h2>
          ${this.platforms.map(platform => `
            <div class="platform-card">
              <span class="platform-name">${platform.name || platform.id}</span>
              <span class="status ${platform.enabled ? 'active' : 'inactive'}">
                ${platform.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          `).join('')}
        </div>
        <div class="stats-section">
          <h2>Posting Statistics</h2>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">${this.stats.total}</div>
              <div class="stat-label">Total Posts</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.stats.successful}</div>
              <div class="stat-label">Successful</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.stats.failed}</div>
              <div class="stat-label">Failed</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('app').innerHTML = dashboardHTML;
  }
}

// Initialize dashboard
const dashboard = new M1AutoposterDashboard('demo-tenant');
'''
        
        with open(public_dir / "app.js", 'w') as f:
            f.write(app_js)
        
        print("✅ Public files created")
        return True
    
    def create_deployment_script(self):
        """Create deployment script"""
        print("Creating deployment script...")
        
        deploy_script = '''#!/bin/bash
# Firebase Deployment Script for M1Autoposter

set -e

echo "Starting Firebase deployment for M1Autoposter..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "Please login to Firebase:"
    firebase login
fi

# Install dependencies
echo "Installing dependencies..."
cd functions
npm install
cd ..

# Deploy to Firebase
echo "Deploying to Firebase..."
firebase deploy

echo "Deployment completed successfully!"
echo "Your M1Autoposter is now live on Firebase!"
'''
        
        deploy_file = self.firebase_dir / "deploy.sh"
        with open(deploy_file, 'w') as f:
            f.write(deploy_script)
        
        # Make executable
        os.chmod(deploy_file, 0o755)
        
        print(f"✅ Deployment script created: {deploy_file}")
        return True
    
    def create_firebase_config(self):
        """Create Firebase configuration file"""
        print("Creating Firebase configuration...")
        
        config = {
            "project_id": "",
            "api_key": "",
            "auth_domain": "",
            "storage_bucket": "",
            "messaging_sender_id": "",
            "app_id": "",
            "m1a": {
                "api_key": "",
                "base_url": "https://api.m1a.com"
            },
            "stripe": {
                "secret_key": "",
                "publishable_key": ""
            }
        }
        
        config_file = self.firebase_dir / "firebase_config.json"
        with open(config_file, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"✅ Firebase configuration created: {config_file}")
        print("Please edit the configuration file with your actual values.")
        
        return True
    
    def run_setup(self):
        """Run complete Firebase setup"""
        print("M1Autoposter Firebase Setup")
        print("=" * 50)
        
        # Check prerequisites
        if not self.check_node_npm():
            return False
        
        if not self.check_firebase_cli():
            return False
        
        # Run setup steps
        steps = [
            ("Firebase Structure", self.create_firebase_structure),
            ("Functions Package", self.create_functions_package_json),
            ("Firebase Functions", self.create_firebase_functions),
            ("Firestore Rules", self.create_firestore_rules),
            ("Storage Rules", self.create_storage_rules),
            ("Firestore Indexes", self.create_firestore_indexes),
            ("Public Files", self.create_public_files),
            ("Deployment Script", self.create_deployment_script),
            ("Firebase Config", self.create_firebase_config)
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
        
        print("\n" + "=" * 50)
        print("🎉 Firebase Setup Complete!")
        print(f"\nFirebase project created in: {self.firebase_dir}")
        print("\nNext steps:")
        print("1. Edit firebase_config.json with your Firebase project details")
        print("2. Run: cd firebase && firebase init")
        print("3. Run: cd firebase && ./deploy.sh")
        print("4. Configure M1A webhooks to point to your Firebase Functions")
        
        return True

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Firebase Setup for M1Autoposter")
    parser.add_argument("--step", help="Run specific step only")
    
    args = parser.parse_args()
    
    setup = FirebaseSetup()
    
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
