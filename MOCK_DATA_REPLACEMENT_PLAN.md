# Mock Data Replacement Plan
## Complete list of all mock-ups to replace with real implementations

### 🔴 CRITICAL - Profile & User Data
1. **Profile Photo/Header Upload** ✅ FIXING NOW
   - Issue: Images upload but don't display after upload
   - Location: `screens/ProfileScreen.js`, `screens/ProfileEditScreen.js`
   - Fix: Add cache busting, ensure context refresh, verify storage URLs

2. **Mock Profile Stats** (followers, following, posts)
   - Location: `screens/ProfileScreen.js` lines 28-33
   - Replace with: Real Firestore queries counting:
     - Followers: `followers` subcollection count
     - Following: `following` subcollection count  
     - Posts: `posts` collection filtered by userId

3. **Mock Profile Posts**
   - Location: `screens/ProfileScreen.js` lines 35-62
   - Replace with: Real Firestore `posts` collection query filtered by userId

### 🔴 CRITICAL - Firebase Core
4. **Mock Firebase Auth**
   - Location: `firebase.js` lines 68-243
   - Replace with: Real Firebase Auth initialization
   - Requires: Proper Firebase config with API keys

5. **Mock Firestore**
   - Location: `firebase.js` lines 85-119
   - Replace with: Real Firestore initialization
   - Requires: Firebase project with Firestore enabled

6. **Mock Firebase Storage**
   - Location: `firebase.js` lines 127-136, 428-440
   - Replace with: Real Firebase Storage
   - Requires: Firebase Storage bucket configured
   - **This is why profile photos don't work!**

### 🟡 HIGH PRIORITY - Wallet & Payments
7. **Mock Wallet Transactions**
   - Location: `screens/WalletScreen.js` lines 46-93
   - Replace with: Real Firestore `walletTransactions` collection
   - Query: Filter by userId, order by timestamp desc

8. **Mock Payment Methods**
   - Location: `screens/WalletScreen.js` lines 95-119
   - Replace with: Real Stripe API call to `paymentMethods.list()`
   - Service: Create `services/StripePaymentMethodsService.js`

### 🟡 HIGH PRIORITY - Messaging
9. **Mock Conversations**
   - Location: `screens/MessagesScreen.js` lines 21-58
   - Replace with: Real Firestore `conversations` collection
   - Query: Filter by participants array containing userId

10. **Mock Users in Messages**
    - Location: `screens/MessagesScreen.js` lines 60-81
    - Replace with: Real Firestore `users` collection
    - Query: Filter by private: false, exclude current user

### 🟡 HIGH PRIORITY - Dashboard
11. **Mock Dashboard Stats**
    - Location: `screens/M1ADashboardScreen.js` lines 60-99
    - Replace with: Real backend API calls to `/api/dashboard/stats`
    - Or: Real Firestore aggregations for events, tasks, revenue

### 🟢 MEDIUM PRIORITY - Explore & Services
12. **Mock Service Items** (partially real)
    - Location: `screens/ExploreScreen.js` lines 33-213
    - Status: Some services are real (from Square site), but stored as mock
    - Replace with: Real Firestore `services` collection
    - Action: Migrate current service data to Firestore

13. **Mock Bar Menu Items**
    - Location: `screens/BarMenuScreen.js`, `screens/BarMenuCategoryScreen.js`
    - Replace with: Real Firestore `barMenuItems` collection
    - Query: Filter by category, available: true

14. **Mock Event Items**
    - Location: `screens/ExploreScreen.js` (NYE 2026 RSVP)
    - Replace with: Real Firestore `events` collection
    - Query: Filter by date >= today, order by date

### 🟢 MEDIUM PRIORITY - AutoPoster
15. **Mock AutoPoster Status**
    - Location: `autoposter-backend/robust_api.py` line 60
    - Replace with: Real backend API status check
    - Endpoint: `/api/autoposter/status`

### 🔵 LOW PRIORITY - Notifications
16. **Mock Push Notifications**
    - Location: `services/NotificationService.js`
    - Status: Uses Expo notifications but may need real FCM setup
    - Action: Verify Expo push tokens are working, configure FCM if needed

---

## Implementation Priority Order

### Phase 1: CRITICAL (Do First)
1. ✅ Fix profile photo/header upload display issue
2. Replace mock Firebase Storage with real Firebase Storage
3. Replace mock Firebase Auth with real Firebase Auth  
4. Replace mock Firestore with real Firestore

### Phase 2: HIGH PRIORITY (Do Next)
5. Replace mock profile stats with real Firestore queries
6. Replace mock profile posts with real Firestore posts
7. Replace mock wallet transactions with real Firestore data
8. Replace mock payment methods with real Stripe API
9. Replace mock conversations with real Firestore messages
10. Replace mock dashboard stats with real backend API

### Phase 3: MEDIUM PRIORITY
11. Migrate service items to Firestore
12. Migrate bar menu items to Firestore
13. Migrate event items to Firestore
14. Replace mock AutoPoster status

### Phase 4: LOW PRIORITY
15. Verify/configure real push notifications

---

## Firebase Setup Requirements

To replace mock Firebase, you need:

1. **Firebase Project Created**
   - Go to https://console.firebase.google.com
   - Create project: "M1A Live" or use existing

2. **Firebase Config**
   - Get config from Firebase Console > Project Settings > General
   - Add to `.env` or `app.json`:
     ```
     EXPO_PUBLIC_FIREBASE_API_KEY=...
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
     EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
     EXPO_PUBLIC_FIREBASE_APP_ID=...
     ```

3. **Firestore Database**
   - Enable Firestore in Firebase Console
   - Set up security rules (see `firestore.rules`)

4. **Firebase Storage**
   - Enable Storage in Firebase Console
   - Set up storage rules for avatars/covers/uploads

5. **Firebase Auth**
   - Enable Email/Password authentication
   - Configure authorized domains

---

## Stripe Setup Requirements

1. **Stripe Account**
   - Create account at https://stripe.com
   - Get API keys from Dashboard

2. **Environment Variables**
   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_SECRET_KEY=sk_... (backend only)
   ```

3. **Payment Methods API**
   - Use Stripe.js or Stripe API to list customer payment methods
   - Store payment method IDs in Firestore user document

---

## Backend API Requirements

1. **Dashboard Stats Endpoint**
   - Create `/api/dashboard/stats` endpoint
   - Accept userId and persona as parameters
   - Return real stats from Firestore aggregations

2. **AutoPoster Status Endpoint**
   - Create `/api/autoposter/status` endpoint
   - Return real status from AutoPoster service

---

## Testing Checklist

After each replacement:
- [ ] Test the feature works with real data
- [ ] Test error handling (network failures, missing data)
- [ ] Test loading states
- [ ] Test empty states
- [ ] Verify data persists correctly
- [ ] Check performance (queries should be fast)

