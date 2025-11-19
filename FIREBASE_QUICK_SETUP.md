# Firebase Quick Setup Guide

## ✅ Current Status
- ✅ Real Firebase initialized successfully
- ✅ Authentication working
- ✅ Firestore reads/writes working
- ❌ **Firestore indexes needed** (5 queries)
- ❌ **Storage permissions needed** (image uploads failing)

---

## 🔥 Firebase Storage Rules

Go to [Firebase Console](https://console.firebase.google.com) → Your Project → **Storage** → **Rules**

Replace the rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload their own avatars
    match /avatars/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload their own cover photos
    match /covers/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload posts (photos, videos, audio)
    match /posts/{userId}/{fileName} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload media library items
    match /mediaLibrary/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Click "Publish"** after updating.

---

## 📊 Firestore Indexes Required

Go to [Firebase Console](https://console.firebase.google.com) → Your Project → **Firestore Database** → **Indexes**

Click each link below to auto-create the index, or create manually:

### 1. Posts Index (userId + createdAt)
**Collection:** `posts`
**Fields:**
- `userId` (Ascending)
- `createdAt` (Descending)

**Link:** https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=CkVwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wb3N0cy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC

### 2. Services Index (available + popularity)
**Collection:** `services`
**Fields:**
- `available` (Ascending)
- `popularity` (Descending)

**Link:** https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9zZXJ2aWNlcy9pbmRleGVzL18QARoNCglhdmFpbGFibGUQARoOCgpwb3B1bGFyaXR5EAIaDAoIX19uYW1lX18QAg

### 3. Users Index (private + displayName)
**Collection:** `users`
**Fields:**
- `private` (Ascending)
- `displayName` (Ascending)

**Link:** https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=CkVwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy91c2Vycy9pbmRleGVzL18QARoLCgdwcml2YXRlEAEaDwoLZGlzcGxheU5hbWUQARoMCghfX25hbWVfXxAB

### 4. Conversations Index (participants + lastMessageAt)
**Collection:** `conversations`
**Fields:**
- `participants` (Array Contains)
- `lastMessageAt` (Descending)

**Link:** https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=Ck1wcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9jb252ZXJzYXRpb25zL2luZGV4ZXMvXxABGhAKDHBhcnRpY2lwYW50cxgBGhEKDWxhc3RNZXNzYWdlQXQQAhoMCghfX25hbWVfXxAC

### 5. Wallet Transactions Index (userId + timestamp)
**Collection:** `walletTransactions`
**Fields:**
- `userId` (Ascending)
- `timestamp` (Descending)

**Link:** https://console.firebase.google.com/v1/r/project/m1alive/firestore/indexes?create_composite=ClJwcm9qZWN0cy9tMWFsaXZlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy93YWxsZXRUcmFuc2FjdGlvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaDQoJdGltZXN0YW1wEAIaDAoIX19uYW1lX18QAg

---

## ⏱️ Index Creation Time

**Note:** Indexes can take 1-5 minutes to build. You'll see a status indicator in Firebase Console.

While indexes are building:
- The app will show errors for those queries
- Other features will work normally
- Once indexes are ready, errors will stop

---

## ✅ Verification

After setting up:

1. **Storage Rules:**
   - Try uploading a profile photo → Should work ✅
   - Try uploading a cover photo → Should work ✅

2. **Firestore Indexes:**
   - Check Firebase Console → Indexes tab
   - All 5 indexes should show "Enabled" status
   - App errors should stop once indexes are built

3. **Test the app:**
   - Profile screen should load posts
   - Explore screen should load services
   - Users screen should load users
   - Messages screen should load conversations
   - Wallet screen should load transactions

---

## 🚨 Quick Fix Commands

If you want to test immediately while indexes build, you can temporarily modify queries to not require indexes (but this is not recommended for production):

- Remove `orderBy` clauses (will show unsorted data)
- Remove `where` clauses (will show all data)

**Better approach:** Wait for indexes to build (usually 1-2 minutes).

---

## 📝 Summary

**What you need to do:**
1. ✅ Copy Storage rules → Paste in Firebase Console → Publish
2. ✅ Click all 5 index links above → Create indexes
3. ⏱️ Wait 1-5 minutes for indexes to build
4. ✅ Test the app - all errors should be gone!

**Time required:** ~5 minutes total

