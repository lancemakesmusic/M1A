# Social Authentication Setup Guide

## Overview

M1A now supports Google and Apple Sign-In for a more convenient authentication experience.

## Features Implemented

### ✅ Password Reset Enhancement
- **Prominent button** with lock icon
- **Modal dialog** for better UX
- **Clear instructions** and email validation
- **Success feedback** with expiration notice

### ✅ Social Login Buttons
- **Google Sign-In** button (ready for configuration)
- **Apple Sign-In** button (iOS only, requires setup)
- **Visual dividers** ("OR" separator)
- **Consistent styling** with app theme

## Setup Instructions

### Apple Sign-In (iOS)

1. **Install the package:**
   ```bash
   npx expo install expo-apple-authentication
   ```

2. **Configure in Firebase Console:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Apple provider
   - Add your iOS bundle ID: `com.merkabaent.m1a`

3. **Configure in Apple Developer:**
   - Go to Apple Developer Portal
   - Create a Service ID
   - Configure Sign in with Apple
   - Add callback URL from Firebase

4. **Update app.json:**
   - Already configured: `"usesAppleSignIn": true`

5. **Rebuild the app:**
   ```bash
   eas build --platform ios
   ```

### Google Sign-In

**Current Status:** Framework ready, requires additional configuration

**To fully enable:**

1. **Install packages (if needed):**
   ```bash
   npx expo install expo-auth-session expo-crypto
   ```

2. **Configure in Firebase Console:**
   - Go to Firebase Console > Authentication > Sign-in method
   - Enable Google provider
   - Add your OAuth client IDs (iOS and Android)

3. **Get OAuth Client IDs:**
   - iOS: From Google Cloud Console
   - Android: From Google Cloud Console
   - Web: From Google Cloud Console (for Expo)

4. **Update SocialAuthService.js:**
   - Implement `expo-auth-session` flow
   - Configure OAuth redirect URLs
   - Handle token exchange

**Note:** Google Sign-In currently shows a helpful error message directing users to use email/password. The full implementation requires OAuth configuration.

## Current Implementation

### Password Reset
- ✅ Fully functional
- ✅ Prominent button with icon
- ✅ Modal dialog
- ✅ Email validation
- ✅ Success/error handling

### Apple Sign-In
- ✅ Framework implemented
- ⚠️ Requires `expo-apple-authentication` package
- ⚠️ Requires Firebase/Apple configuration
- ✅ Graceful error handling

### Google Sign-In
- ✅ Framework implemented
- ⚠️ Requires OAuth configuration
- ⚠️ Requires `expo-auth-session` implementation
- ✅ Helpful error messages

## User Experience

### Before:
- Password reset: Small text link, inline flow
- Social login: Not available

### After:
- Password reset: **Prominent button** → **Modal dialog** → **Clear instructions**
- Social login: **Visual buttons** with proper styling and error handling

## Testing

### Password Reset
1. Click "Forgot Password" button
2. Enter email in modal
3. Verify email validation
4. Check email for reset link

### Apple Sign-In (iOS only)
1. Click "Continue with Apple"
2. Complete Apple authentication
3. Verify account creation/login

### Google Sign-In
1. Click "Continue with Google"
2. Currently shows configuration message
3. After setup, will complete OAuth flow

## Next Steps

1. **Install Apple Authentication package:**
   ```bash
   npx expo install expo-apple-authentication
   ```

2. **Configure Apple Sign-In** in Firebase and Apple Developer Portal

3. **Implement Google OAuth** flow using `expo-auth-session`

4. **Test on physical devices** (social auth requires real devices)

5. **Update error messages** once fully configured

---

*Setup guide created: January 8, 2026*

