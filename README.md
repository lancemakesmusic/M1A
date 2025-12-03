# M1A - Merkaba Entertainment Platform

**Version 1.0.0** | **Production Ready** ✅

**M1A** is a comprehensive platform for Merkaba Entertainment, connecting artists, vendors, and fans. Book services, schedule events, manage your wallet, and engage with the community—all in one app.

---

## 🎯 Features

### Core Functionality
- ✅ **Authentication**: Secure email/password login with Firebase Auth
- ✅ **Personalization**: M1A persona system (Guest, Promoter, Coordinator, Wedding Planner, Venue Owner, Performer, Vendor)
- ✅ **Service Booking**: Book recording time, production services with integrated Stripe payments
- ✅ **Event Booking**: Schedule events with automatic Google Calendar sync
- ✅ **Wallet**: Digital wallet with transaction history (MTL features hidden for compliance)
- ✅ **Social Features**: User profiles, messaging, explore feed
- ✅ **Auto-Poster**: AI-powered social media content generation and scheduling
- ✅ **Admin Dashboard**: Complete admin control center for managing users, services, events, and analytics

### Technical Stack
- **Frontend**: React Native with Expo SDK 54
- **Backend**: FastAPI (Python) - Deploy to Google Cloud Run
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Payments**: Stripe (frontend + backend)
- **Calendar**: Google Calendar API with service account
- **Drive**: Google Drive API (optional, for content storage)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+ (for backend)
- Expo CLI: `npm install -g expo-cli eas-cli`
- Google Cloud SDK (for deployment)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lancemakesmusic/M1A.git
   cd M1A
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd autoposter-backend
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   
   Create `.env` in project root:
   ```env
   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...

   # Stripe Configuration
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key

   # Google Calendar
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com

   # API Configuration (REQUIRED FOR PRODUCTION)
   EXPO_PUBLIC_API_BASE_URL=https://your-backend-url.run.app
   ```

   Create `autoposter-backend/.env`:
   ```env
   # Stripe
   STRIPE_SECRET_KEY=sk_live_your_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

   # Google Calendar Service Account
   GOOGLE_SERVICE_ACCOUNT_FILE=./firebase-admin.json
   GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com

   # Firebase Admin
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin.json

   # CORS (for production)
   CORS_ALLOWED_ORIGINS=https://yourdomain.com
   ```

4. **Start development:**
   ```bash
   # Terminal 1: Backend
   cd autoposter-backend
   python -m uvicorn api.main:app --reload --port 8001

   # Terminal 2: Frontend
   npx expo start --clear
   ```

---

## 📚 Setup & Configuration

### 1. Firebase Setup

1. Create project at https://console.firebase.google.com
2. Enable: **Firestore**, **Storage**, **Authentication** (Email/Password)
3. Get config from **Project Settings → Your apps → Web app**
4. Download service account JSON: **Project Settings → Service Accounts → Generate New Private Key**
5. Save as `autoposter-backend/firebase-admin.json` (add to `.gitignore`)

### 2. Stripe Setup

1. Create account at https://dashboard.stripe.com
2. Get API keys from **Developers → API keys**
3. Add publishable key to frontend `.env`
4. Add secret key to backend `.env`
5. Set up webhook endpoint: `https://your-backend-url/api/payments/webhook`
6. **Test cards**: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined)

### 3. Google Calendar Setup

1. Create project at https://console.cloud.google.com
2. Enable **Google Calendar API**
3. Configure **OAuth consent screen** (External):
   - App name, support email
   - Privacy policy URL: `https://www.merkabaent.com/privacypolicy`
   - Add test users: `admin@merkabaent.com`, `brogdon.lance@gmail.com`
4. Create **OAuth 2.0 credentials** (Web application)
5. Add redirect URIs:
   - `m1a://auth/google`
   - `exp://localhost:8081`
   - `https://your-backend-url/auth/callback` (for production)
6. Create business calendar in Google Calendar
7. Get Calendar ID from calendar settings (format: `xxxxx@group.calendar.google.com`)
8. Share calendar with service account email (Editor permissions)

### 4. Google Drive Setup (Optional)

1. Use same service account JSON as Firebase
2. Enable **Google Drive API** in Google Cloud Console
3. Share parent folder with service account email (Editor permissions)
4. Backend automatically creates user folders on account creation

---

## 🚀 Production Deployment

### ⚠️ CRITICAL: Deploy Backend to Cloud

**The app requires backend to be deployed to cloud (not localhost) for production use.**

### Option 1: Google Cloud Run (Recommended)

**Why**: Serverless, auto-scaling, no laptop needed, free tier available

**Steps**:
```bash
# 1. Install Google Cloud SDK
# Windows: Download from https://cloud.google.com/sdk/docs/install

# 2. Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 3. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 4. Deploy backend
cd autoposter-backend
gcloud run deploy m1a-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com"

# 5. Get URL (save this!)
# Output: Service URL: https://m1a-backend-xxxxx-uc.a.run.app

# 6. Update frontend .env
EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app

# 7. Rebuild app
eas build --platform ios --profile production
```

**Cost**: $0-20/month (free tier: 2M requests/month)

**See**: `DEPLOY_TO_CLOUD_NOW.md` for detailed instructions

