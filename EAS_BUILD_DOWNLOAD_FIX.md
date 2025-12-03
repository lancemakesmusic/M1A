# 🔧 EAS Build Download - Solution

## Issue

The `--latest` flag doesn't exist in EAS CLI's `build:download` command, and the build list is empty.

---

## ✅ Solution: Use EAS Dashboard

**The EAS Dashboard is the most reliable method:**

### Step 1: Open Dashboard

Go to: **https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds**

### Step 2: Find Your Build

You'll see:
- All builds (including in-progress)
- Build status (queued, in-progress, finished, errored)
- Real-time progress
- Build logs

### Step 3: Download

When build is complete:
1. Click on the build
2. Click **Download** button
3. Choose **APK** (for testing) or **AAB** (for Play Store)

---

## Alternative: Use Build ID

### Step 1: Get Build ID from Dashboard

1. Go to: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
2. Find your Android build
3. Copy the Build ID (looks like: `abc123def456`)

### Step 2: Download via CLI

```bash
eas build:download --platform android --id [BUILD_ID]
```

Replace `[BUILD_ID]` with the actual ID from the dashboard.

---

## Why Build List is Empty

The empty build list could mean:

1. **Build is still queued** - Check dashboard to see status
2. **Build hasn't started** - Verify the build command completed
3. **Authentication issue** - Run `eas whoami` to verify login
4. **Different project** - Verify you're in the right project

---

## Check Build Status

### Via Dashboard (Recommended)

https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds

### Via CLI

```bash
# Check authentication
eas whoami

# List builds (may be empty if build is queued)
eas build:list --platform android

# View specific build (if you have the ID)
eas build:view [BUILD_ID]
```

---

## EAS CLI Version Issue

The CLI keeps showing "outdated version" even after upgrade. This is a known issue with PowerShell caching.

### Fix: Restart PowerShell

1. Close PowerShell completely
2. Open a new PowerShell window
3. Try commands again

### Or Use npx

```bash
# This always uses the latest version
npx eas-cli@latest [command]
```

---

## Correct Download Command Syntax

The `build:download` command requires a Build ID:

```bash
# ❌ This doesn't work
eas build:download --platform android --latest

# ✅ This works
eas build:download --platform android --id [BUILD_ID]

# ✅ Or download from dashboard
# (No command needed - just click Download button)
```

---

## Build Statuses

- **queued**: Build is waiting to start
- **in-progress**: Build is running (15-30 minutes)
- **finished**: Build completed - ready to download
- **errored**: Build failed - check logs
- **canceled**: Build was canceled

---

## Quick Reference

### Download from Dashboard

1. Go to: https://expo.dev/accounts/lancemakesmusic/projects/m1a/builds
2. Find Android build
3. Click Download
4. Choose APK or AAB

### Download via CLI

```bash
# Get Build ID from dashboard first
eas build:download --platform android --id [BUILD_ID]
```

### Check Status

```bash
# Verify login
eas whoami

# List builds
eas build:list --platform android

# View build details
eas build:view [BUILD_ID]
```

---

## 🎯 Recommended Approach

**Use the EAS Dashboard** - It's the most reliable and shows everything you need:
- Real-time build progress
- Build status
- Download links
- Build logs
- No CLI version issues

---

## Troubleshooting

### Build Not Showing in List

1. **Check Dashboard** - Builds show there even if CLI doesn't list them
2. **Verify Build Started** - Check if `eas build` command completed
3. **Check Authentication** - Run `eas whoami`
4. **Wait a Few Minutes** - Builds may take time to appear

### Can't Download

1. **Check Build Status** - Must be "finished"
2. **Use Dashboard** - Most reliable method
3. **Check Permissions** - Ensure you have access to the build

### CLI Version Issues

1. **Restart PowerShell** - Clears cache
2. **Use npx** - `npx eas-cli@latest [command]`
3. **Use Dashboard** - No CLI needed

---

## Summary

✅ **Best Method**: Use EAS Dashboard  
✅ **Alternative**: Use Build ID with CLI  
❌ **Not Available**: `--latest` flag doesn't exist  

The dashboard is your best friend for managing builds! 🚀


