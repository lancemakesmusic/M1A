# 🚀 Deployment Commands - Run in Your Command Prompt

**Important:** Run these commands in the **Command Prompt window** where you completed `gcloud init` (where gcloud is available).

---

## Step 1: Enable APIs

```cmd
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

## Step 2: Navigate to Backend Directory

```cmd
cd C:\Users\admin\M1A\autoposter-backend
```

---

## Step 3: Deploy to Cloud Run

```cmd
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi --timeout 300 --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com"
```

**This will:**
- Build Docker image (5-10 minutes)
- Push to Google Container Registry
- Deploy to Cloud Run
- Provide service URL

---

## Step 4: After Deployment

The output will show:
```
Service URL: https://m1a-backend-xxxxx-uc.a.run.app
```

**Save this URL!** You'll need it for the frontend.

---

## Step 5: Test Deployment

```cmd
curl https://m1a-backend-xxxxx-uc.a.run.app/api/health
```

Or in PowerShell:
```powershell
Invoke-RestMethod -Uri "https://m1a-backend-xxxxx-uc.a.run.app/api/health" -Method Get
```

---

## Step 6: Update Frontend

1. Update `.env` file in project root:
   ```env
   EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx-uc.a.run.app
   ```

2. Rebuild app:
   ```cmd
   eas build --platform ios --profile production
   ```

---

## 🎯 Quick Copy-Paste (All Steps)

```cmd
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com
cd C:\Users\admin\M1A\autoposter-backend
gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi --timeout 300 --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com"
```

---

**Note:** The deployment will take 5-10 minutes. You'll see build progress in the terminal.




