# How to Check Your Current TestFlight Version

## 📱 Method 1: In the TestFlight App (Easiest)

1. **Open TestFlight app** on your iPhone/iPad
2. **Find M1A** in your list of apps
3. **Tap on M1A**
4. **Look at the version info**:
   - Version number (e.g., "1.0.0")
   - Build number (e.g., "Build 5")
   - Install date

---

## 📱 Method 2: In the M1A App Itself

1. **Open M1A app**
2. **Go to Profile** (bottom tab)
3. **Tap Settings** (gear icon)
4. **Scroll down** - version info should be displayed at the bottom

*(Note: If version isn't displayed in settings, we can add it)*

---

## 💻 Method 3: Via EAS Build List

Run this command in your terminal:

```bash
eas build:list --platform ios --limit 5
```

This shows:
- Build number
- Version
- Status (finished, in progress, etc.)
- Submission status

**Example output:**
```
Build #5 - Version 1.0.0 - Status: finished - Submitted to TestFlight
Build #4 - Version 1.0.0 - Status: finished
```

---

## 🌐 Method 4: Via App Store Connect

1. **Go to**: https://appstoreconnect.apple.com
2. **Sign in** with your Apple ID
3. **Click "My Apps"**
4. **Select "M1A"**
5. **Click "TestFlight" tab**
6. **Look at "iOS Builds"** section
   - Shows all builds
   - Current build in TestFlight is marked
   - Shows version and build number

---

## 🔍 Method 5: Check app.json

Your current version is set in `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    }
  }
}
```

**Note**: If using `appVersionSource: "remote"` in `eas.json`, EAS manages build numbers automatically, so the build number in `app.json` may not match the actual TestFlight build.

---

## 📊 Quick Check Command

Run this to see your latest build:

```bash
eas build:list --platform ios --limit 1
```

This shows the most recent build with:
- Build number
- Version
- Status
- Whether it's submitted to TestFlight

---

## 🎯 What to Look For

- **Version**: `1.0.0` (from app.json)
- **Build Number**: Auto-incremented by EAS (5, 6, 7, etc.)
- **Status**: Should be "finished" and "submitted"

---

## 💡 Quick Answer

**Fastest way**: Open TestFlight app → Tap M1A → See version and build number at the top

**From terminal**: 
```bash
eas build:list --platform ios --limit 1
```

