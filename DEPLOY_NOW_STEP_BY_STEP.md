# 🚀 Deploy to Google Cloud Run - Step by Step

## Step 1: Install Google Cloud SDK

### Windows Installation:

1. **Download Google Cloud SDK:**
   - Visit: https://cloud.google.com/sdk/docs/install
   - Or run this PowerShell command:
   ```powershell
   (New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
   Start-Process "$env:Temp\GoogleCloudSDKInstaller.exe"
   ```

2. **Follow the installer:**
   - Accept terms
   - Choose installation location
   - Install

3. **Restart PowerShell** after installation

4. **Verify installation:**
   ```powershell
   gcloud --version
   ```

---

## Step 2: Authenticate & Set Up Project

```powershell
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create m1a-backend --name="M1A Backend"

# Set the project
gcloud config set project m1a-backend

# Enable billing (required for Cloud Run)
# Visit: https://console.cloud.google.com/billing
```

---

## Step 3: Enable Required APIs

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

## Step 4: Prepare Environment Variables

Before deploying, we need to set up environment variables. Create a file with your secrets:

**Required Environment Variables:**
- `GOOGLE_BUSINESS_CALENDAR_ID` - Your calendar ID
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account JSON (or use Secret Manager)

---

## Step 5: Deploy Backend

```powershell
cd autoposter-backend

# Deploy to Cloud Run
gcloud run deploy m1a-backend `
  --source . `
  --region us-central1 `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --memory 512Mi `
  --timeout 300 `
  --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=your-calendar-id@group.calendar.google.com"
```

**Note:** Replace `your-calendar-id@group.calendar.google.com` with your actual calendar ID.

---

## Step 6: Get Deployment URL

After deployment, you'll see:
```
Service URL: https://m1a-backend-xxxxx-uc.a.run.app
```

**Save this URL!** You'll need it for the frontend.

---

## Step 7: Update Frontend

1. **Update `.env` file:**
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app
   ```

2. **Rebuild app:**
   ```powershell
   eas build --platform ios --profile production
   ```

---

## 🚨 Important: Service Account Setup

For Google Calendar to work, you need to upload your service account JSON:

1. **Upload to Secret Manager:**
   ```powershell
   gcloud secrets create google-service-account --data-file=./firebase-admin.json
   ```

2. **Grant access:**
   ```powershell
   gcloud secrets add-iam-policy-binding google-service-account --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
   ```

3. **Update deployment to use secret:**
   ```powershell
   gcloud run services update m1a-backend `
     --update-secrets="GOOGLE_APPLICATION_CREDENTIALS=google-service-account:latest"
   ```

---

## ✅ Verification

After deployment, test:

```powershell
# Health check
Invoke-RestMethod -Uri "https://your-backend-url/api/health" -Method Get

# Calendar health
Invoke-RestMethod -Uri "https://your-backend-url/api/calendar/health" -Method Get
```

---

## 🎯 Quick Commands (Copy-Paste)

```powershell
# 1. Install Google Cloud SDK (if not installed)
# Download from: https://cloud.google.com/sdk/docs/install

# 2. Login
gcloud auth login

# 3. Create/Set project
gcloud projects create m1a-backend --name="M1A Backend"
gcloud config set project m1a-backend

# 4. Enable APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# 5. Deploy
cd autoposter-backend
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi

# 6. Get URL (from output)
# Service URL: https://m1a-backend-xxxxx-uc.a.run.app
```


