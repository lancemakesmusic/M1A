# 🚀 Next Steps After Deployment

## ✅ What's Done

- ✅ Backend deployed to Google Cloud Run
- ✅ Service is running and healthy
- ✅ Frontend `.env` file updated
- ✅ API endpoints tested

---

## 📱 Rebuild Frontend App

The frontend needs to be rebuilt to use the new Cloud Run API URL.

### For iOS:

```bash
eas build --platform ios --profile production
```

### For Android:

```bash
eas build --platform android --profile production
```

### For Both:

```bash
eas build --platform all --profile production
```

**Note:** The build process will:
- Use the updated `EXPO_PUBLIC_API_BASE_URL` from `.env`
- Create a new app binary with the Cloud Run backend URL
- Take 10-20 minutes depending on platform

---

## 🧪 Test API Endpoints

### Health Check

```bash
curl https://m1a-backend-83002254287.us-central1.run.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "API is running"
}
```

### Root Endpoint

```bash
curl https://m1a-backend-83002254287.us-central1.run.app/
```

Expected response:
```json
{
  "message": "M1Autoposter API",
  "version": "1.0.0"
}
```

### Test from PowerShell

```powershell
# Health check
Invoke-RestMethod -Uri "https://m1a-backend-83002254287.us-central1.run.app/api/health" -Method Get

# Root endpoint
Invoke-RestMethod -Uri "https://m1a-backend-83002254287.us-central1.run.app/" -Method Get
```

---

## 🔧 Add Environment Variables (Optional)

If you need to add more environment variables to Cloud Run:

### Single Variable

```bash
gcloud run services update m1a-backend \
  --region us-central1 \
  --update-env-vars "KEY=VALUE"
```

### Multiple Variables

```bash
gcloud run services update m1a-backend \
  --region us-central1 \
  --update-env-vars "KEY1=VALUE1,KEY2=VALUE2,KEY3=VALUE3"
```

### Common Variables to Add

**Stripe Keys:**
```bash
gcloud run services update m1a-backend \
  --region us-central1 \
  --update-env-vars "STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_..."
```

**Firebase Admin SDK:**
```bash
# First, create a secret
gcloud secrets create firebase-service-account --data-file=firebase-service-account.json

# Then attach it
gcloud run services update m1a-backend \
  --region us-central1 \
  --update-secrets GOOGLE_APPLICATION_CREDENTIALS=firebase-service-account:latest
```

**CORS Origins (for production):**
```bash
gcloud run services update m1a-backend \
  --region us-central1 \
  --update-env-vars "CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
```

---

## 📊 Monitor Your Backend

### View Logs via CLI

```bash
# Last 50 log entries
gcloud run services logs read m1a-backend --region us-central1 --limit 50

# Follow logs in real-time
gcloud run services logs tail m1a-backend --region us-central1

# Filter logs
gcloud run services logs read m1a-backend --region us-central1 --filter "severity>=ERROR"
```

### View in Console

- **Service Overview:** https://console.cloud.google.com/run/detail/us-central1/m1a-backend
- **Logs:** https://console.cloud.google.com/run/detail/us-central1/m1a-backend/logs
- **Metrics:** https://console.cloud.google.com/run/detail/us-central1/m1a-backend/metrics
- **Revisions:** https://console.cloud.google.com/run/detail/us-central1/m1a-backend/revisions

---

## 🔄 Update Deployment

If you need to update the backend code:

```bash
cd autoposter-backend
gcloud run deploy m1a-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --timeout 300 \
  --set-env-vars "GOOGLE_BUSINESS_CALENDAR_ID=c_b55ae9eeff88509c47f0e3c0e5bd39621524b7d989f012d3cac18f0ed4a35fbb@group.calendar.google.com"
```

---

## 🎯 Verify Everything Works

### 1. Test Backend Health

```bash
curl https://m1a-backend-83002254287.us-central1.run.app/api/health
```

### 2. Test from Frontend

After rebuilding the app:
1. Open the app
2. Try making a booking
3. Check if calendar events are created
4. Verify payments work

### 3. Check Logs

Monitor logs for any errors:
```bash
gcloud run services logs read m1a-backend --region us-central1 --limit 20
```

---

## 🔐 Security Checklist

- [ ] Add CORS restrictions for production
- [ ] Add Firebase Admin SDK credentials (if needed)
- [ ] Add Stripe keys (if needed)
- [ ] Review Cloud Run IAM permissions
- [ ] Set up monitoring alerts
- [ ] Configure custom domain (optional)

---

## 📈 Scaling & Performance

Cloud Run automatically:
- ✅ Scales to zero when not in use (saves money)
- ✅ Scales up based on traffic
- ✅ Handles up to 1000 concurrent requests per instance
- ✅ Provides 2 million free requests per month

### Adjust Resources (if needed)

```bash
# Increase memory
gcloud run services update m1a-backend \
  --region us-central1 \
  --memory 1Gi

# Increase CPU
gcloud run services update m1a-backend \
  --region us-central1 \
  --cpu 2

# Increase timeout
gcloud run services update m1a-backend \
  --region us-central1 \
  --timeout 600
```

---

## 🆘 Troubleshooting

### Service Not Responding

1. Check logs:
   ```bash
   gcloud run services logs read m1a-backend --region us-central1
   ```

2. Check service status:
   ```bash
   gcloud run services describe m1a-backend --region us-central1
   ```

3. Test health endpoint:
   ```bash
   curl https://m1a-backend-83002254287.us-central1.run.app/api/health
   ```

### Frontend Can't Connect

1. Verify `.env` file has correct URL:
   ```
   EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-83002254287.us-central1.run.app
   ```

2. Rebuild the app (environment variables are baked in at build time)

3. Check CORS settings if getting CORS errors

---

## 🎉 You're All Set!

Your backend is now:
- ✅ Running 24/7 in the cloud
- ✅ Auto-scaling based on traffic
- ✅ Accessible from anywhere
- ✅ Production-ready

The app will work even when your laptop is off! 🚀




