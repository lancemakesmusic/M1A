# Google OAuth Compliance Fix Checklist

**Goal:** Fix Error 400: invalid_request for Google Drive integration

---

## Quick Fix Steps

### Step 1: OAuth Consent Screen Configuration

#### ✅ Required Fields
- [ ] **App name:** Set to "M1A" or "Merkaba Entertainment"
- [ ] **User support email:** Set to your support email
- [ ] **App logo:** Upload logo (optional but recommended)
- [ ] **Application home page:** 
  - Use: `https://m1a.app` OR
  - Use: `https://m1alive.firebaseapp.com`
- [ ] **Privacy policy URL:** ⚠️ **REQUIRED**
  - Use: `https://m1a.app/privacy-policy` OR
  - Use: `https://m1alive.firebaseapp.com/privacy-policy`
- [ ] **Terms of service URL:** ⚠️ **REQUIRED**
  - Use: `https://m1a.app/terms` OR
  - Use: `https://m1alive.firebaseapp.com/terms`

#### ✅ Scopes
- [ ] `https://www.googleapis.com/auth/drive.readonly`
- [ ] `openid`
- [ ] `email`
- [ ] `profile`

#### ✅ Test Users (If in Testing Mode)
- [ ] Add all test user emails to "Test users" list
- [ ] Include: `ambientstudioslive@gmail.com`
- [ ] Include any other test accounts

---

### Step 2: OAuth 2.0 Credentials

#### ✅ Authorized Redirect URIs
Add these exact URIs (match your app's redirect URI):

```
m1a://auth/google-drive
exp://localhost:8081/--/auth/google-drive
http://localhost:8081/auth/google-drive
https://m1a.app/auth/google-drive
```

**To find your app's redirect URI:**
```javascript
import * as Linking from 'expo-linking';
const redirectUri = Linking.createURL('/auth/google-drive');
console.log('Redirect URI:', redirectUri);
```

---

### Step 3: Authorized Domains

#### ✅ Add Domains
- [ ] `m1a.app`
- [ ] `www.m1a.app`
- [ ] `m1alive.firebaseapp.com` (if using Firebase hosting)

---

### Step 4: Privacy Policy & Terms

#### ✅ Privacy Policy
- [ ] File exists: `privacy-policy.html` ✅ (You have this!)
- [ ] Deployed to accessible URL
- [ ] URL matches OAuth consent screen

#### ✅ Terms of Service
- [ ] File exists: `terms.html` (create if needed)
- [ ] Deployed to accessible URL
- [ ] URL matches OAuth consent screen

---

## Verification Steps

### 1. Check OAuth Consent Screen
- [ ] Go to: https://console.cloud.google.com/apis/credentials/consent
- [ ] Verify all required fields are filled
- [ ] Check publishing status (Testing or Published)

### 2. Check Credentials
- [ ] Go to: https://console.cloud.google.com/apis/credentials
- [ ] Find your OAuth 2.0 Client ID
- [ ] Verify redirect URIs match your app
- [ ] Verify Client ID matches `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

### 3. Test OAuth Flow
- [ ] Clear app cache/data
- [ ] Try Google Drive connection
- [ ] Verify no Error 400
- [ ] Verify successful connection

---

## Common Issues & Quick Fixes

### Issue: "Access blocked" for specific users
**Fix:** Add user to "Test users" list in OAuth consent screen

### Issue: "Invalid redirect URI"
**Fix:** 
1. Check what redirect URI your app uses (console.log)
2. Add exact URI to Google Cloud Console
3. Save and wait 5 minutes for propagation

### Issue: "App not verified"
**Fix:**
- For testing: Use less sensitive scopes
- For production: Submit app for verification

### Issue: Missing privacy policy/terms
**Fix:**
- Create `privacy-policy.html` and `terms.html`
- Deploy to accessible URLs
- Add URLs to OAuth consent screen

---

## Testing Checklist

Before testing:
- [ ] OAuth consent screen configured
- [ ] All required fields filled
- [ ] Privacy policy URL accessible
- [ ] Terms URL accessible
- [ ] Test users added (if in Testing mode)
- [ ] Redirect URIs configured
- [ ] Authorized domains added

After testing:
- [ ] OAuth flow completes successfully
- [ ] No Error 400
- [ ] Google Drive connection works
- [ ] Files can be accessed

---

## Production Checklist

Before going live:
- [ ] App published (not in Testing mode)
- [ ] Privacy policy publicly accessible
- [ ] Terms of service publicly accessible
- [ ] App verified (if required)
- [ ] Production redirect URIs configured
- [ ] Support email monitored

---

## Quick Reference Links

- **OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent
- **OAuth Credentials:** https://console.cloud.google.com/apis/credentials
- **Your Privacy Policy:** `privacy-policy.html` (exists ✅)

---

**Status:** Ready to fix - Follow checklist above
**Estimated Time:** 15-30 minutes


