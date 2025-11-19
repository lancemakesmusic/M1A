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
- **Auto-Poster**: Social media content generation and scheduling (coming soon)

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

## 📚 Documentation

### Setup Guides
- **[Stripe Setup](SETUP_STRIPE.md)**: Configure payment processing
- **[Google Calendar Setup](GOOGLE_CALENDAR_SETUP.md)**: Set up calendar integration
- **[TestFlight Updates](UPDATE_TESTFLIGHT.md)**: How to update TestFlight builds

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

**Backend Environment Variables:**
```env
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

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
- [ ] User authentication (sign up, login, logout)
- [ ] Persona selection and onboarding
- [ ] Service booking with payment
- [ ] Event booking with calendar sync
- [ ] Wallet operations (add funds, view transactions)
- [ ] Profile editing (avatar, cover photo)
- [ ] Messaging functionality
- [ ] Explore feed and search

---

## 📱 App Store

**Bundle ID:** `com.merkabaent.m1a`  
**App Store Connect:** https://appstoreconnect.apple.com  
**EAS Project:** https://expo.dev/accounts/lancemakesmusic/projects/m1a

### Current Build
- **Version:** 1.0.0
- **Build Number:** Auto-incremented (remote source)
- **Status:** Production ready

---

## 🔐 Security Notes

- Never commit `.env` files or API keys
- Stripe secret keys only in backend environment
- Firebase credentials are safe for frontend (public config)
- Use environment variables for all sensitive data

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

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built for **Merkaba Entertainment** - Connecting artists, vendors, and fans in one platform.

**Version 1.0** - November 2025

---

## 📞 Support

For issues or questions:
- Check documentation in `/docs` (if applicable)
- Review setup guides: [SETUP_STRIPE.md](SETUP_STRIPE.md), [GOOGLE_CALENDAR_SETUP.md](GOOGLE_CALENDAR_SETUP.md)
- Verify system status: `node scripts/verify-all.js`

---

**🎉 M1A v1.0 - Production Ready!**
