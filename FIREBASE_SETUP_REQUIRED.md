# Firebase Setup Required

## ⚠️ Critical: Real Firebase Configuration Required

The app now uses **REAL Firebase only** - all mock implementations have been removed. 

**✅ GOOD NEWS:** Your Firebase credentials are already configured and working! You just need to set up Storage rules and Firestore indexes.

**👉 See `FIREBASE_QUICK_SETUP.md` for step-by-step instructions with clickable links!**

## Required Environment Variables

Add these to your `.env` file in the project root:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Firebase Storage Permissions

You're seeing `storage/unauthorized` errors. Configure Firebase Storage rules:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Storage** → **Rules**
4. Update rules to allow authenticated users to upload:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload their own avatars and covers
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /covers/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    // Allow authenticated users to upload posts
    match /posts/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Firestore Indexes Required

You're seeing index errors for posts. Create the required index:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Indexes**
4. Click the link in the error message, or manually create:

**Collection:** `posts`
**Fields:**
- `userId` (Ascending)
- `createdAt` (Descending)

## Firestore Security Rules

Update Firestore rules to allow authenticated access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Posts collection
    match /posts/{postId} {
      allow read: if true; // Public read
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Wallet transactions
    match /walletTransactions/{transactionId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Services, events, etc.
    match /services/{serviceId} {
      allow read: if true;
      allow write: if request.auth != null; // Admin only in production
    }
    
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null; // Admin only in production
    }
  }
}
```

## Testing

After configuring:
1. Restart Expo: `npx expo start --clear`
2. Test image uploads (should work with proper Storage rules)
3. Test Firestore reads/writes (should work with proper rules)
4. Check console for any remaining errors

## Current Status

✅ Real Firebase initialized successfully
✅ All mock implementations removed
⚠️ Storage permissions need configuration
⚠️ Firestore indexes need creation
⚠️ Firestore security rules need setup

