# TestFlight Upload Guide - Build 13 (v1.0.3)

**Build Complete!** ✅  
**Build URL:** https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa

---

## Option 1: Manual Upload via App Store Connect (Recommended)

### Step 1: Download the Build

1. **Download the .ipa file:**
   - Visit: https://expo.dev/artifacts/eas/3udwZWwrWxpEdTWRMUjNDf.ipa
   - Download the file to your computer
   - Save it somewhere easy to find (e.g., Desktop)

### Step 2: Upload to App Store Connect

1. **Go to App Store Connect:**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Select Your App:**
   - Click "My Apps"
   - Click "M1A"

3. **Go to TestFlight:**
   - Click "TestFlight" in the left sidebar
   - You should see your app version (1.0.3)

4. **Upload Build:**
   - Look for "Builds" section
   - Click "+" or "Add Build" button
   - Drag and drop the downloaded `.ipa` file
   - Or click "Choose File" and select the `.ipa` file

5. **Wait for Processing:**
   - Apple will process the build (10-15 minutes)
   - Status will show "Processing" → "Ready to Test"
   - You'll receive an email when processing is complete

### Step 3: Set Up Internal Testing

1. **Add Internal Testers:**
   - Go to TestFlight → Internal Testing
   - Click "+" to add testers
   - Add email addresses of testers
   - Select build 13
   - Click "Save"

2. **Testers Will Receive:**
   - Email invitation to TestFlight
   - Instructions to install TestFlight app
   - Access to M1A v1.0.3

---

## Option 2: Using Transporter App (Alternative)

If manual upload doesn't work, use Apple's Transporter app:

1. **Download Transporter:**
   - From Mac App Store: https://apps.apple.com/app/transporter/id1450874784
   - Or search "Transporter" in Mac App Store

2. **Upload Build:**
   - Open Transporter app
   - Sign in with Apple Developer account
   - Drag and drop the `.ipa` file
   - Click "Deliver"
   - Wait for upload to complete

3. **Verify in App Store Connect:**
   - Go to App Store Connect → TestFlight
   - Build should appear within a few minutes

---

## Option 3: Using EAS Submit (If Interactive)

If you have access to an interactive terminal:

```bash
# Make sure you're logged in
eas login

# Submit the specific build
eas submit --platform ios --latest
```

Or specify the build ID:
```bash
eas submit --platform ios --id 3udwZWwrWxpEdTWRMUjNDf
```

---

## ✅ Verification Checklist

After upload:
- [ ] Build appears in App Store Connect TestFlight
- [ ] Build status shows "Processing" then "Ready to Test"
- [ ] Internal testers can be added
- [ ] TestFlight app shows the new build
- [ ] Build installs successfully on test devices

---

## 📱 Testing the Build

Once build is in TestFlight:

1. **Install TestFlight:**
   - Download TestFlight app from App Store
   - Sign in with tester email

2. **Install M1A:**
   - Accept invitation if received via email
   - Or find M1A in TestFlight app
   - Tap "Install" or "Update"

3. **Test New Features:**
   - ✅ Event booking with ticket types
   - ✅ Admin wallet balance adjustment
   - ✅ Event image uploads
   - ✅ Image display on events page

---

## 🚀 Next: App Store Submission

After TestFlight testing is successful:

1. Go to App Store Connect → App Store
2. Click "+ Version or Platform"
3. Select version 1.0.3
4. Add build 13
5. Fill out "What's New" section
6. Submit for review

---

## 📞 Troubleshooting

### Build Not Appearing
- Wait 10-15 minutes for processing
- Check email for any errors
- Verify bundle identifier matches
- Check Apple Developer account status

### Upload Fails
- Verify Apple Developer account is active
- Check internet connection
- Try using Transporter app instead
- Verify .ipa file downloaded completely

### TestFlight Issues
- Ensure testers have TestFlight app installed
- Check email invitations were sent
- Verify testers accepted invitation
- Check device compatibility

---

**Build is ready!** Download and upload to TestFlight now. 🚀

