# 🚀 Quick Build & Deploy Commands

## ✅ Completed Steps

1. ✅ **Fixed Dependencies**
   - Updated `expo-file-system` to 19.0.19
   - Fixed syntax error in ServiceBookingScreen.js

2. ✅ **Committed to GitHub**
   - All changes committed
   - Secret files excluded
   - Push successful

---

## 📦 Step 1: Build iOS App

```bash
eas build --platform ios --profile production
```

**What this does:**
- Builds iOS app for TestFlight
- Auto-increments build number
- Takes 15-30 minutes
- Uploads to EAS servers

**Monitor progress:**
- Dashboard: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- CLI: `eas build:list --platform ios`

---

## 🚀 Step 2: Submit to TestFlight

**After build completes:**

```bash
eas submit --platform ios --profile production --latest
```

**Or submit specific build:**

```bash
# List builds
eas build:list --platform ios --limit 5

# Submit by ID
eas submit --platform ios --profile production --id [BUILD_ID]
```

**What this does:**
- Submits build to App Store Connect
- Uploads to TestFlight
- Takes 5-10 minutes

**Monitor submission:**
- Dashboard: https://expo.dev/accounts/lancemakesmusic/projects/m1a/submissions
- App Store Connect: https://appstoreconnect.apple.com

---

## ⚡ All-in-One (Run Build Now)

```bash
# Start the build
eas build --platform ios --profile production
```

**While build is running:**
- Build takes 15-30 minutes
- You can continue working
- Check status in dashboard

**After build completes:**
```bash
# Submit to TestFlight
eas submit --platform ios --profile production --latest
```

---

## 📋 Current Configuration

- **Bundle ID**: `com.merkabaent.m1a`
- **Apple ID**: `brogdon.lance@gmail.com`
- **ASC App ID**: `6755367017`
- **Build Number**: Auto-increments
- **Version**: 1.0.0

---

## 🔍 Check Status

**Build Status:**
```bash
eas build:list --platform ios --limit 5
```

**Submission Status:**
```bash
eas submit:list --platform ios --limit 5
```

**Dashboard:**
- Builds: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- Submissions: https://expo.dev/accounts/lancemakesmusic/projects/m1a/submissions

---

## ⏱️ Timeline

- **Build**: 15-30 minutes
- **Submission**: 5-10 minutes
- **TestFlight Processing**: 5-15 minutes
- **First Review**: 24-48 hours (if first submission)
- **Subsequent Updates**: Usually faster

---

## 🎯 Ready to Build?

Run this command now:

```bash
eas build --platform ios --profile production
```














