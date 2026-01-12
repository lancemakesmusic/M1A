# App Store Connect - Build Page Instructions

**Current Page:** Build upload/selection page  
**Goal:** Upload build 13 or select it if already uploaded

---

## 📤 Option 1: Upload Build (If Not Already Uploaded)

### Using Transporter (Recommended)

1. **Download Transporter:**
   - Click the "Upload Tools" link on the page
   - Or download directly: https://apps.apple.com/app/transporter/id1450874784
   - Install Transporter app

2. **Download Your Build:**
   - Visit: https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa
   - Download the `.ipa` file to your computer

3. **Upload with Transporter:**
   - Open Transporter app
   - Sign in with your Apple Developer account
   - Drag and drop the `.ipa` file into Transporter
   - Click "Deliver"
   - Wait for upload to complete

4. **Verify Upload:**
   - Return to App Store Connect
   - Go to TestFlight tab
   - Build should appear (processing takes 10-15 minutes)

---

## ✅ Option 2: Select Existing Build (If Already Uploaded)

If you've already uploaded the build:

1. **Go to App Store Tab:**
   - Click "App Store" in the left sidebar (not "TestFlight")
   - Select version 1.0.3

2. **Select Build:**
   - Look for "Build" section
   - Click "Select a build" or "+"
   - Choose build 13 (version 1.0.3)
   - Click "Done"

---

## 🔐 Encryption Documentation (If Required)

The page mentions encryption documentation. For M1A:

**Your app.json already has:**
```json
"ITSAppUsesNonExemptEncryption": false
```

**This means:**
- ✅ Your app uses standard encryption (HTTPS/TLS)
- ✅ No additional documentation needed
- ✅ You can proceed with upload

**If prompted:**
- Select "No" for export compliance questions
- Or select "My app uses standard encryption only"
- No documentation upload required

---

## 📋 Build Information

**Build Details:**
- **Bundle ID:** `com.merkabaent.m1a`
- **Version:** `1.0.3`
- **Build:** `13`
- **File:** `3udwZWwrWxpEdTWRMUjNDf.ipa`
- **Encryption:** Standard only (no documentation needed)

---

## 🎯 Next Steps After Upload

1. **Wait for Processing:**
   - Build will process in TestFlight (10-15 minutes)
   - You'll receive an email when complete

2. **Go to App Store Tab:**
   - After processing, go to "App Store" tab
   - Select version 1.0.3
   - Click "Select a build"
   - Choose build 13

3. **Fill Out Required Fields:**
   - "What's New in This Version" (required)
   - Verify other app information

4. **Submit for Review:**
   - Click "Add for Review"
   - Confirm submission

---

## 🚀 Quick Action Items

**Right Now:**
1. Download the `.ipa` file from EAS build
2. Upload using Transporter app
3. Wait for processing (check TestFlight tab)
4. Then go to App Store tab to select the build

**Or if build is already uploaded:**
1. Go to App Store tab
2. Select version 1.0.3
3. Click "Select a build"
4. Choose build 13

---

**The Build page is for uploading. After upload, you'll select the build in the App Store tab!** 🚀

