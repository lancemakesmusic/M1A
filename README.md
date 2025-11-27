# M1A - Version 1.0

**M1A** is a comprehensive platform for Merkaba Entertainment, connecting artists, vendors, and fans. Book services, schedule events, manage your wallet, and engage with the community—all in one app.

---

## 🎯 Features

### Core Functionality
- **Authentication**: Secure email/password login with Firebase Auth
- **Personalization**: M1A persona system with 6 user types (Artist, Vendor, Fan, Guest, Professional, Creator)
- **Service Booking**: Book recording time, production services, and more with integrated payments
- **Event Booking**: Schedule events with Google Calendar sync
- **Wallet**: Full wallet functionality with QR codes, payment methods, and financial insights
- **Social Features**: User profiles, messaging, explore feed
- **Auto-Poster**: Social media content generation and scheduling across multiple platforms

### Technical Highlights
- **React Native** with Expo SDK 54
- **Firebase** (Auth, Firestore, Storage)
- **Stripe** payment processing (frontend + backend)
- **Google Calendar** integration
- **FastAPI** backend for services and payments
- **Real-time** data synchronization

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.9+ (for backend)
- Expo CLI: `npm install -g expo-cli eas-cli`
- iOS Simulator or Android Emulator (or Expo Go app)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/lancemakesmusic/M1A.git
   cd M1A
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Firebase Configuration
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Stripe Configuration
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key

   # Google Calendar
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
   EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=your_calendar_id

   # API Configuration
   EXPO_PUBLIC_API_BASE_URL=http://localhost:8001
   ```

4. **Start the backend:**
   ```bash
   cd autoposter-backend
   python start_backend.py
   ```
   Keep this terminal open. Backend runs on `http://localhost:8001`

5. **Start the app:**
   ```bash
   npx expo start --clear
   ```
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app (physical device)

---

## 📚 Setup & Configuration

### Initial Setup

#### 1. Firebase Setup
1. Create project at https://console.firebase.google.com
2. Enable: Firestore, Storage, Authentication (Email/Password)
3. Get config from Project Settings → Your apps → Web app
4. Add to `.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
   ```

#### 2. Stripe Setup
1. Create account at https://dashboard.stripe.com
2. Get API keys from Developers → API keys
3. Add to `.env`:
   ```env
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Add to backend `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```
5. **Test cards:** `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined)

#### 3. Google Calendar Setup
1. Create project at https://console.cloud.google.com
2. Enable Google Calendar API
3. Configure OAuth consent screen (External)
4. Create OAuth 2.0 credentials (Web application)
5. Create business calendar in Google Calendar
6. Get Calendar ID from calendar settings
7. Add to `.env`:
   ```env
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com
   ```

#### 4. Google Drive Setup (Optional)
1. Use Firebase service account JSON (same as Firebase setup)
2. Place `firebase-admin.json` in `autoposter-backend/`
3. Share parent folder with service account email (Editor permissions)
4. Set in backend `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin.json
   ```

### Backend Setup

The backend is a FastAPI server located in `autoposter-backend/`:

```bash
cd autoposter-backend
pip install -r requirements.txt
python start_backend.py
```

**Backend Endpoints:**
- Health: `http://localhost:8001/api/payments/health`
- API Docs: `http://localhost:8001/docs`
- Payments: `/api/payments/*`
- Services: `/api/service-booking`
- Events: `/api/event-booking`
- Auto-Poster: `/api/multi-platform/*`

**Backend Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin.json
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://m1alive.firebaseapp.com
```

### Production Deployment

#### Option 1: Google Cloud Run (Recommended)
- **Cost:** Free tier (2M requests/month)
- **Setup:** 15 minutes
- **Steps:**
  1. Install Google Cloud SDK
  2. `gcloud auth login`
  3. `gcloud projects create m1a-backend`
  4. `cd autoposter-backend && ./deploy-cloud-run.ps1`
  5. Update `EXPO_PUBLIC_API_BASE_URL` to Cloud Run URL

#### Option 2: Firebase Hosting + Functions
- **Cost:** Free tier
- **Setup:** 30 minutes
- **Steps:**
  1. `npm install -g firebase-tools`
  2. `firebase login`
  3. `cd autoposter-backend/firebase && firebase init`
  4. `firebase deploy --only functions,hosting`

#### Option 3: Vercel/Netlify (Frontend Only)
- **Cost:** Free tier
- **Steps:**
  1. `npx expo export:web`
  2. Deploy `web-build` folder

**Update OAuth Redirect URIs** in Google Cloud Console after deployment.

---

## 🏗️ Project Structure

```
M1A/
├── screens/              # Main app screens
│   ├── HomeScreen.js
│   ├── ExploreScreen.js
│   ├── WalletScreen.js
│   ├── MessagesScreen.js
│   └── ...
├── components/           # Reusable components
│   ├── TutorialOverlay.js
│   ├── ErrorRecovery.js
│   └── ...
├── contexts/             # React contexts
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── ...
├── services/             # API and service integrations
│   ├── StripeService.js
│   ├── GoogleCalendarService.js
│   └── ...
├── navigation/           # Navigation configuration
│   ├── AppNavigator.js
│   ├── DrawerNavigator.js
│   └── ...
├── M1A/                 # M1A personalization system
│   ├── personas.js
│   └── ...
└── autoposter-backend/  # FastAPI backend
    ├── api/
    ├── scripts/
    └── ...
```

---

## 🔧 Development

### Available Scripts

```bash
npm start              # Start Expo dev server
npm run ios            # Start iOS simulator
npm run android        # Start Android emulator
npm run lint           # Run ESLint
npm run build:ios      # Build iOS app (EAS)
npm run build:android  # Build Android app (EAS)
npm run submit:ios     # Submit to App Store
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