### Option 2: Firebase Functions

```bash
cd autoposter-backend/firebase
firebase deploy --only functions
```

---

## 🏗️ Project Structure

```
M1A/
├── screens/              # 42 app screens
│   ├── HomeScreen.js
│   ├── EventBookingScreen.js
│   ├── ServiceBookingScreen.js
│   ├── WalletScreen.js
│   └── ... (38 more screens)
├── components/           # Reusable components
├── contexts/             # React contexts (Auth, Theme, etc.)
├── services/             # API integrations
│   ├── StripeService.js
│   ├── GoogleCalendarService.js
│   └── ...
├── navigation/           # Navigation configuration
├── autoposter-backend/   # FastAPI backend
│   ├── api/
│   │   ├── main.py
│   │   ├── payments.py
│   │   └── calendar_events.py
│   └── ...
└── docs/                 # Documentation
```

---

## 🔧 Development

### Available Scripts

```bash
npm start              # Start Expo dev server
npm run ios            # Start iOS simulator
npm run android        # Start Android emulator
npm run lint           # Run ESLint
eas build --platform ios --profile production    # Build iOS
eas build --platform android --profile production # Build Android
```

### Building for Production

**iOS:**
```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

**Android:**
```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

---

## ✅ Production Status

**Version:** 1.0.0  
**Status:** ✅ **Production Ready** (after backend cloud deployment)

### Verified Systems
- ✅ Firebase Authentication & Firestore
- ✅ Stripe Payment Processing
- ✅ Google Calendar Integration (with double-booking prevention)
- ✅ Backend API (FastAPI)
- ✅ Wallet Functionality
- ✅ Service & Event Booking
- ✅ Admin Dashboard
- ✅ User Profiles & Social Features
- ✅ Auto-Poster Content Generation

### Recent Fixes (v1.0.0)
- ✅ Removed duplicate calendar event creation
- ✅ Added backend availability checking
- ✅ Fixed double-booking prevention
- ✅ Removed hardcoded IP addresses
- ✅ Consolidated documentation

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] User authentication (sign up, login, logout)
- [ ] Persona selection and onboarding
- [ ] Service booking with payment
- [ ] Event booking with calendar sync
- [ ] Wallet operations
- [ ] Profile editing
- [ ] Messaging functionality
- [ ] Admin functions (admin@merkabaent.com only)
- [ ] Calendar conflict detection

### Backend Health Check
```bash
curl https://your-backend-url/api/health
curl https://your-backend-url/api/calendar/health
```

---

## 📱 App Store

**Bundle ID:** `com.merkabaent.m1a`  
**App Store Connect:** https://appstoreconnect.apple.com  
**EAS Project:** https://expo.dev/accounts/lancemakesmusic/projects/m1a

**Privacy Policy:** https://www.merkabaent.com/privacypolicy

---

## 🔐 Security

### Credential Management
- ✅ Never commit `.env` files or API keys
- ✅ Stripe secret keys only in backend environment
- ✅ Service account JSON files in `.gitignore`
- ✅ Use environment variables for all sensitive data

### Production Checklist
- [ ] Backend deployed to cloud (not localhost)
- [ ] `EXPO_PUBLIC_API_BASE_URL` set to production URL
- [ ] All hardcoded IPs removed
- [ ] SSL/TLS enabled
- [ ] CORS configured for production domains
- [ ] OAuth redirect URIs updated for production

---

## 🐛 Troubleshooting

### Backend Not Connecting
1. Verify backend is deployed to cloud
2. Check `EXPO_PUBLIC_API_BASE_URL` matches backend URL
3. Test health endpoint: `https://your-backend-url/api/health`

### Stripe Not Working
1. Verify `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env`
2. Check backend has `STRIPE_SECRET_KEY` set
3. Use test cards first: `4242 4242 4242 4242`

### Google Calendar Not Syncing
1. Verify OAuth consent screen configured
2. Check test users added (if in Testing mode)
3. Verify `GOOGLE_BUSINESS_CALENDAR_ID` is correct
4. Ensure service account has calendar access

### OAuth Error 400: invalid_request
1. Check OAuth consent screen has privacy policy URL
2. Verify redirect URIs match exactly
3. Add user email to "Test users" if in Testing mode
4. Wait 5 minutes after changes for propagation

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

**Email:** admin@merkabaent.com  
**Privacy Policy:** https://www.merkabaent.com/privacypolicy

### Resources
- **Firebase Console:** https://console.firebase.google.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Google Cloud Console:** https://console.cloud.google.com
- **EAS Builds:** https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

---

## 📚 Additional Documentation

- **Deployment Guide:** `DEPLOY_TO_CLOUD_NOW.md`
- **App Review:** `FULL_APP_REVIEW_AND_DEPLOYMENT_READINESS.md`
- **System Status:** `SYSTEM_100_PERCENT_COMPLETE.md`
- **Admin Setup:** `docs/ADMIN_SETUP_COMPLETE.md`
- **Role Permissions:** `docs/ROLE_PERMISSIONS_REFERENCE.md`

---

**🎉 M1A v1.0.0 - Production Ready!**

**Last Updated:** November 26, 2024
