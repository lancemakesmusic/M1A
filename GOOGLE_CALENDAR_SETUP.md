# 📅 Google Calendar Setup - Step by Step

Follow these steps to set up Google Calendar integration for M1A.

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Click "Select a project"** → **"New Project"**
3. **Fill in details**:
   - Project name: `M1A Calendar Integration`
   - Organization: (leave default if applicable)
   - Location: (leave default)
4. **Click "Create"**
5. **Wait for project creation** (takes ~30 seconds)
6. **Select the new project** from the project dropdown

---

## Step 2: Enable Google Calendar API

1. **In Google Cloud Console**, go to **"APIs & Services"** → **"Library"**
2. **Search for "Google Calendar API"**
3. **Click on "Google Calendar API"**
4. **Click "Enable"**
5. **Wait for API to enable** (~10 seconds)

---

## Step 3: Configure OAuth Consent Screen

1. **Go to "APIs & Services"** → **"OAuth consent screen"**
2. **Select "External"** (unless you have Google Workspace)
3. **Click "Create"**

### App Information:
- **App name**: `M1A`
- **User support email**: (your email)
- **App logo**: (optional)
- **Application home page**: (your website or leave blank)
- **Application privacy policy link**: (optional)
- **Application terms of service link**: (optional)
- **Authorized domains**: (optional)
- **Developer contact information**: (your email)

4. **Click "Save and Continue"**

### Scopes:
1. **Click "Add or Remove Scopes"**
2. **Search for "calendar"**
3. **Select**: `https://www.googleapis.com/auth/calendar`
4. **Click "Update"** → **"Save and Continue"**

### Test Users:
1. **Add your email address** as a test user
2. **Click "Add"**
3. **Click "Save and Continue"**

### Summary:
1. **Review the information**
2. **Click "Back to Dashboard"**

---

## Step 4: Create OAuth 2.0 Credentials

1. **Go to "APIs & Services"** → **"Credentials"**
2. **Click "Create Credentials"** → **"OAuth client ID"**
3. **If prompted**, select "Web application"
4. **Fill in**:
   - **Name**: `M1A Calendar OAuth`
   - **Authorized JavaScript origins**: 
     - `http://localhost:8081`
     - `exp://localhost:8081`
   - **Authorized redirect URIs**:
     - `exp://localhost:8081`
     - `http://localhost:8081`
     - (Add your production domain if you have one)
5. **Click "Create"**
6. **IMPORTANT**: Copy the **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
7. **Click "OK"**

---

## Step 5: Create Business Calendar

1. **Go to Google Calendar**: https://calendar.google.com
2. **On the left sidebar**, click the **"+"** next to "Other calendars"
3. **Select "Create new calendar"**
4. **Fill in**:
   - **Name**: `Merkaba Master Schedule` (or your preferred name)
   - **Description**: `M1A venue booking calendar`
   - **Time zone**: Select your timezone
   - **Make it public**: (optional, for sharing)
5. **Click "Create calendar"**

---

## Step 6: Get Calendar ID

1. **In Google Calendar**, click the **three dots** (⋮) next to your new calendar
2. **Select "Settings and sharing"**
3. **Scroll down** to "Integrate calendar"
4. **Find "Calendar ID"** (looks like: `abc123@group.calendar.google.com`)
5. **Copy the Calendar ID**

---

## Step 7: Add to .env File

1. **Open your `.env` file** in the project root
2. **Add these lines**:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com
```

3. **Replace**:
   - `your-client-id-here` with the Client ID from Step 4
   - `your-calendar-id@group.calendar.google.com` with the Calendar ID from Step 6
4. **Save the file**

---

## Step 8: Verify Setup

Run the verification script:

```bash
node scripts/verify-env.js
```

You should see:
- ✅ EXPO_PUBLIC_GOOGLE_CLIENT_ID: PRESENT
- ✅ EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID: PRESENT

---

## Step 9: Test in App

1. **Restart your Expo app** (to load new environment variables)
2. **Go to Settings** in the app
3. **Look for "Connect Google Calendar"** option
4. **Complete OAuth flow**:
   - You'll be redirected to Google
   - Sign in with your Google account
   - Grant calendar permissions
   - You'll be redirected back to the app
5. **Verify connection** shows as "Connected"

---

## Troubleshooting

### "Invalid Client ID"
- Make sure you copied the full Client ID
- Check for extra spaces in `.env` file
- Restart Expo after adding variables

### "Calendar not found"
- Verify Calendar ID is correct
- Make sure calendar exists in your Google account
- Check calendar sharing settings

### "OAuth redirect error"
- Verify redirect URIs match in Google Cloud Console
- Check that you're using the correct Client ID

### "Permission denied"
- Make sure you added your email as a test user
- Check that Calendar API is enabled
- Verify OAuth consent screen is configured

---

## Quick Reference

**Where to find things:**

- **Client ID**: Google Cloud Console → APIs & Services → Credentials
- **Calendar ID**: Google Calendar → Calendar Settings → Integrate calendar
- **OAuth Consent**: Google Cloud Console → APIs & Services → OAuth consent screen
- **Calendar API**: Google Cloud Console → APIs & Services → Library

---

## Next Steps

After completing this setup:
1. ✅ Verify environment variables
2. ✅ Test calendar connection in app
3. ✅ Test event booking
4. ✅ Verify events appear in Google Calendar

Then proceed to connectivity check!

