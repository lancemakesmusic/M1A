# 📱 Android Build Guide

## Current Status

Your Android build is in progress. EAS is generating a new Android Keystore for signing your app.

---

## What's Happening

1. ✅ **Version Code Incremented**: 1 → 2
2. ✅ **Using Remote Credentials**: Expo manages your signing keys
3. ⏳ **Generating Keystore**: Creating a new signing key (first time only)

---

## Android Keystore

### What is it?

The Android Keystore is a cryptographic key used to sign your app. It's required for:
- Publishing to Google Play Store
- App updates (must use the same key)
- App security and integrity

### Expo-Managed Keystore

✅ **Advantages:**
- Expo stores it securely
- No need to manage keys yourself
- Automatic signing during builds
- Backup and recovery handled by Expo

⚠️ **Important:**
- Keep your Expo account secure
- Don't lose access to your Expo account
- The keystore is tied to your Expo project

---

## Build Process

The build typically takes **15-30 minutes** and includes:

1. ✅ Keystore generation (first time only)
2. ⏳ Installing dependencies
3. ⏳ Building native code
4. ⏳ Compiling JavaScript bundle
5. ⏳ Signing the APK/AAB
6. ⏳ Uploading to Expo servers

---

## Monitor Your Build

### EAS Dashboard

View build progress in real-time:
https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

### Via CLI

```bash
# Check build status
eas build:list --platform android --limit 1

# View build logs
eas build:view [BUILD_ID]
```

---

## Build Output

After the build completes, you'll get:

### APK (Android Package)
- For testing and direct installation
- Can be shared with testers
- Not for Play Store submission

### AAB (Android App Bundle)
- For Google Play Store submission
- Optimized for Play Store distribution
- Required for production releases

---

## Next Steps After Build

### 1. Download the Build

```bash
# Download the latest build
eas build:download --platform android --latest
```

Or download from the EAS dashboard.

### 2. Test the APK

Install on an Android device:
```bash
adb install path/to/your-app.apk
```

### 3. Submit to Play Store

Use the AAB file for Play Store submission:
1. Go to Google Play Console
2. Create a new app (if first time)
3. Upload the AAB file
4. Complete store listing
5. Submit for review

---

## Troubleshooting

### Build Stuck on Keystore Generation

If the build seems stuck:

1. **Wait 1-2 minutes** - Keystore generation can take time
2. **Check EAS Dashboard** - See real-time progress
3. **Check Build Logs** - Look for errors
4. **Restart Build** - If it fails:
   ```bash
   eas build --platform android --profile production
   ```

### Build Fails

Common issues:

1. **Network Issues**
   - Check internet connection
   - Try again later

2. **Dependencies**
   - Check `package.json` for issues
   - Run `npm install` locally first

3. **Configuration**
   - Verify `app.json` is valid
   - Check EAS build profile

4. **Quota Limits**
   - Check EAS subscription limits
   - Upgrade if needed

### View Build Logs

```bash
# Get build ID from dashboard or list
eas build:view [BUILD_ID]

# Or view latest
eas build:view --latest
```

---

## Build Configuration

### Current Settings

- **Platform**: Android
- **Profile**: production
- **Version Code**: 2 (auto-incremented)
- **Keystore**: Expo-managed (remote)

### Update Version Code

The version code is auto-incremented by EAS. To manually set:

```json
// app.json
{
  "expo": {
    "android": {
      "versionCode": 2
    }
  }
}
```

**Note**: EAS will still auto-increment, but this sets the base.

---

## Environment Variables

Your build uses:
- `EXPO_PUBLIC_API_BASE_URL`: https://m1a-backend-83002254287.us-central1.run.app

This is baked into the app at build time.

---

## Build Profiles

### Production Profile

Used for:
- Play Store releases
- Production testing
- Final app distribution

### Development Profile

For development builds:
```bash
eas build --platform android --profile development
```

---

## Security Notes

### Keystore Security

- ✅ Keystore is encrypted and stored securely by Expo
- ✅ Only accessible through your Expo account
- ✅ Backed up automatically
- ⚠️ Keep your Expo account secure
- ⚠️ Don't share your Expo credentials

### App Signing

- The keystore is used to sign every build
- Same keystore = same app identity
- Different keystore = different app (can't update)

---

## Cost

### EAS Build Pricing

- **Free Tier**: Limited builds per month
- **Production Builds**: May require paid plan
- Check: https://expo.dev/pricing

### Cloud Run Backend

- **Free Tier**: 2 million requests/month
- **After Free Tier**: Pay per use
- Very affordable for most apps

---

## 🎉 You're All Set!

Once the build completes:

1. ✅ Download the APK/AAB
2. ✅ Test on Android device
3. ✅ Submit to Play Store (when ready)

Your app is now:
- ✅ Backend running 24/7 on Cloud Run
- ✅ Frontend building for Android
- ✅ Ready for production! 🚀


