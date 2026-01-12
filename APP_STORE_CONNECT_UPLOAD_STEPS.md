# App Store Connect Upload Steps - Build 13

**Build Ready:** https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa  
**Version:** 1.0.3  
**Build Number:** 13

---

## 📤 Step-by-Step Upload Instructions

### Step 1: Download the Build

1. **Download the .ipa file:**
   - Visit: https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa
   - Right-click → "Save As" or download directly
   - Save to Desktop or Downloads folder for easy access

### Step 2: Upload via App Store Connect

Based on the App Store Connect page you're viewing:

1. **Navigate to Your App:**
   - In App Store Connect, click "My Apps"
   - Select "M1A"

2. **Go to TestFlight Tab:**
   - Click "TestFlight" in the left sidebar
   - You should see version 1.0.3 listed

3. **Upload the Build:**
   - Look for the "Builds" section
   - Click "+" or "Add Build" button
   - You'll see options to upload via:
     - **Transporter** (Recommended for .ipa files)
     - **Xcode** (if you have Xcode)
     - **Drag and Drop** (if supported)

4. **Using Transporter (Recommended):**
   - If you see "Upload with Transporter" option, click it
   - Download Transporter app if needed: https://apps.apple.com/app/transporter/id1450874784
   - Open Transporter app
   - Sign in with your Apple Developer account
   - Drag and drop the downloaded `.ipa` file into Transporter
   - Click "Deliver"
   - Wait for upload to complete

5. **Or Drag and Drop:**
   - If the page supports drag-and-drop:
   - Simply drag the `.ipa` file from your computer
   - Drop it into the upload area
   - Wait for upload to complete

### Step 3: Wait for Processing

- **Processing Time:** 10-15 minutes typically
- **Status:** Will show "Processing" → "Ready to Test"
- **Email Notification:** You'll receive an email when processing completes
- **Check Status:** Refresh the TestFlight page to see updates

### Step 4: Verify Build Information

Once processed, verify:
- **Bundle ID:** `com.merkabaent.m1a` ✅
- **Version:** `1.0.3` ✅
- **Build String:** `13` ✅
- **Status:** "Ready to Test" ✅

---

## 🧪 Step 5: Set Up Internal Testing

1. **Go to Internal Testing:**
   - In TestFlight tab, click "Internal Testing"
   - Click "+" to create a new group or select existing

2. **Add Testers:**
   - Click "Add Testers" or "+"
   - Enter email addresses of testers
   - Testers must have:
     - Apple ID
     - TestFlight app installed (on iOS device)

3. **Select Build:**
   - Choose build 13 (v1.0.3)
   - Click "Save" or "Add"

4. **Testers Receive:**
   - Email invitation to TestFlight
   - Instructions to install TestFlight app
   - Access to M1A v1.0.3

---

## ✅ Verification Checklist

After upload:
- [ ] Build uploaded successfully
- [ ] Build appears in TestFlight builds list
- [ ] Status shows "Processing" then "Ready to Test"
- [ ] Email notification received
- [ ] Internal testers can be added
- [ ] Build installs successfully on test devices

---

## 🚀 Next: App Store Submission

After TestFlight testing is successful:

1. **Go to App Store Tab:**
   - In App Store Connect, click "App Store" (not TestFlight)

2. **Create New Version:**
   - Click "+ Version or Platform"
   - Select "iOS App"
   - Version: `1.0.3`

3. **Add Build:**
   - Click "Build" section
   - Select build 13
   - Click "Done"

4. **Fill Out Release Information:**
   - **What's New in This Version:**
     ```
     • Complete event ticket booking system with early bird pricing and VIP options
     • Admin can now manage wallet balances for store credit
     • Event images now display correctly
     • Improved performance and bug fixes
     ```

5. **Review Information:**
   - Verify all app information is correct
   - Screenshots are up to date
   - Description is current
   - Support URL works

6. **Submit for Review:**
   - Review all sections
   - Click "Submit for Review"
   - Status will change to "Waiting for Review"

---

## 📋 Build Information Reference

**Bundle ID:** `com.merkabaent.m1a`  
**Version Number:** `1.0.3`  
**Build String:** `13`  
**Platform:** iOS  
**File:** `3udwZWwrWxpEdTWRMUjNDf.ipa`

---

## 🐛 Troubleshooting

### Upload Fails
- Verify you have required role (Account Holder, Admin, App Manager, or Developer)
- Check internet connection
- Try using Transporter app instead
- Verify .ipa file downloaded completely

### Build Not Processing
- Wait 15-20 minutes (can take longer during peak times)
- Check email for any error notifications
- Verify bundle ID matches exactly: `com.merkabaent.m1a`
- Check version number matches: `1.0.3`

### Build Rejected
- Check email for rejection reason
- Common issues:
  - Bundle ID mismatch
  - Version number conflict
  - Missing required information
  - Code signing issues

---

**Ready to upload!** Download the .ipa file and upload it to App Store Connect now. 🚀

