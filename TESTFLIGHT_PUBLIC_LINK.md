# 📱 TestFlight Public Link - How to Generate

## Quick Steps

### Option 1: Generate New Public Link in App Store Connect

1. **Go to App Store Connect:**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with: `brogdon.lance@gmail.com`

2. **Navigate to TestFlight:**
   - Click on "My Apps"
   - Select "M1A" app
   - Click on "TestFlight" tab (top navigation)

3. **Create/Update Public Link:**
   - Scroll down to "Public Link" section
   - Click "Enable Public Link" or "Manage Public Link"
   - Copy the public link (format: `https://testflight.apple.com/join/XXXXXX`)

4. **Share the Link:**
   - Anyone with the link can install the app
   - No need to add testers manually
   - Link works for up to 10,000 testers

---

### Option 2: Add Testers Manually

1. **In TestFlight Tab:**
   - Click "Internal Testing" or "External Testing"
   - Click "+" to add testers
   - Enter email addresses
   - Testers will receive email invites

---

### Option 3: Submit New Build (If Current Build Expired)

If your current build expired or was removed:

```bash
# Build new version
npx eas-cli@latest build --platform ios --profile production

# Submit to TestFlight
npx eas-cli@latest submit --platform ios --profile production --latest
```

---

## Current App Info

- **App ID**: 6755367017
- **Bundle ID**: com.merkabaent.m1a
- **Apple ID**: brogdon.lance@gmail.com
- **TestFlight URL**: https://appstoreconnect.apple.com/apps/6755367017/testflight/ios

---

## Troubleshooting

### Build Expired
- TestFlight builds expire after 90 days
- Submit a new build to continue testing

### Public Link Not Working
- Make sure a build is available in TestFlight
- Check that the build is approved (can take 24-48 hours first time)
- Ensure the build is added to a TestFlight group

### No Builds Available
- Check if build #17 is still processing
- Wait for Apple to finish processing (5-10 minutes)
- If build failed, check build logs in EAS Dashboard

---

## Quick Access Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight Dashboard**: https://appstoreconnect.apple.com/apps/6755367017/testflight/ios
- **EAS Builds**: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- **EAS Submissions**: https://expo.dev/accounts/lancemakesmusic/projects/m1a/submissions


