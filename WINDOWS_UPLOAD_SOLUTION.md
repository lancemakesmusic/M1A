# Windows Upload Solution - Build 13

**Problem:** Transporter is Mac-only  
**Solution:** Use EAS Submit (works on Windows!)

---

## ✅ Solution: EAS Submit Command

EAS CLI works perfectly on Windows. Here's how to use it:

### Step 1: Make Sure You're Logged In

```powershell
cd C:\Users\admin\M1A
eas login
```

### Step 2: Submit the Build

**Option A: Submit Latest Build (Recommended)**
```powershell
eas submit --platform ios --latest
```

**Option B: Submit Specific Build ID**
```powershell
eas submit --platform ios --id 3udwZWwrWxpEdTWRMUjNDf
```

**Option C: Submit with Profile**
```powershell
eas submit --platform ios --profile production
```

---

## 🎯 What Happens When You Run EAS Submit

1. **EAS will:**
   - Find your build automatically
   - Upload it to App Store Connect
   - Process the submission
   - Show you progress

2. **You might be prompted for:**
   - Apple ID credentials (if not saved)
   - App-specific password (if 2FA enabled)
   - Confirmation of build selection

3. **After submission:**
   - Build will appear in App Store Connect
   - Processing takes 10-15 minutes
   - You'll receive email notification

---

## 🔐 If You Need Apple Credentials

If EAS asks for Apple ID:

1. **Use your Apple Developer account email**
2. **For password:**
   - If you have 2FA enabled, use an App-Specific Password
   - Generate one at: https://appleid.apple.com
   - Go to "Sign-In and Security" → "App-Specific Passwords"

---

## 📋 Step-by-Step Commands

Run these in PowerShell:

```powershell
# 1. Navigate to project
cd C:\Users\admin\M1A

# 2. Make sure you're logged in to EAS
eas login

# 3. Submit the build
eas submit --platform ios --latest
```

**That's it!** EAS will handle the upload automatically.

---

## 🌐 Alternative: EAS Web Dashboard

If command line doesn't work:

1. **Go to EAS Dashboard:**
   - https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

2. **Find Your Build:**
   - Look for the build that just completed
   - Build ID: `3udwZWwrWxpEdTWRMUjNDf`

3. **Check for Submit Button:**
   - Some builds have a "Submit" or "Submit to App Store" button
   - Click it if available
   - It will upload to App Store Connect automatically

---

## ✅ Verification

After submission:

1. **Check App Store Connect:**
   - Go to TestFlight tab
   - Build should appear (status: "Processing")

2. **Wait for Processing:**
   - 10-15 minutes typically
   - Email notification when complete

3. **Then Select Build:**
   - Go to App Store tab
   - Select version 1.0.3
   - Click "Select a build"
   - Choose build 13

---

## 🚀 Try This Now

**Run this command:**

```powershell
cd C:\Users\admin\M1A
eas submit --platform ios --latest
```

**If it asks for input:**
- Make sure you're in an interactive PowerShell window
- Answer the prompts
- It will upload automatically

---

**EAS Submit is the Windows-friendly way!** No Mac needed. 🎉

