# 🚀 TestFlight Update Instructions - M1A v1.0

## Quick Update Process

### Step 1: Build New Version

```bash
eas build --platform ios --profile production
```

**What happens:**
- EAS automatically increments build number (using `appVersionSource: "remote"`)
- Builds your app with all latest changes
- Uploads to EAS servers
- Takes ~10-20 minutes

**You can:**
- Press `Ctrl+C` to exit and check progress later
- Monitor at: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

---

### Step 2: Submit to TestFlight

Once build completes, submit it:

```bash
eas submit --platform ios --profile production --latest
```

**What happens:**
- Finds your latest build automatically
- Uploads to App Store Connect
- Available in TestFlight after Apple processes (5-10 minutes)

---

## Alternative: One Command

Build and submit in one go:

```bash
eas build --platform ios --profile production --auto-submit
```

---

## After Submission

1. **Apple Processing**: 5-10 minutes
2. **TestFlight**: Build appears automatically
3. **Testers**: Existing testers notified
4. **Version**: Build number auto-increments (5 → 6 → 7, etc.)

---

## Current Status

- **Version**: 1.0.0
- **Last Build**: Check at https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- **App Store Connect**: https://appstoreconnect.apple.com
- **Bundle ID**: `com.merkabaent.m1a`

---

## Important Notes

✅ **Auto Versioning**: `appVersionSource: "remote"` means EAS handles build numbers  
✅ **No Manual Updates**: Don't manually change `buildNumber` in `app.json`  
✅ **Version Field**: Only change `version` in `app.json` for major releases (1.0.0 → 1.1.0)

---

## Troubleshooting

### Build Fails?
- Check build logs at the URL provided
- Common issues: missing credentials, code signing problems
- Verify all dependencies installed: `npm install`

### Submission Fails?
- Ensure Apple Developer account is active
- Verify build completed successfully first
- Check App Store Connect API key is valid

### Need to Update Version Number?
- Edit `app.json`: `"version": "1.0.0"` → `"1.0.1"`
- Then build and submit as normal

---

## Verification

After submission, verify:

1. **App Store Connect**:
   - Go to: https://appstoreconnect.apple.com
   - Navigate to: My Apps → M1A → TestFlight
   - Check build appears and is processing

2. **TestFlight App**:
   - Open TestFlight on your device
   - Check if new build is available
   - Install and test

---

## What's New in v1.0

- ✅ Complete app functionality
- ✅ Stripe payment integration
- ✅ Google Calendar sync
- ✅ Full wallet features
- ✅ M1A personalization system
- ✅ Production-ready backend
- ✅ Clean documentation

---

**Ready to update? Run the build command above!** 🎉

