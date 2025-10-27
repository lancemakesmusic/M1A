# scripts/firebase_simple_setup.py
"""
Simple Firebase Setup Script for M1Autoposter
Creates Firebase project structure without Unicode characters
"""
import os
import json
from pathlib import Path

class FirebaseSimpleSetup:
    """Simple Firebase Setup Manager"""
    
    def __init__(self):
        self.project_root = Path(__file__).resolve().parents[1]
        self.firebase_dir = self.project_root / "firebase"
        
    def create_firebase_structure(self):
        """Create Firebase project structure"""
        print("Creating Firebase project structure...")
        
        # Create Firebase directory
        self.firebase_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (self.firebase_dir / "functions").mkdir(exist_ok=True)
        (self.firebase_dir / "public").mkdir(exist_ok=True)
        
        print(f"Firebase directory created: {self.firebase_dir}")
        return True
    
    def create_firebase_json(self):
        """Create firebase.json configuration"""
        print("Creating firebase.json...")
        
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
        
        firebase_json = self.firebase_dir / "firebase.json"
        with open(firebase_json, 'w') as f:
            json.dump(firebase_config, f, indent=2)
        
        print(f"firebase.json created: {firebase_json}")
        return True
    
    def create_functions_package_json(self):
        """Create package.json for Firebase Functions"""
        print("Creating functions package.json...")
        
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
                "cors": "^2.8.5"
            }
        }
        
        package_json = self.firebase_dir / "functions" / "package.json"
        with open(package_json, 'w') as f:
            json.dump(package_config, f, indent=2)
        
        print(f"Functions package.json created: {package_json}")
        return True
    
    def create_functions_index(self):
        """Create main Firebase Functions file"""
        print("Creating Firebase Functions...")
        
        index_js = '''const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'M1Autoposter Firebase Functions'
  });
});

// Platforms endpoint
app.get('/platforms', (req, res) => {
  const platforms = [
    { id: 'instagram', name: 'Instagram', enabled: true },
    { id: 'twitter', name: 'Twitter/X', enabled: true },
    { id: 'linkedin', name: 'LinkedIn', enabled: true },
    { id: 'youtube', name: 'YouTube Shorts', enabled: true },
    { id: 'tiktok', name: 'TikTok', enabled: true },
    { id: 'facebook', name: 'Facebook', enabled: true }
  ];
  res.json({ platforms });
});

// M1A dashboard endpoint
app.get('/dashboard/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    
    // Get client platforms from Firestore
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

// Export Firebase Function
exports.api = functions.https.onRequest(app);
'''
        
        index_file = self.firebase_dir / "functions" / "index.js"
        with open(index_file, 'w') as f:
            f.write(index_js)
        
        print(f"Firebase Functions created: {index_file}")
        return True
    
    def create_firestore_rules(self):
        """Create Firestore security rules"""
        print("Creating Firestore rules...")
        
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
        
        print(f"Firestore rules created: {rules_file}")
        return True
    
    def create_storage_rules(self):
        """Create Firebase Storage security rules"""
        print("Creating Storage rules...")
        
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
        
        print(f"Storage rules created: {rules_file}")
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
        
        print(f"Firestore indexes created: {indexes_file}")
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
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 20px 0; }
        .platform-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; background: #fafafa; }
        .platform-name { font-weight: bold; color: #333; }
        .status { float: right; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status.active { background: #d4edda; color: #155724; }
        .status.inactive { background: #f8d7da; color: #721c24; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-item { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 5px; }
        .stat-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        .loading { text-align: center; padding: 40px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>M1Autoposter - Social Media Automation</h1>
            <p>Multi-platform social media posting for M1A users</p>
        </div>
        <div id="app">
            <div class="loading">Loading dashboard...</div>
        </div>
    </div>
    <script src="app.js"></script>
</body>
</html>
'''
        
        with open(public_dir / "index.html", 'w') as f:
            f.write(index_html)
        
        # Create app.js
        app_js = '''// Firebase configuration (replace with your config)
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

class M1AutoposterDashboard {
  constructor(tenantId = 'demo-tenant') {
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
      // Load platforms from Firestore
      const platformsRef = db.collection('clients').doc(this.tenantId).collection('platforms');
      const snapshot = await platformsRef.get();
      this.platforms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // If no platforms found, show default platforms
      if (this.platforms.length === 0) {
        this.platforms = [
          { id: 'instagram', name: 'Instagram', enabled: false },
          { id: 'twitter', name: 'Twitter/X', enabled: false },
          { id: 'linkedin', name: 'LinkedIn', enabled: false },
          { id: 'youtube', name: 'YouTube Shorts', enabled: false },
          { id: 'tiktok', name: 'TikTok', enabled: false },
          { id: 'facebook', name: 'Facebook', enabled: false }
        ];
      }
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
      <div class="platforms-section">
        <h2>Connected Platforms</h2>
        <div class="platforms">
          ${this.platforms.map(platform => `
            <div class="platform-card">
              <span class="platform-name">${platform.name || platform.id}</span>
              <span class="status ${platform.enabled ? 'active' : 'inactive'}">
                ${platform.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="stats-section">
        <h2>Posting Statistics</h2>
        <div class="stats">
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
    `;
    
    document.getElementById('app').innerHTML = dashboardHTML;
  }
}

// Initialize dashboard
const dashboard = new M1AutoposterDashboard();
'''
        
        with open(public_dir / "app.js", 'w') as f:
            f.write(app_js)
        
        print("Public files created")
        return True
    
    def create_deployment_guide(self):
        """Create deployment guide"""
        print("Creating deployment guide...")
        
        guide = '''# Firebase Deployment Guide for M1Autoposter

## Prerequisites
1. Install Node.js: https://nodejs.org/
2. Install Firebase CLI: npm install -g firebase-tools
3. Create Firebase project: https://console.firebase.google.com/

## Deployment Steps

### 1. Initialize Firebase Project
```bash
cd firebase
firebase login
firebase init
```

### 2. Configure Firebase Project
- Select your Firebase project
- Enable Hosting, Functions, Firestore, Storage
- Use existing firebase.json (already created)

### 3. Install Dependencies
```bash
cd functions
npm install
```

### 4. Deploy to Firebase
```bash
firebase deploy
```

### 5. Test Deployment
- Visit your Firebase Hosting URL
- Test API endpoints: https://your-project.web.app/api/health
- Test platforms: https://your-project.web.app/api/platforms

## M1A Integration

### 1. Configure M1A Webhooks
Point M1A webhooks to your Firebase Functions:
- Webhook URL: https://your-project.web.app/api/
- Events: user.subscription.created, user.subscription.cancelled

### 2. Update Firebase Config
Edit public/app.js with your Firebase project configuration:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com"
};
```

### 3. Test M1A Integration
- Test M1A authentication
- Test webhook delivery
- Test dashboard functionality

## Firebase Services Used
- **Firebase Hosting**: Static web hosting
- **Firebase Functions**: Serverless API backend
- **Firestore**: NoSQL database
- **Firebase Storage**: File storage
- **Firebase Auth**: User authentication

## Cost Estimation
- **Firebase Hosting**: Free tier (10GB)
- **Firebase Functions**: Free tier (2M invocations/month)
- **Firestore**: Free tier (1GB storage, 50K reads/day)
- **Firebase Storage**: Free tier (5GB)
- **Total**: $0-50/month for small-medium usage

## Benefits of Firebase
- Serverless architecture
- Auto-scaling
- Integrated services
- Cost-effective
- Easy deployment
- Real-time updates
'''
        
        guide_file = self.firebase_dir / "DEPLOYMENT_GUIDE.md"
        with open(guide_file, 'w') as f:
            f.write(guide)
        
        print(f"Deployment guide created: {guide_file}")
        return True
    
    def run_setup(self):
        """Run complete Firebase setup"""
        print("M1Autoposter Firebase Setup")
        print("=" * 50)
        
        steps = [
            ("Firebase Structure", self.create_firebase_structure),
            ("Firebase Config", self.create_firebase_json),
            ("Functions Package", self.create_functions_package_json),
            ("Firebase Functions", self.create_functions_index),
            ("Firestore Rules", self.create_firestore_rules),
            ("Storage Rules", self.create_storage_rules),
            ("Firestore Indexes", self.create_firestore_indexes),
            ("Public Files", self.create_public_files),
            ("Deployment Guide", self.create_deployment_guide)
        ]
        
        for step_name, step_func in steps:
            print(f"\n--- {step_name} ---")
            try:
                if step_func():
                    print(f"OK {step_name} completed")
                else:
                    print(f"FAILED {step_name}")
                    return False
            except Exception as e:
                print(f"FAILED {step_name}: {e}")
                return False
        
        print("\n" + "=" * 50)
        print("Firebase Setup Complete!")
        print(f"\nFirebase project created in: {self.firebase_dir}")
        print("\nNext steps:")
        print("1. Install Node.js and Firebase CLI")
        print("2. Run: cd firebase && firebase init")
        print("3. Run: cd firebase/functions && npm install")
        print("4. Run: firebase deploy")
        print("5. Configure M1A webhooks")
        
        return True

def main():
    """Main entry point"""
    setup = FirebaseSimpleSetup()
    
    if setup.run_setup():
        return 0
    else:
        return 1

if __name__ == "__main__":
    exit(main())
