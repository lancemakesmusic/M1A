# Firebase Config Note

## Current Configuration
✅ Firebase config values have been added to `eas.json`

**Note**: The `appId` currently in `eas.json` is for the **web app**. For iOS builds, you may need the iOS-specific app ID.

## How to Get iOS App ID (if needed)

1. Go to: https://console.firebase.google.com/project/m1alive/settings/general
2. Scroll to **"Your apps"** section
3. Look for the **iOS app** (or create one if it doesn't exist)
4. The iOS app ID will look like: `1:83002254287:ios:xxxxxxxxxx`

## Current Values in eas.json
- ✅ `apiKey`: AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ
- ✅ `authDomain`: m1alive.firebaseapp.com
- ✅ `projectId`: m1alive
- ✅ `storageBucket`: m1alive.firebasestorage.app
- ✅ `messagingSenderId`: 83002254287
- ⚠️ `appId`: 1:83002254287:web:b802e1e040cb51494668ba (web app - may need iOS version)

## Testing
The web app ID might work for iOS, but if you encounter issues, update it with the iOS-specific app ID from Firebase Console.

