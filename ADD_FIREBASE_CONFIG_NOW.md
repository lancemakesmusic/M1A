# ⚠️ CRITICAL: Add Firebase Config to eas.json

## Problem
Builds #9 and #10 were non-functional because Firebase environment variables were missing from the EAS build configuration.

## Solution
Add Firebase config values to `eas.json` before building.

## Quick Steps

### 1. Get Firebase Config Values

**Option A: Firebase Console (Recommended)**
1. Go to: https://console.firebase.google.com/project/m1alive/settings/general
2. Scroll to **"Your apps"** section
3. Click on your **iOS app** (or create one if it doesn't exist)
4. Copy the config values from the Firebase SDK snippet

**Option B: Run Helper Script**
```bash
node scripts/get-firebase-config.js
```

### 2. Update eas.json

Open `eas.json` and fill in the empty values in the `production.env` section:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "PASTE_YOUR_API_KEY_HERE",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "m1alive.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "m1alive",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "m1alive.appspot.com",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "PASTE_YOUR_SENDER_ID_HERE",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "PASTE_YOUR_APP_ID_HERE"
      }
    }
  }
}
```

### 3. Create Fresh Build

Once `eas.json` is updated with Firebase config:

```bash
eas build --platform ios --profile production --non-interactive
```

### 4. Submit to TestFlight

```bash
eas submit --platform ios --profile production --latest --non-interactive
```

## Current Status
- ✅ Build number incremented to **11**
- ✅ `eas.json` structure ready (needs values filled in)
- ⏳ **WAITING**: Firebase config values need to be added
- ⏳ Ready to build once config is complete

## What You'll See in Firebase Console

The config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // ← Copy this
  authDomain: "m1alive.firebaseapp.com",  // ← Already set
  projectId: "m1alive",  // ← Already set
  storageBucket: "m1alive.appspot.com",  // ← Already set
  messagingSenderId: "123456789",  // ← Copy this
  appId: "1:123456789:ios:abcdef123456"  // ← Copy this
};
```

## Notes
- `authDomain`, `projectId`, and `storageBucket` are already filled in based on project name
- You only need to get: `apiKey`, `messagingSenderId`, and `appId` from Firebase Console
- These values are safe to commit (they're public client-side config)

