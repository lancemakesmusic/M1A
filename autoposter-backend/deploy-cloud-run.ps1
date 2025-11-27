# Deploy M1A Backend to Google Cloud Run (PowerShell)
# This script automates the deployment process

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying M1A Backend to Google Cloud Run" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "your-project-id" }
$SERVICE_NAME = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { "m1a-backend" }
$REGION = if ($env:REGION) { $env:REGION } else { "us-central1" }
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Check if gcloud is installed
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host "Install it from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "Or use: winget install Google.CloudSDK" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
$activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
if (-not $activeAccount) {
    Write-Host "⚠️  Not logged in to Google Cloud. Logging in..." -ForegroundColor Yellow
    gcloud auth login
}

# Set project
Write-Host "📋 Setting project to: $PROJECT_ID" -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Enable required APIs
Write-Host "🔧 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
Write-Host "🏗️  Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag $IMAGE_NAME

Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
try {
    # Try with secrets first (if they exist)
    gcloud run deploy $SERVICE_NAME `
        --image $IMAGE_NAME `
        --platform managed `
        --region $REGION `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 1 `
        --timeout 300 `
        --max-instances 10 `
        --min-instances 0 `
        --port 8080 `
        --set-env-vars "PYTHONUNBUFFERED=1" `
        --set-secrets "STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" `
        2>$null
} catch {
    # Fallback to env vars if secrets don't exist
    Write-Host "⚠️  Secrets not found, using environment variables instead..." -ForegroundColor Yellow
    gcloud run deploy $SERVICE_NAME `
        --image $IMAGE_NAME `
        --platform managed `
        --region $REGION `
        --allow-unauthenticated `
        --memory 1Gi `
        --cpu 1 `
        --timeout 300 `
        --max-instances 10 `
        --min-instances 0 `
        --port 8080 `
        --set-env-vars "PYTHONUNBUFFERED=1"
}

# Get the service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🌐 Service URL: $SERVICE_URL" -ForegroundColor Green
Write-Host "📖 API Docs: $SERVICE_URL/docs" -ForegroundColor Cyan
Write-Host "💚 Health Check: $SERVICE_URL/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "1. Set environment variables:" -ForegroundColor White
Write-Host "   gcloud run services update $SERVICE_NAME --region $REGION \`" -ForegroundColor Gray
Write-Host "     --set-env-vars STRIPE_SECRET_KEY=sk_...,OPENAI_API_KEY=sk_..." -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update your app's .env file:" -ForegroundColor White
Write-Host "   EXPO_PUBLIC_API_BASE_URL=$SERVICE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Update Stripe webhook URL:" -ForegroundColor White
Write-Host "   $SERVICE_URL/api/payments/webhook" -ForegroundColor Gray

