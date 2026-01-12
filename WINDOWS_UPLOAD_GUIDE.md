# Windows Upload Guide - Build 13 to App Store Connect

**Problem:** Transporter is Mac-only  
**Solution:** Use web-based upload or alternative methods

---

## 🌐 Option 1: Web-Based Upload (If Available)

### Check App Store Connect Web Interface

1. **On the Build page:**
   - Look for a "Choose File" button or drag-and-drop area
   - Some versions of App Store Connect support direct web upload
   - Try dragging the `.ipa` file directly onto the page

2. **If drag-and-drop works:**
   - Download the build: https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa
   - Drag the `.ipa` file onto the upload area
   - Wait for upload to complete

---

## 💻 Option 2: Use EAS Submit (Command Line)

EAS CLI works on Windows! Try this:

```powershell
# Make sure you're logged in
eas login

# Submit the build (this uploads directly)
eas submit --platform ios --latest

# Or specify the build ID directly
eas submit --platform ios --id 3udwZWwrWxpEdTWRMUjNDf
```

**Note:** This might require interactive input. If it does, you'll need to:
- Run it in an interactive PowerShell window (not through automation)
- Answer prompts as they appear

---

## 🔧 Option 3: Use altool (Deprecated but might work)

**Note:** Apple deprecated altool, but it might still work temporarily.

1. **Download Xcode Command Line Tools:**
   - This is a large download but works on Windows via WSL or virtualization
   - Not recommended unless you already have it set up

---

## 👥 Option 4: Ask Someone with a Mac

If you have access to a Mac (even temporarily):

1. **Download the build on Windows:**
   - Visit: https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa
   - Download to a USB drive or cloud storage

2. **On Mac:**
   - Download Transporter from Mac App Store
   - Upload the `.ipa` file
   - Takes 5 minutes

---

## 🚀 Option 5: Use EAS Submit via Web Dashboard

1. **Go to EAS Dashboard:**
   - Visit: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
   - Find your build (the one that just completed)

2. **Check for Submit Option:**
   - Some EAS builds have a "Submit" button in the dashboard
   - Click it if available
   - This will upload directly to App Store Connect

---

## ✅ Recommended: Try EAS Submit First

**Best option for Windows:**

```powershell
cd C:\Users\admin\M1A
eas submit --platform ios --latest
```

**If it asks for input:**
- Make sure you're in an interactive PowerShell window
- Answer the prompts:
  - Select "App Store Connect" as destination
  - Confirm the build ID
  - It will upload automatically

---

## 📋 Alternative: Manual Upload via Browser

Some browsers support direct file upload. Try:

1. **On the Build page in App Store Connect:**
   - Look for "Choose File" button
   - Click it
   - Navigate to downloaded `.ipa` file
   - Click "Upload"

**If this doesn't work**, the web interface might not support direct upload, and you'll need one of the other options.

---

## 🎯 Quick Decision Tree

1. **Try EAS Submit first** (easiest on Windows):
   ```powershell
   eas submit --platform ios --latest
   ```

2. **If that doesn't work**, check EAS dashboard for submit button

3. **If still no luck**, use a Mac (friend/colleague) with Transporter

4. **Last resort**: Set up WSL2 with Xcode tools (complex)

---

## 📞 What to Do Right Now

**Try this command in PowerShell:**

```powershell
cd C:\Users\admin\M1A
eas submit --platform ios --latest
```

If it works, it will upload automatically!  
If it needs interactive input, run it in a regular PowerShell window (not automated).

---

**EAS Submit is your best bet on Windows!** Try it now. 🚀

