# Kill Process Using Port 8001

## ✅ Found the Process!

From your `netstat` output:
```
TCP    0.0.0.0:8001           0.0.0.0:0              LISTENING       40596
```

**Process ID (PID): 40596**

---

## 🔧 Kill the Process

**Run this command:**
```powershell
taskkill /PID 40596 /F
```

**Expected Output:**
```
SUCCESS: The process with PID 40596 has been terminated.
```

---

## ✅ Then Start Backend

**After killing the process:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Expected Output:**
```
✅ Backend is running! Keep this terminal open.
INFO:     Uvicorn running on http://0.0.0.0:8001
```

**No more port conflict errors!**

---

## Verify Backend is Running

**Open browser:** http://localhost:8001/api/payments/health

**Should return:**
```json
{"status":"healthy","stripe_configured":true}
```

---

## Quick Command Sequence

```powershell
# Kill the process
taskkill /PID 40596 /F

# Start backend
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

---

## If PID Changes

If you need to find the PID again:
```powershell
netstat -ano | findstr :8001
```

Then kill the new PID:
```powershell
taskkill /PID [NEW_PID] /F
```

---

## Next Steps

After backend starts successfully:
1. ✅ Backend running on port 8001
2. ⏳ Start Expo in new terminal:
   ```powershell
   cd C:\Users\admin\M1A
   npx expo start --clear
   ```
3. ⏳ Test checkout screens





