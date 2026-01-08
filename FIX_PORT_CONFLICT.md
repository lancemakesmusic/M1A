# Fix Port 8001 Conflict

## ✅ Success So Far:
- ✅ Firestore rules deployed successfully!
- ✅ Backend code is working
- ⚠️ Port 8001 is already in use

## 🔧 Solution: Free Port 8001

### Option 1: Find and Kill Process (Recommended)

**Step 1: Find the process using port 8001**
```powershell
netstat -ano | findstr :8001
```

**Expected Output:**
```
TCP    0.0.0.0:8001           0.0.0.0:0              LISTENING       12345
```

The last number (e.g., `12345`) is the Process ID (PID).

**Step 2: Kill the process**
```powershell
taskkill /PID 12345 /F
```

Replace `12345` with the actual PID from Step 1.

**Step 3: Start backend again**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

---

### Option 2: Use Different Port

**Edit `autoposter-backend/.env` file:**
```
API_PORT=8002
```

**Then start backend:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Update Expo `.env` file:**
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8002
```

---

### Option 3: Restart Computer

This will clear all ports, but takes longer.

---

## Quick Fix Commands

**Find process:**
```powershell
netstat -ano | findstr :8001
```

**Kill process (replace PID):**
```powershell
taskkill /PID [PID_NUMBER] /F
```

**Start backend:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

---

## Verify Backend is Running

After freeing the port and starting backend, verify:

**Open browser:** http://localhost:8001/api/payments/health

**Should return:**
```json
{"status":"healthy","stripe_configured":true}
```

---

## Next Steps After Backend Starts

1. ✅ Backend running on port 8001
2. ⏳ Start Expo in new terminal:
   ```powershell
   cd C:\Users\admin\M1A
   npx expo start --clear
   ```
3. ⏳ Test checkout screens

---

## Note About Warnings

The warnings about missing modules (`google_auth_oauthlib`, `qrcode`) are OK:
- These are optional features
- Backend still works for payments
- Payment routes loaded successfully ✅

---

## Status

✅ Firestore rules deployed
✅ Backend code working
⏳ Need to free port 8001
⏳ Start backend server
⏳ Start Expo app
⏳ Test checkout screens





