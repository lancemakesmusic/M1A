# Firebase Deployment Guide for M1Autoposter

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
