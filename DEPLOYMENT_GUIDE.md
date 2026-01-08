# Complete Deployment Guide - TestFlight & App Store

## 🚀 Quick Start

### Option 1: Automated Script (Recommended)
```powershell
.\DEPLOY_TO_PRODUCTION.ps1
```

### Option 2: Manual Steps
Follow the steps below.

---

## 📋 Pre-Deployment Checklist

- [ ] All code changes committed
- [ ] Version number updated in `app.json`
- [ ] Build number incremented
- [ ] Firebase credentials configured
- [ ] EAS credentials configured (`eas login`)
- [ ] Apple Developer account active
- [ ] App Store Connect access

---

## Step 1: Update Version Numbers

**Current Version:** Check `app.json`
- Version: `1.0.1`
- Build: `12`

**Update:**
```json
{
  "expo": {
    "version": "1.0.2",  // Increment version
    "ios": {
      "buildNumber": "13"  // Increment build
    }
  }
}
```

**Or use script:**
```powershell
# Edit app.json manually or run:
.\DEPLOY_TO_PRODUCTION.ps1
```

---

## Step 2: Deploy Firebase

### 2.1 Deploy Firestore Rules
```powershell
firebase login --reauth
firebase deploy --only firestore:rules
```

### 2.2 Verify Deployment
- Check Firebase Console: https://console.firebase.google.com
- Verify rules are updated

---

## Step 3: Build for TestFlight

### 3.1 Login to EAS
```powershell
eas login
```

### 3.2 Build iOS App
```powershell
eas build --platform ios --profile production
```

**What happens:**
- EAS builds your app in the cloud
- Takes 15-30 minutes
- You'll get a build URL to track progress

### 3.3 Submit to TestFlight
```powershell
eas submit --platform ios --profile production
```

**Or submit manually:**
1. Go to: https://expo.dev/accounts/[your-account]/builds
2. Click on completed build
3. Click "Submit to App Store"
4. Follow prompts

---

## Step 4: TestFlight Distribution

### 4.1 Access App Store Connect
- Go to: https://appstoreconnect.apple.com
- Navigate to: My Apps → M1A → TestFlight

### 4.2 Add Testers
1. Click "Internal Testing" or "External Testing"
2. Add testers by email
3. Select build to distribute
4. Send invitations

### 4.3 Test Build
- Testers receive email invitation
- Install TestFlight app
- Download and test your build

---

## Step 5: App Store Submission

### 5.1 Prepare App Store Listing

**Required Information:**
- App Name: M1A
- Subtitle: (optional)
- Description: (update if needed)
- Keywords: (update if needed)
- Screenshots: (update if needed)
- App Icon: (already set)
- Privacy Policy URL: (required)

### 5.2 Submit for Review

**Option A: Via EAS**
```powershell
eas submit --platform ios --profile production --latest
```

**Option B: Via App Store Connect**
1. Go to: https://appstoreconnect.apple.com
2. My Apps → M1A → App Store
3. Click "+" next to iOS App
4. Select build from TestFlight
5. Fill in all required fields
6. Submit for Review

### 5.3 Review Process
- Apple reviews in 24-48 hours
- You'll receive email when approved/rejected
- Check status in App Store Connect

---

## 🔧 Configuration Files

### app.json
```json
{
  "expo": {
    "version": "1.0.2",
    "ios": {
      "bundleIdentifier": "com.merkabaent.m1a",
      "buildNumber": "13"
    }
  }
}
```

### eas.json
```json
{
  "build": {
    "production": {
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-email@example.com",
        "ascAppId": "your-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

---

## 📱 Build Profiles

### Production Build
- **Profile:** `production`
- **Purpose:** App Store & TestFlight
- **Command:** `eas build --platform ios --profile production`

### Development Build
- **Profile:** `development` (if configured)
- **Purpose:** Internal testing
- **Command:** `eas build --platform ios --profile development`

---

## 🐛 Troubleshooting

### Build Fails
1. Check EAS dashboard for error logs
2. Verify `app.json` is valid JSON
3. Check Apple Developer account status
4. Verify certificates are valid

### TestFlight Not Receiving Build
1. Check build status in EAS dashboard
2. Verify build completed successfully
3. Check App Store Connect for processing status
4. Wait 5-10 minutes for processing

### Submission Fails
1. Verify Apple ID credentials
2. Check App Store Connect access
3. Ensure app metadata is complete
4. Check for compliance issues

### Firebase Deployment Fails
1. Run `firebase login --reauth`
2. Check `.firebaserc` has correct project
3. Verify `firestore.rules` file exists
4. Check Firebase project permissions

---

## 📊 Deployment Status

### Check Build Status
```powershell
eas build:list --platform ios
```

### Check Submission Status
```powershell
eas submit:list --platform ios
```

### View Logs
- EAS Dashboard: https://expo.dev/accounts/[account]/builds
- App Store Connect: https://appstoreconnect.apple.com

---

## ✅ Post-Deployment

### After TestFlight Build:
- [ ] Test on physical device
- [ ] Verify all features work
- [ ] Check crash reports
- [ ] Gather tester feedback

### After App Store Submission:
- [ ] Monitor review status
- [ ] Respond to review feedback if needed
- [ ] Prepare release notes
- [ ] Plan marketing announcement

---

## 🎯 Quick Commands Reference

```powershell
# Update version
# (Edit app.json manually)

# Deploy Firebase
firebase deploy --only firestore:rules

# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --profile production

# Check build status
eas build:list --platform ios

# Full automated deployment
.\DEPLOY_TO_PRODUCTION.ps1
```

---

## 📝 Version History

- **1.0.1** (Build 12) - Current
- **1.0.2** (Build 13) - Next release

---

## 🆘 Support

- **EAS Build Docs:** https://docs.expo.dev/build/introduction/
- **TestFlight Guide:** https://developer.apple.com/testflight/
- **App Store Connect:** https://appstoreconnect.apple.com




