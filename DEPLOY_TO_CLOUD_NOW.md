# 🚀 DEPLOY TO CLOUD - Quick Guide

## ⚠️ CRITICAL: App Currently Requires Your Laptop

**Current Status**: Backend is hardcoded to `localhost:8001` and `172.20.10.3:8001`

**Impact**: App will NOT work without your laptop running

---

## ✅ SOLUTION: Deploy to Google Cloud Run (30 minutes)

### Why Google Cloud Run?
- ✅ **Serverless** - No laptop needed
- ✅ **Auto-scaling** - Handles traffic automatically  
- ✅ **Free tier** - $0/month for low usage
- ✅ **Production-ready** - Used by major companies
- ✅ **Easy deployment** - Docker-based

---

## 📋 STEP-BY-STEP DEPLOYMENT

### Step 1: Prepare Backend (5 minutes)

1. **Install Google Cloud SDK** (if not installed):
```bash
# Windows (PowerShell)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

2. **Login to Google Cloud**:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

3. **Enable required APIs**:
```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Step 2: Deploy Backend (10 minutes)

```bash
cd autoposter-backend

# Build and deploy to Cloud Run
gcloud run deploy m1a-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com"
```

**After deployment, you'll get a URL like:**
```
https://m1a-backend-xxxxx-uc.a.run.app
```

### Step 3: Update Frontend (5 minutes)

1. **Create/Update `.env` file** in project root:
```bash
EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app
```

2. **Update `app.json`** to include environment variable:
```json
{
  "expo": {
    "extra": {
      "apiBaseUrl": "https://m1a-backend-xxxxx-uc.a.run.app"
    }
  }
}
```

### Step 4: Fix Hardcoded IPs (10 minutes)

**Files to update**:
- `screens/EventBookingScreen.js`
- `screens/ServiceBookingScreen.js`
- `screens/M1ADashboardScreen.js`
- `screens/M1APersonalizationScreen.js`
- `screens/BarMenuCategoryScreen.js`
- `screens/AutoPosterScreen.js`

**Change from**:
```javascript
return 'http://172.20.10.3:8001';
```

**Change to**:
```javascript
return process.env.EXPO_PUBLIC_API_BASE_URL || 'https://m1a-backend-xxxxx-uc.a.run.app';
```

### Step 5: Rebuild App (10 minutes)

```bash
# Build for iOS
eas build --platform ios --profile production

# Or build for Android
eas build --platform android --profile production
```

### Step 6: Test (5 minutes)

1. Install app on device
2. Test booking flow
3. Test payment
4. Test calendar
5. Verify all API calls work

---

## 🔧 ALTERNATIVE: Firebase Functions

If you prefer Firebase:

```bash
cd autoposter-backend/firebase
firebase deploy --only functions
```

Then update frontend with Firebase Functions URL.

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Backend health check works: `https://your-backend-url.com/api/health`
- [ ] Calendar endpoint works: `https://your-backend-url.com/api/calendar/health`
- [ ] Booking endpoints work
- [ ] Frontend connects to backend
- [ ] No localhost/172.20.10.3 references in code
- [ ] App works without laptop running

---

## 💰 COST ESTIMATE

### Google Cloud Run:
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.40 per million requests
- **Memory**: 512MB included
- **Estimated cost**: **$0-20/month** for typical usage

### Firebase Functions:
- **Free tier**: 2 million invocations/month
- **After free tier**: ~$0.40 per million
- **Estimated cost**: **$0-20/month**

---

## 🎯 QUICK START (Copy-Paste)

```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Set project
gcloud config set project YOUR_PROJECT_ID

# 3. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 4. Deploy backend
cd autoposter-backend
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080

# 5. Get URL (save this!)
# Output will show: Service URL: https://m1a-backend-xxxxx-uc.a.run.app

# 6. Update frontend .env
echo "EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app" > .env

# 7. Rebuild app
eas build --platform ios --profile production
```

---

## 🚨 IMPORTANT NOTES

1. **Environment Variables**: Set all required env vars in Cloud Run:
   - `GOOGLE_BUSINESS_CALENDAR_ID`
   - `GOOGLE_SERVICE_ACCOUNT_FILE` (or use Secret Manager)
   - `STRIPE_SECRET_KEY`
   - `FIREBASE_ADMIN_SDK_KEY` (or use Secret Manager)

2. **Service Account**: Upload service account JSON to Cloud Run Secret Manager

3. **CORS**: Cloud Run automatically handles CORS, but verify in backend code

4. **Cold Starts**: First request may be slow (~2-5 seconds), subsequent requests are fast

---

## ✅ AFTER DEPLOYMENT

Once deployed:
- ✅ App works 24/7 without laptop
- ✅ Auto-scales with traffic
- ✅ Production-ready
- ✅ Can submit to App Store

**Total Time**: ~30-60 minutes  
**Cost**: $0-20/month  
**Result**: Fully operational cloud-based app! 🎉

