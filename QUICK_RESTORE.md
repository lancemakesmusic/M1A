# ⚡ Quick Restore - No Password Needed!

Since authentication is having issues, let's use **Firebase Admin SDK** instead (no password needed).

## 🚀 Super Quick Method (2 minutes):

### Step 1: Get Service Account Key
1. **Click**: https://console.firebase.google.com/project/m1alive/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Click **"Generate key"** in popup
4. **Save the downloaded JSON file** as `serviceAccountKey.json` in your project root

### Step 2: Run Restore Script
```powershell
node scripts/restore-with-admin.js
```

**That's it!** The script will automatically:
- ✅ Add all 10 services
- ✅ Add NYE event (Dec 31, 2025, 8:00 PM)
- ✅ Add Holiday Showcase event
- ✅ Set all required fields

**No password needed!** Just the service account key file.

---

## 📋 What Gets Restored:

### Services (10):
1. Recording Time (Special Deal - 10 hours for $200)
2. Vocal Recording
3. Music Production
4. Photography
5. Event Photography
6. Videography
7. Video Production
8. Graphic Design
9. Website Development
10. Live Sound Engineering

### Events (2):
1. New Year's Eve Celebration (Dec 31, 2025, 8:00 PM)
2. Holiday Showcase (Dec 20, 2025, 7:00 PM)

---

**After running the script, refresh your app and everything will be live!** 🚀

