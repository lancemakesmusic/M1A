# Quick Start Guide - Testing Checkout Screens

## Step-by-Step Setup

### 1. Authenticate Firebase (Required First Time)
```bash
firebase login --reauth
```
- Opens browser for authentication
- Follow prompts to authenticate
- Returns to terminal when complete

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  Deploy complete!
```

**Wait:** 1-2 minutes for rules to propagate

---

### 3. Start Backend Server

**Open NEW Terminal Window:**
```bash
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Keep this terminal open!**

**Verify Backend:**
- Open browser: http://localhost:8001/api/payments/health
- Should return: `{"status":"healthy","stripe_configured":true}`

---

### 4. Start Expo App

**Open ANOTHER Terminal Window:**
```bash
cd C:\Users\admin\M1A
npx expo start --clear
```

**Important:** Run from project ROOT, not from `autoposter-backend` directory!

**Expected Output:**
- QR code appears
- Metro bundler starts
- Options: Press `a` (Android), `i` (iOS), or scan QR code

---

## Testing Checklist

### Test Each Screen:

1. **BarMenuScreen**
   - Add items → Pay → Complete payment
   - Verify transaction in Wallet

2. **ServiceBookingScreen**
   - Book service → Pay → Complete payment
   - Verify calendar event created

3. **EventBookingScreen**
   - Fill form → Pay Deposit → Complete payment
   - Verify calendar event created

4. **BarMenuCategoryScreen**
   - Add items → Pay → Complete payment
   - Verify transaction in Wallet

### Test Card:
- Number: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

---

## Troubleshooting

### Firebase Auth Error:
```bash
firebase login --reauth
```

### Expo Command Error:
- Make sure you're in project ROOT: `C:\Users\admin\M1A`
- NOT in `autoposter-backend` directory

### Backend Not Starting:
- Check Python is installed: `python --version`
- Check dependencies: `pip install -r requirements.txt`
- Check `.env` file exists in `autoposter-backend`

### Port Already in Use:
- Backend: Change port in `.env` or kill process on port 8001
- Expo: Press `y` when asked to use different port

---

## Verification

After each payment:
- ✅ Order in Firestore = `'completed'`
- ✅ Transaction in `walletTransactions`
- ✅ Transaction appears in Wallet Screen
- ✅ Calendar event created (services/events)

---

## Full Documentation

- `TESTING_CHECKLIST.md` - Complete testing guide
- `CHECKOUT_AUDIT_REPORT.md` - Audit results
- `PAYMENT_FIXES_SUMMARY.md` - All fixes made





