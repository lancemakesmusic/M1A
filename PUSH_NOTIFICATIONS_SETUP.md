# 📱 Push Notifications Setup Guide

## ✅ Current Status

Your app is already configured for push notifications:
- ✅ `expo-notifications` plugin configured in `app.json`
- ✅ `NotificationService.js` implemented with full functionality
- ✅ Notification preferences system in place
- ✅ Message, event, and discount notification handlers ready

## 🔧 Setup Steps

### Step 1: During EAS Build

When EAS asks: **"Generate a new Apple Push Notifications service key?"**

**Answer: `Yes`** (recommended for first-time setup)

This will:
- Generate a new APNs key in your Apple Developer account
- Automatically configure it with EAS
- Store it securely for future builds

### Step 2: After Build Completes

EAS will automatically:
- ✅ Generate the APNs key
- ✅ Link it to your project
- ✅ Configure push notification capabilities
- ✅ Enable production push notifications

### Step 3: Verify Configuration

After the build, verify in:
1. **Apple Developer Portal:**
   - Go to: https://developer.apple.com/account/resources/authkeys/list
   - You should see a new key for "Apple Push Notifications service (APNs)"
   - Key will be named something like "[Expo] EAS Push Notifications"

2. **EAS Dashboard:**
   - Go to: https://expo.dev/accounts/lancemakesmusic/projects/m1a/credentials
   - iOS Push Notifications should show as "Configured"

## 📋 What's Already Configured

### app.json
```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/images/icon.png",
        "color": "#9C27B0",
        "sounds": []
      }
    ]
  ],
  "ios": {
    "entitlements": {
      "aps-environment": "production"
    }
  }
}
```

### NotificationService.js
- ✅ Push token registration
- ✅ Permission requests
- ✅ Notification listeners
- ✅ Event reminders
- ✅ Message notifications
- ✅ Discount notifications
- ✅ User preferences

## 🧪 Testing Push Notifications

### 1. Test in Development
```bash
# Get your Expo push token
# (Already logged in NotificationService.js)

# Send a test notification using Expo's tool:
# https://expo.dev/notifications
```

### 2. Test in Production
After the build is deployed:
1. Install the app from TestFlight
2. Grant notification permissions
3. Check that push token is registered
4. Send test notifications from your backend

## 🔔 Notification Types Configured

### 1. Messages
- Triggered when user receives a new message
- User preference: `allowMessageNotifications`

### 2. Events
- Event reminders (24 hours before)
- Event updates
- RSVP confirmations
- User preference: `allowEventNotifications`

### 3. Discounts
- New deals available
- Special offers
- User preference: `allowDiscountNotifications`

## 📝 Next Steps After Build

1. **Wait for build to complete** (10-15 minutes)

2. **Verify APNs key was created:**
   ```bash
   eas credentials
   ```
   Select iOS → Push Notifications → Should show "Configured"

3. **Test notifications:**
   - Install app from TestFlight
   - Grant notification permissions
   - Verify push token is registered (check logs)
   - Send test notification

4. **Backend Integration:**
   - Use Expo Push Notification API to send notifications
   - Or use Firebase Cloud Messaging (if configured)
   - Store push tokens in Firestore for user-specific notifications

## 🚨 Troubleshooting

### If notifications don't work:

1. **Check permissions:**
   - Settings → M1A → Notifications → Should be enabled

2. **Check push token:**
   - Look for "✅ Push token:" in app logs
   - Token should start with "ExponentPushToken["

3. **Check APNs configuration:**
   ```bash
   eas credentials
   ```
   - iOS → Push Notifications → Should show "Configured"

4. **Check app.json:**
   - Ensure `expo-notifications` plugin is present
   - Ensure `aps-environment` is set to "production"

## 📚 Resources

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [EAS Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)

---

**Status:** ✅ Ready for push notifications  
**Next:** Complete the EAS build, then test notifications in TestFlight

