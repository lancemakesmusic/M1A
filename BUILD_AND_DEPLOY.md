# 🚀 Build and Deploy to TestFlight

## Step 1: Build iOS App for TestFlight

```bash
# Build iOS app for production (TestFlight)
eas build --platform ios --profile production
```

This will:
- Build the iOS app with production profile
- Auto-increment build number
- Upload to EAS servers
- Take 15-30 minutes

## Step 2: Commit Changes to GitHub

```bash
# Stage all changes
git add .

# Commit with message
git commit -m "Fix: Update expo-file-system to 19.0.19 and fix ServiceBookingScreen syntax error"

# Push to GitHub
git push origin main
```

## Step 3: Submit to TestFlight

After the build completes:

```bash
# Submit latest iOS build to TestFlight
eas submit --platform ios --profile production --latest
```

Or submit a specific build:

```bash
# List builds to get build ID
eas build:list --platform ios --limit 5

# Submit specific build
eas submit --platform ios --profile production --id [BUILD_ID]
```

## Complete Workflow (All-in-One)

```bash
# 1. Build
eas build --platform ios --profile production

# 2. Commit (while build is running)
git add .
git commit -m "Fix: Update expo-file-system and fix syntax errors"
git push origin main

# 3. Wait for build to complete, then submit
eas submit --platform ios --profile production --latest
```

## Build Status

Check build status:
- **EAS Dashboard**: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
- **CLI**: `eas build:list --platform ios`

## TestFlight Submission Status

Check submission status:
- **EAS Dashboard**: https://expo.dev/accounts/lancemakesmusic/projects/m1a/submissions
- **App Store Connect**: https://appstoreconnect.apple.com

## Notes

- Build takes 15-30 minutes
- TestFlight submission takes 5-10 minutes
- App Store Connect review takes 24-48 hours (first time)
- Subsequent updates are usually faster

## Current Configuration

- **Bundle ID**: `com.merkabaent.m1a`
- **Apple ID**: `brogdon.lance@gmail.com`
- **ASC App ID**: `6755367017`
- **Build Number**: Auto-increments
- **Version**: 1.0.0














