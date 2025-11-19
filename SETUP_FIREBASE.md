# 🔥 Firebase Setup Guide
## Quick setup to replace mock Firebase with real Firebase

### Step 1: Create Firebase Project (5 minutes)

1. Go to https://console.firebase.google.com
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: **"M1A Live"** or **"Merkaba Entertainment"**
4. Click **Continue**
5. (Optional) Enable Google Analytics - you can skip this
6. Click **Create project**
7. Wait for project to be created, then click **Continue**

### Step 2: Enable Required Services (10 minutes)

#### Enable Firestore Database:
1. In Firebase Console, click **Build** > **Firestore Database**
2. Click **Create database**
3. Select **Start in test mode** (we'll add security rules later)
4. Choose a location (closest to you - e.g., `us-central1`)
5. Click **Enable**

#### Enable Storage:
1. Click **Build** > **Storage**
2. Click **Get started**
3. Select **Start in test mode**
4. Use same location as Firestore
5. Click **Done**

#### Enable Authentication:
1. Click **Build** > **Authentication**
2. Click **Get started**
3. Click **Email/Password** tab
4. Toggle **Enable** for Email/Password
5. Click **Save**

### Step 3: Get Firebase Config (5 minutes)

1. In Firebase Console, click the **gear icon** ⚙️ next to "Project Overview"
2. Click **Project settings**
3. Scroll down to **"Your apps"** section
4. Click the **Web icon** `</>` to add a web app
5. Register app:
   - App nickname: **"M1A Web App"**
   - (Optional) Check "Also set up Firebase Hosting"
   - Click **Register app**
6. **Copy the config object** - it looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

### Step 4: Add Config to Your App (5 minutes)

**Option A: Update firebase.js directly** (Easiest)

Open `firebase.js` and replace lines 32-38 with your real config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

**Option B: Use Environment Variables** (Recommended for production)

Create `.env` file in project root:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef...
```

### Step 5: Run Data Migration (5 minutes)

After Firebase is configured, run the migration script:

```bash
node scripts/migrate-mock-data-to-firestore.js
```

This will populate Firestore with:
- Services (Vocal Recording, Photography, etc.)
- Events (NYE 2026 RSVP)
- Bar menu items

### Step 6: Verify Setup (5 minutes)

1. Restart your app (stop and start Expo)
2. Check console logs - should see: `🔥 Real Firebase initialized successfully!`
3. Try uploading a profile photo
4. Check Firebase Console > Firestore - should see data
5. Check Firebase Console > Storage - should see uploaded images

### Troubleshooting

**If you see "Using mock Firebase":**
- Check that config values are not placeholder values
- Verify all 6 config values are filled in
- Restart Expo after changing config

**If profile photos don't upload:**
- Check Firebase Console > Storage > Rules
- Make sure Storage is enabled
- Check browser console for errors

**If data doesn't appear:**
- Check Firestore Console for collections
- Verify migration script ran successfully
- Check app console for Firestore errors

---

**Total Time: ~30 minutes**
**Difficulty: Easy**

