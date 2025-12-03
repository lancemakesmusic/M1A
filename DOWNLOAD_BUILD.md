# 📥 Download Android Build

## Issue: `--latest` Flag Not Supported

Your EAS CLI version doesn't support the `--latest` flag. Here are several ways to download your build:

---

## Option 1: Use EAS Dashboard (Easiest)

1. Go to: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
2. Find your completed Android build
3. Click the **Download** button
4. Choose APK (for testing) or AAB (for Play Store)

---

## Option 2: Use Build ID

### Step 1: Get Build ID

```bash
# List recent builds
eas build:list --platform android --limit 5
```

This will show output like:
```
Builds for @lancemakesmusic/m1a:
  ID: abc123def456
  Platform: android
  Status: finished
  ...
```

### Step 2: Download by ID

```bash
eas build:download --platform android --id abc123def456
```

---

## Option 3: Upgrade EAS CLI (Then Use --latest)

### Upgrade CLI

```bash
npm install -g eas-cli@latest
```

**Note:** You may need to:
- Close and reopen PowerShell
- Or use `npx eas-cli@latest` instead

### Then Download

```bash
eas build:download --platform android --latest
```

---

## Option 4: Use npx (Bypass Version Issue)

```bash
npx eas-cli@latest build:download --platform android --latest
```

This uses the latest version without upgrading globally.

---

## Check Build Status

### Via CLI

```bash
# List all Android builds
eas build:list --platform android

# View specific build
eas build:view [BUILD_ID]
```

### Via Dashboard

https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

---

## Build Statuses

- **in-progress**: Build is still running (wait for completion)
- **finished**: Build completed successfully (ready to download)
- **errored**: Build failed (check logs)
- **canceled**: Build was canceled

---

## Download Locations

After downloading, files are typically saved to:
- **Windows**: Current directory or Downloads folder
- **APK**: `m1a-*.apk`
- **AAB**: `m1a-*.aab`

---

## Install APK on Android Device

### Via ADB

```bash
adb install path/to/m1a-*.apk
```

### Via Device

1. Transfer APK to Android device
2. Enable "Install from Unknown Sources" in settings
3. Open APK file
4. Install

---

## Submit AAB to Play Store

1. Go to Google Play Console
2. Create new app (if first time)
3. Go to "Release" → "Production"
4. Upload the AAB file
5. Complete store listing
6. Submit for review

---

## Troubleshooting

### Build Not Showing

If `eas build:list` shows no builds:

1. **Check Dashboard**: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
2. **Verify Build Started**: Check if build actually started
3. **Check Authentication**: Run `eas whoami` to verify login

### Download Fails

1. **Check Build Status**: Must be "finished"
2. **Check Internet**: Ensure stable connection
3. **Try Dashboard**: Use web interface instead
4. **Check Permissions**: Ensure you have access to the build

### CLI Version Issues

If upgrade doesn't work:

```bash
# Uninstall old version
npm uninstall -g eas-cli

# Install latest
npm install -g eas-cli@latest

# Or use npx
npx eas-cli@latest [command]
```

---

## Quick Commands

```bash
# List builds
eas build:list --platform android

# Download latest (if supported)
eas build:download --platform android --latest

# Download by ID
eas build:download --platform android --id [BUILD_ID]

# View build details
eas build:view [BUILD_ID]

# Check CLI version
eas --version
```

---

## 🎯 Recommended Approach

**For now, use the EAS Dashboard:**
1. Go to: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
2. Find your Android build
3. Click Download
4. Choose APK or AAB

This is the most reliable method and doesn't depend on CLI version!