See [UPDATE_TESTFLIGHT.md](UPDATE_TESTFLIGHT.md) for detailed instructions.

---

## ✅ Production Status

**Version:** 1.0.0  
**Status:** ✅ **100% Production Ready**

### Verified Systems
- ✅ Firebase Authentication & Firestore
- ✅ Stripe Payment Processing (Frontend + Backend)
- ✅ Google Calendar Integration
- ✅ Backend API (FastAPI)
- ✅ Wallet Functionality
- ✅ Service & Event Booking
- ✅ User Profiles & Social Features

### Environment
- **Frontend**: React Native (Expo SDK 54)
- **Backend**: FastAPI (Python)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Payments**: Stripe
- **Calendar**: Google Calendar API

---

## 🧪 Testing

### Verify Setup
```bash
node scripts/verify-all.js
```

This checks:
- Environment variables
- Backend connectivity
- Stripe configuration
- Google Calendar setup

### Manual Testing Checklist
- [ ] User authentication (sign up, login, logout, password reset)
- [ ] Persona selection and onboarding
- [ ] Service booking with payment
- [ ] Event booking with calendar sync
- [ ] Wallet operations (add funds, view transactions, QR codes)
- [ ] Profile editing (avatar, cover photo, bio, social links)
- [ ] Messaging functionality
- [ ] Explore feed and search
- [ ] Post creation (photo, video, audio)
- [ ] Auto-Poster content generation and scheduling
- [ ] Google Drive integration (if configured)

---

## 📱 App Store & TestFlight

**Bundle ID:** `com.merkabaent.m1a`  
**App Store Connect:** https://appstoreconnect.apple.com  
**EAS Project:** https://expo.dev/accounts/lancemakesmusic/projects/m1a

### Building & Submitting

**Build for iOS:**
```bash
eas build --platform ios --profile production
```

**Submit to TestFlight:**
```bash
eas submit --platform ios --profile production
```

**Or build and submit in one command:**
```bash
eas build --platform ios --profile production --auto-submit
```

**Check build status:**
- Visit: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

### Current Build
- **Version:** 1.0.0
- **Build Number:** Auto-incremented (remote source)
- **Status:** Production ready

---

## 🔐 Security Notes

### Credential Management
- ✅ Never commit `.env` files or API keys
- ✅ Stripe secret keys only in backend environment
- ✅ Firebase credentials are safe for frontend (public config)
- ✅ Use environment variables for all sensitive data
- ✅ Service account JSON files should be restricted (Windows: `icacls file.json /inheritance:r`)

### OAuth Security
- ✅ Configure OAuth consent screen with privacy policy and terms URLs
- ✅ Add test users if app is in Testing mode
- ✅ Use HTTPS for all production redirect URIs
- ✅ Rotate service account keys every 90 days

### Production Checklist
- [ ] `.env` in `.gitignore`
- [ ] Service account files in `.gitignore`
- [ ] File permissions restricted
- [ ] SSL/TLS enabled
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled

---

## 🐛 Troubleshooting

### Backend Not Connecting
1. Check backend is running: `http://localhost:8001/api/payments/health`
2. Verify `.env` has correct `EXPO_PUBLIC_API_BASE_URL`
3. For physical device, use network IP: `http://192.168.1.111:8001`

### Stripe Not Working
1. Verify `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env`
2. Check backend has `STRIPE_SECRET_KEY` set
3. Test with Stripe test cards first

### Google Calendar Not Syncing
1. Verify OAuth consent screen is configured
2. Check `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID`
3. Ensure Calendar API is enabled in Google Cloud Console
4. Add test users to OAuth consent screen if in Testing mode

### Google OAuth Error 400: invalid_request
1. **Check OAuth consent screen:**
   - Privacy policy URL must be set and accessible
   - Terms of service URL must be set and accessible
   - App name and support email required
2. **Check redirect URIs:**
   - Must match exactly (including protocol: `exp://`, `http://`, `https://`)
   - Add all redirect URIs your app uses
3. **If in Testing mode:**
   - Add user email to "Test users" list
   - Wait 5 minutes after changes for propagation

### Google Drive Not Working
1. Verify service account JSON file exists in `autoposter-backend/`
2. Check service account email has Editor access to parent folder
3. Verify `GOOGLE_APPLICATION_CREDENTIALS` path in backend `.env`
4. Ensure Google Drive API is enabled in Google Cloud Console

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built for **Merkaba Entertainment** - Connecting artists, vendors, and fans in one platform.

**Version 1.0** - November 2025

---

## 📞 Support & Troubleshooting

### Quick Fixes
- **Backend not connecting:** Check `EXPO_PUBLIC_API_BASE_URL` matches backend URL
- **Payments failing:** Verify Stripe keys are correct (test vs live)
- **OAuth errors:** Check OAuth consent screen configuration and redirect URIs
- **Build errors:** Clear cache with `npx expo start --clear`

### Verification Scripts
```bash
# Verify all environment variables
node scripts/verify-all.js

# Verify Google Drive setup (backend)
cd autoposter-backend
python check_google_drive_setup.py
```

### Additional Resources
- **Firebase Console:** https://console.firebase.google.com
- **Stripe Dashboard:** https://dashboard.stripe.com
- **Google Cloud Console:** https://console.cloud.google.com
- **EAS Builds:** https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

---

**🎉 M1A v1.0 - Production Ready!**

**Last Updated:** November 26, 2024
