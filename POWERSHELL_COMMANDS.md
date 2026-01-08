# PowerShell Commands - Correct Syntax

## ⚠️ Important: PowerShell Syntax

PowerShell uses **semicolon (`;`)** to chain commands, NOT arrow (`→`)

### ❌ Wrong:
```powershell
cd autoposter-backend → python start_backend.py
```

### ✅ Correct:
```powershell
cd autoposter-backend; python start_backend.py
```

### ✅ OR Run Separately:
```powershell
cd autoposter-backend
python start_backend.py
```

---

## Complete Setup Sequence

### Step 1: Deploy Firestore Rules
```powershell
cd C:\Users\admin\M1A
firebase deploy --only firestore:rules
```

**Wait for:** `✔  Deploy complete!`

---

### Step 2: Start Backend Server

**Option A - Single Line:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend; python start_backend.py
```

**Option B - Separate Commands:**
```powershell
cd C:\Users\admin\M1A\autoposter-backend
python start_backend.py
```

**Keep this terminal open!**

**Verify:** http://localhost:8001/api/payments/health

---

### Step 3: Start Expo (New Terminal)

**Open a NEW PowerShell terminal:**
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

**Important:** Run from project root, NOT from `autoposter-backend`

---

## Quick Reference

### PowerShell Command Chaining:
- ✅ Use `;` (semicolon): `command1; command2`
- ❌ Don't use `→` (arrow): `command1 → command2`

### Common Patterns:
```powershell
# Change directory and run command
cd path; command

# Run multiple commands
command1; command2; command3

# Change directory, then run command (separate lines)
cd path
command
```

---

## Troubleshooting

### If command fails:
- Check you're in the right directory: `pwd` or `Get-Location`
- Check command exists: `Get-Command python`
- Use separate commands instead of chaining

### If path has spaces:
- Use quotes: `cd "C:\Users\admin\My Project"`
- Or escape: `cd C:\Users\admin\My`\ `Project`

---

## All Commands in Order

### Terminal 1:
```powershell
cd C:\Users\admin\M1A
firebase deploy --only firestore:rules
cd autoposter-backend
python start_backend.py
```

### Terminal 2 (New Terminal):
```powershell
cd C:\Users\admin\M1A
npx expo start --clear
```

---

## Status Check Commands

```powershell
# Check current directory
Get-Location

# Check if backend is running
Invoke-WebRequest -Uri http://localhost:8001/api/payments/health

# Check if port is in use
Test-NetConnection -ComputerName localhost -Port 8001
```





