# Get Firebase Config for EAS Build

## Quick Steps to Get Firebase Config

1. **Go to Firebase Console**: https://console.firebase.google.com/project/m1alive/settings/general
2. **Scroll down to "Your apps"** section
3. **Click on the iOS app** (or create one if it doesn't exist)
4. **Copy the config values** from the Firebase SDK snippet

Or use this direct link:
👉 https://console.firebase.google.com/project/m1alive/settings/general

## Firebase Config Values Needed

You'll see something like this in Firebase Console:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "m1alive.firebaseapp.com",
  projectId: "m1alive",
  storageBucket: "m1alive.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:ios:abcdef"
};
```

## Add to eas.json

Once you have the values, they'll be added to `eas.json` in the production env section.

