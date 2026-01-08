# Setup Commands - Copy & Paste

## Step 1: Authenticate Firebase

**Run this command:**
```powershell
firebase login --reauth
```

**What happens:**
- Browser opens automatically
- Sign in with your Firebase account
- Return to terminal when done
- You'll see: "Success! Logged in as [your-email]"

---

## Step 2: Deploy Firestore Rules

**After authentication succeeds, run:**
```powershell
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  Deploy complete!
```

**Wait 1-2 minutes** for rules to propagate.

---

## Step 3: Start Backend (Terminal 1)

**Open a NEW PowerShell terminal and run:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Keep this terminal open!**

**Verify it's working:**
- Open browser: http://localhost:8001/api/payments/health
- Should see: `{"status":"healthy","stripe_configured":true}`

---

## Step 4: Start Expo (Terminal 2)

**Open ANOTHER NEW PowerShell terminal and run:**
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

**Important:** 
- Run from `C:\Users\admin\M1A` (project root)
- NOT from `autoposter-backend` directory

**Expected output:**
- QR code appears
- Metro bundler starts
- Options to press `a`, `i`, or scan QR code

---

## Quick Copy-Paste Sequence

### Terminal 1 (Firebase):
```powershell
firebase login --reauth
firebase deploy --only firestore:rules
```

### Terminal 2 (Backend):
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

### Terminal 3 (Expo):
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

---

## Troubleshooting

### If Firebase login fails:
- Make sure you're logged into the correct Firebase account
- Check internet connection
- Try: `firebase logout` then `firebase login --reauth`

### If Backend won't start:
- Check Python is installed: `python --version`
- Check you're in correct directory: `cd C:\Users\admin\M1A\autoposter-backend`
- Check `.env` file exists

### If Expo won't start:
- Make sure you're in project ROOT: `cd C:\Users\admin\M1A`
- NOT in `autoposter-backend` directory
- Check Node.js is installed: `node --version`

---

## After Setup

Once all three are running:
1. Scan QR code with Expo Go app
2. Test checkout screens
3. Use test card: `4242 4242 4242 4242`
4. Verify transactions appear in Wallet Screen





