# Fresh Build Setup - Build #11

## Problem Identified
- Previous builds (#9, #10) were missing Firebase environment variables
- App was non-functional in TestFlight because Firebase couldn't initialize

## Solution
1. ✅ Incremented build number to **11**
2. ⏳ Need to add Firebase environment variables to `eas.json`
3. ⏳ Create fresh build with proper configuration
4. ⏳ Submit to TestFlight

## Next Steps

### Step 1: Get Firebase Config
See `GET_FIREBASE_CONFIG.md` for instructions on getting your Firebase config values.

### Step 2: Add to eas.json
Once you have the Firebase config values, they need to be added to `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_FIREBASE_API_KEY": "your_api_key",
        "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN": "m1alive.firebaseapp.com",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "m1alive",
        "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET": "m1alive.appspot.com",
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID": "your_sender_id",
        "EXPO_PUBLIC_FIREBASE_APP_ID": "your_app_id"
      }
    }
  }
}
```

### Step 3: Create Fresh Build
```bash
eas build --platform ios --profile production --non-interactive
```

### Step 4: Submit to TestFlight
```bash
eas submit --platform ios --profile production --latest --non-interactive
```

## Current Status
- ✅ Build number incremented to 11
- ⏳ Waiting for Firebase config values
- ⏳ Ready to create fresh build once config is added

