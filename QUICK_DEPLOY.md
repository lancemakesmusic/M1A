# ⚡ Quick Deploy to Google Cloud Run

## 🚀 Fast Track (5 Steps)

### Step 1: Install Google Cloud SDK
```powershell
# Installer is already downloaded
Start-Process "$env:TEMP\GoogleCloudSDKInstaller.exe"

# After installation, RESTART PowerShell
```

### Step 2: Authenticate
```powershell
gcloud auth login
gcloud config set project m1a-backend
# (Create project if needed: gcloud projects create m1a-backend)
```

### Step 3: Enable APIs
```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

### Step 4: Deploy
```powershell
cd autoposter-backend
.\deploy-cloud-run.ps1
```

### Step 5: Update Frontend
```powershell
# Get the URL from deployment output, then:
# Update .env file:
echo "EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app" >> .env
```

---

## 📋 What You'll Need

Before deploying, have ready:
- ✅ Google Calendar ID: `c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com`
- ✅ Stripe Secret Key: `sk_live_...` (from Stripe dashboard)
- ✅ Stripe Webhook Secret: `whsec_...` (from Stripe webhooks)

---

## ✅ After Deployment

1. **Test the backend:**
   ```powershell
   $url = "https://m1a-backend-xxxxx-uc.a.run.app"
   Invoke-RestMethod -Uri "$url/api/health"
   Invoke-RestMethod -Uri "$url/api/calendar/health"
   ```

2. **Update frontend `.env`:**
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app
   ```

3. **Rebuild app:**
   ```powershell
   eas build --platform ios --profile production
   ```

---

**Total Time:** ~15-20 minutes  
**Cost:** $0-20/month (free tier available)


