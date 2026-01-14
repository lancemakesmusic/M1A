# M1A v1.0.4 - Deployment Execution Guide

**Date:** January 8, 2026  
**Version:** 1.0.4  
**Build Number:** 14  
**Status:** 🚀 READY TO DEPLOY

---

## ✅ Pre-Deployment Checklist

- [x] Version updated: 1.0.4
- [x] Build number: 14
- [x] Code committed to GitHub
- [x] CHANGELOG.md updated
- [x] Release notes created
- [x] Deployment guides created
- [x] EAS CLI installed
- [x] EAS account logged in: `lancemakesmusic`

---

## 🚀 Step-by-Step Deployment

### Step 1: Verify Everything is Committed ✅

```powershell
cd C:\Users\admin\M1A
git status
```

**Expected:** "Your branch is up to date with 'origin/main'"

---

### Step 2: Start iOS Build 🏗️

```powershell
cd C:\Users\admin\M1A
eas build --platform ios --profile production
```

**What Happens:**
1. EAS uploads your code
2. Builds iOS app (~15-20 minutes)
3. Provides download link when complete
4. Auto-increments build number to 14

**Monitor Progress:**
- Watch terminal for real-time logs
- Or check: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

**Expected Output:**
```
Build started...
Build ID: [build-id]
Build URL: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds/[build-id]
```

---

### Step 3: Wait for Build to Complete ⏳

**Timeline:** 15-20 minutes

**What to Watch For:**
- ✅ "Build finished successfully"
- ✅ Download link for `.ipa` file
- ✅ Build number: 14

**If Build Fails:**
- Check error logs in terminal
- Verify `app.json` is valid
- Check `eas.json` configuration
- Try again after fixing issues

---

### Step 4: Submit to TestFlight 📱

**Option A: Automated (Recommended)**

```powershell
cd C:\Users\admin\M1A
eas submit --platform ios --profile production --latest
```

**What Happens:**
1. EAS finds latest build
2. Uploads to App Store Connect automatically
3. Processes build (10-15 minutes)
4. Appears in TestFlight

**Option B: Manual Upload**

1. Download `.ipa` from EAS build output
2. Go to: https://appstoreconnect.apple.com
3. Select M1A → TestFlight
4. Click "+" → Upload `.ipa` file
5. Wait 10-15 minutes for processing

---

### Step 5: Set Up TestFlight Testing 🧪

**Internal Testing (Immediate)**

1. Go to App Store Connect → M1A → TestFlight
2. Click "Internal Testing"
3. Click "+" to add testers
4. Add emails:
   - `admin@merkabaent.com`
   - `brogdon.lance@gmail.com`
   - Any other testers
5. Select build 14
6. Click "Save"

**Testers Will:**
- Receive email invitation
- Install TestFlight app
- Accept invitation
- Install M1A v1.0.4
- Test new Assistant features

---

### Step 6: Prepare App Store Submission 🍎

**After TestFlight Testing Confirms Everything Works:**

1. **Go to App Store Connect:**
   - https://appstoreconnect.apple.com
   - Select "M1A"
   - Click "+ Version or Platform"
   - Select "iOS App"

2. **Version Information:**
   - Version: **1.0.4**
   - Build: Select **build 14**
   - "What's New": (See APP_STORE_SUBMISSION_v1.0.4.md)

3. **Fill Out All Required Fields:**
   - Screenshots (update if needed)
   - Description (verify current)
   - Keywords (add "AI assistant, chat")
   - Support URL (verify working)
   - Review information

4. **Submit for Review:**
   - Review all information
   - Click "Submit for Review"
   - Status: "Waiting for Review"

---

## ⏱️ Timeline

| Step | Duration | Status |
|------|----------|--------|
| **Git Push** | ✅ Complete | Done |
| **EAS Build** | 15-20 min | ⏳ Starting... |
| **TestFlight Upload** | 10-15 min | ⏳ Pending |
| **TestFlight Testing** | Immediate | ⏳ Pending |
| **App Store Review** | 1-3 days | ⏳ Pending |
| **App Store Live** | After approval | ⏳ Pending |

**Total Time:** 2-4 days (typically 2-3 days)

---

## 📋 Quick Reference

### Build Command
```powershell
eas build --platform ios --profile production
```

### Submit Command
```powershell
eas submit --platform ios --profile production --latest
```

### Check Build Status
- Terminal: Watch logs
- Dashboard: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

### App Store Connect
- URL: https://appstoreconnect.apple.com
- Email: `brogdon.lance@gmail.com`
- App ID: 6755367017

---

## 🎯 Success Criteria

✅ **Build Success:**
- Build completes without errors
- Build number: 14
- `.ipa` file available for download

✅ **TestFlight Success:**
- Build appears in TestFlight
- Internal testers can install
- App runs without crashes
- New features work correctly

✅ **App Store Success:**
- Submission accepted
- Status: "Waiting for Review"
- Review completed (1-3 days)
- App goes live

---

## 🚨 Troubleshooting

### Build Fails
- Check EAS logs for specific errors
- Verify `app.json` syntax
- Check `eas.json` configuration
- Ensure all dependencies installed

### TestFlight Upload Fails
- Verify Apple Developer account active
- Check bundle identifier matches
- Ensure certificates valid
- Try manual upload

### App Store Rejection
- Read rejection reason carefully
- Fix all issues mentioned
- Resubmit quickly
- Common fixes: privacy policy, demo account, app info

---

## 📞 Support Resources

- **EAS Dashboard:** https://expo.dev/accounts/lancemakesmusic/projects/m1a
- **Build Status:** https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- **App Store Connect:** https://appstoreconnect.apple.com
- **EAS Docs:** https://docs.expo.dev/build/introduction/
- **TestFlight Guide:** https://developer.apple.com/testflight/

---

## 🎉 Next Steps

1. ✅ **Code pushed to GitHub** - DONE
2. ⏳ **Build iOS app** - RUNNING
3. ⏳ **Submit to TestFlight** - PENDING
4. ⏳ **Test in TestFlight** - PENDING
5. ⏳ **Submit to App Store** - PENDING
6. ⏳ **App Store Review** - PENDING
7. ⏳ **App Goes Live** - PENDING

---

**🚀 Build is starting! Monitor progress in terminal or EAS dashboard.**

*Deployment execution guide created: January 8, 2026*

