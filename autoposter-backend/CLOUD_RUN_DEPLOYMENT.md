# Deploy M1A Backend to Google Cloud Run

This guide will help you deploy your M1A backend to Google Cloud Run so it runs 24/7 without needing your laptop.

## Prerequisites

1. **Google Cloud Account** (Free tier available)
   - Sign up at: https://cloud.google.com/
   - Get $300 free credit for 90 days

2. **Google Cloud SDK** (gcloud CLI)
   - **Windows**: `winget install Google.CloudSDK` or download from https://cloud.google.com/sdk/docs/install
   - **Mac**: `brew install google-cloud-sdk`
   - **Linux**: Follow instructions at https://cloud.google.com/sdk/docs/install

3. **Docker** (optional, Cloud Build handles this)
   - Only needed if you want to test locally first

## Quick Start (5 Minutes)

### Step 1: Login and Setup

```powershell
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create m1a-backend --name="M1A Backend"

# Set as active project
gcloud config set project m1a-backend

# Note your Project ID (you'll need this)
gcloud config get-value project
```

### Step 2: Enable Required APIs

```powershell
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### Step 3: Deploy

**Windows (PowerShell):**
```powershell
cd autoposter-backend
$env:GCP_PROJECT_ID = "m1a-backend"  # Your project ID
.\deploy-cloud-run.ps1
```

**Mac/Linux:**
```bash
cd autoposter-backend
export GCP_PROJECT_ID="m1a-backend"  # Your project ID
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

### Step 4: Set Environment Variables

After deployment, set your API keys:

```powershell
# Get your service name and region from deployment output
$SERVICE_NAME = "m1a-backend"
$REGION = "us-central1"

# Set environment variables
gcloud run services update $SERVICE_NAME --region $REGION `
    --set-env-vars "STRIPE_SECRET_KEY=sk_live_...,STRIPE_WEBHOOK_SECRET=whsec_...,OPENAI_API_KEY=sk-..."
```

### Step 5: Update Your App

Update your app's `.env` file with the Cloud Run URL:

```env
EXPO_PUBLIC_API_BASE_URL=https://m1a-backend-xxxxx.run.app
```

### Step 6: Update Stripe Webhooks

In Stripe Dashboard:
1. Go to Developers > Webhooks
2. Edit your webhook endpoint
3. Update URL to: `https://m1a-backend-xxxxx.run.app/api/payments/webhook`

## Manual Deployment (Step by Step)

If you prefer to deploy manually:

### 1. Build Docker Image

```powershell
# Set your project ID
$PROJECT_ID = "m1a-backend"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/m1a-backend"

# Build and push to Google Container Registry
gcloud builds submit --tag $IMAGE_NAME
```

### 2. Deploy to Cloud Run

```powershell
gcloud run deploy m1a-backend `
    --image $IMAGE_NAME `
    --platform managed `
    --region us-central1 `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 1 `
    --timeout 300 `
    --max-instances 10 `
    --port 8080
```

### 3. Set Environment Variables

```powershell
# Read from your .env file
$stripeKey = (Get-Content .env | Select-String "STRIPE_SECRET_KEY").ToString().Split("=")[1]
$openaiKey = (Get-Content .env | Select-String "OPENAI_API_KEY").ToString().Split("=")[1]

# Set on Cloud Run
gcloud run services update m1a-backend --region us-central1 `
    --set-env-vars "STRIPE_SECRET_KEY=$stripeKey,OPENAI_API_KEY=$openaiKey"
```

## Using Secrets (Recommended for Production)

For better security, use Google Secret Manager:

### 1. Create Secrets

```powershell
# Create secrets
echo -n "sk_live_..." | gcloud secrets create STRIPE_SECRET_KEY --data-file=-
echo -n "whsec_..." | gcloud secrets create STRIPE_WEBHOOK_SECRET --data-file=-
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding STRIPE_SECRET_KEY \
    --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### 2. Deploy with Secrets

```powershell
gcloud run deploy m1a-backend `
    --image gcr.io/$PROJECT_ID/m1a-backend `
    --platform managed `
    --region us-central1 `
    --set-secrets "STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest"
```

## Testing Your Deployment

### 1. Health Check

```powershell
$SERVICE_URL = "https://m1a-backend-xxxxx.run.app"
Invoke-WebRequest -Uri "$SERVICE_URL/api/health"
```

### 2. API Documentation

Open in browser: `https://m1a-backend-xxxxx.run.app/docs`

### 3. Test Payment Endpoint

```powershell
Invoke-WebRequest -Uri "$SERVICE_URL/api/payments/health"
```

## Cost Estimation

### Free Tier (Always Free)
- **2 million requests/month**
- **360,000 GB-seconds compute time**
- **180,000 vCPU-seconds**

### Typical Usage (Small App)
- **~10,000 requests/day** = 300K/month = **FREE**
- **~1GB memory, 0.5 CPU** = **FREE** (within limits)

### If You Exceed Free Tier
- **$0.40 per million requests** (after 2M)
- **$0.0000025 per GB-second** (after free tier)
- **$0.0000100 per vCPU-second** (after free tier)

**Estimated cost for small-medium app: $0-20/month**

## Monitoring

### View Logs

```powershell
gcloud run services logs read m1a-backend --region us-central1
```

### View Metrics

```powershell
# Open Cloud Console
gcloud run services describe m1a-backend --region us-central1
```

Or visit: https://console.cloud.google.com/run

## Updating Your Deployment

### Update Code

```powershell
# Make your changes, then redeploy
cd autoposter-backend
.\deploy-cloud-run.ps1
```

### Update Environment Variables

```powershell
gcloud run services update m1a-backend --region us-central1 `
    --update-env-vars "NEW_VAR=value"
```

### Rollback

```powershell
# List revisions
gcloud run revisions list --service m1a-backend --region us-central1

# Rollback to previous revision
gcloud run services update-traffic m1a-backend --region us-central1 --to-revisions PREVIOUS_REVISION=100
```

## Troubleshooting

### Build Fails

```powershell
# Check build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### Service Won't Start

```powershell
# Check service logs
gcloud run services logs read m1a-backend --region us-central1 --limit=50
```

### Environment Variables Not Working

```powershell
# Verify env vars are set
gcloud run services describe m1a-backend --region us-central1 --format="value(spec.template.spec.containers[0].env)"
```

### Port Issues

Cloud Run automatically sets the `PORT` environment variable. The Dockerfile is configured to use it. If you see port errors, check that your code reads `os.getenv('PORT', '8080')`.

## Security Best Practices

1. **Use Secrets Manager** for sensitive keys (not env vars)
2. **Enable authentication** if you don't need public access:
   ```powershell
   gcloud run services update m1a-backend --region us-central1 --no-allow-unauthenticated
   ```
3. **Set up IAM** to control who can deploy
4. **Enable VPC** if you need private networking
5. **Use HTTPS** (automatic with Cloud Run)

## Next Steps

1. ✅ Deploy backend to Cloud Run
2. ✅ Update app's `EXPO_PUBLIC_API_BASE_URL`
3. ✅ Update Stripe webhook URL
4. ✅ Test all features
5. ✅ Monitor costs and usage
6. 🎉 Your app now runs 24/7 without your laptop!

## Support

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Pricing Calculator**: https://cloud.google.com/products/calculator
- **Status Page**: https://status.cloud.google.com/

