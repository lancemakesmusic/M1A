# Next Steps After Firebase Authentication ✅

## ✅ Step 1: Deploy Firestore Rules

**You're currently in:** `C:\Users\admin\M1A\autoposter-backend`

**Run these commands:**
```powershell
cd C:\Users\admin\M1A
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  Deploy complete!
```

**Wait:** 1-2 minutes for rules to propagate

---

## ✅ Step 2: Start Backend Server

**In the SAME terminal (after rules deploy):**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**OR open a NEW terminal:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Keep this terminal open!**

**Verify Backend:**
- Open browser: http://localhost:8001/api/payments/health
- Should return: `{"status":"healthy","stripe_configured":true}`

---

## ✅ Step 3: Start Expo App

**Open a NEW PowerShell terminal:**
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

**Important:** 
- Run from project ROOT: `C:\Users\admin\M1A`
- NOT from `autoposter-backend` directory

**Expected Output:**
- QR code appears
- Metro bundler starts
- Options: Press `a` (Android), `i` (iOS), or scan QR code

---

## Quick Command Sequence

### Current Terminal (or New Terminal 1):
```powershell
cd C:\Users\admin\M1A
firebase deploy --only firestore:rules
cd autoposter-backend
python start_backend.py
```

### New Terminal 2 (for Expo):
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

---

## After All Services Are Running

1. **Scan QR code** with Expo Go app (iOS/Android)
2. **Test checkout screens:**
   - Bar Menu
   - Service Booking
   - Event Booking
   - Bar Menu Category
3. **Use test card:** `4242 4242 4242 4242`
4. **Verify:**
   - Orders complete successfully
   - Transactions appear in Wallet Screen
   - Calendar events created (for services/events)

---

## Troubleshooting

### If rules deploy fails:
- Make sure you're in project root: `cd C:\Users\admin\M1A`
- Check you're authenticated: `firebase projects:list`

### If backend won't start:
- Check Python: `python --version`
- Check you're in correct directory: `cd C:\Users\admin\M1A\autoposter-backend`
- Check `.env` file exists

### If Expo won't start:
- Make sure you're in project ROOT: `cd C:\Users\admin\M1A`
- NOT in `autoposter-backend` directory
- Check Node.js: `node --version`

---

## Status Check

✅ Firebase authenticated
⏳ Deploy Firestore rules (next step)
⏳ Start backend server
⏳ Start Expo app
⏳ Test checkout screens
