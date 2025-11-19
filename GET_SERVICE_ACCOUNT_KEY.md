# 🔑 Get Firebase Service Account Key

## Quick Steps (2 minutes):

1. **Click this link**: https://console.firebase.google.com/project/m1alive/settings/serviceaccounts/adminsdk

2. **Click "Generate new private key"** button

3. **Click "Generate key"** in the popup

4. **Save the downloaded JSON file** as `serviceAccountKey.json` in your project root (same folder as `package.json`)

5. **Run the restore script**:
   ```powershell
   node scripts/restore-with-admin.js
   ```

## ⚠️ Important:

- **Never commit** `serviceAccountKey.json` to GitHub!
- It's already in `.gitignore` so it won't be committed
- This key gives full admin access to your Firebase project

## ✅ After Getting the Key:

Once you have `serviceAccountKey.json` in the project root, I'll run the script to restore all 10 services and 2 events automatically!

---

**The script will:**
- ✅ Add all 10 services (Recording Time, Vocal Recording, Music Production, etc.)
- ✅ Add NYE event (Dec 31, 2025, 8:00 PM)
- ✅ Add Holiday Showcase event
- ✅ Set all required fields (`available: true`, `popularity`, etc.)

**No password needed - just the service account key!** 🚀

