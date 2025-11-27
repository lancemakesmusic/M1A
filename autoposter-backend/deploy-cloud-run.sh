#!/bin/bash
# Deploy M1A Backend to Google Cloud Run
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Deploying M1A Backend to Google Cloud Run"
echo "=============================================="

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
SERVICE_NAME="${SERVICE_NAME:-m1a-backend}"
REGION="${REGION:-us-central1}"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK not found!"
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "⚠️  Not logged in to Google Cloud. Logging in..."
    gcloud auth login
fi

# Set project
echo "📋 Setting project to: ${PROJECT_ID}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
echo "🏗️  Building Docker image..."
gcloud builds submit --tag ${IMAGE_NAME}

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --set-env-vars "PYTHONUNBUFFERED=1" \
    --set-secrets "STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest" 2>/dev/null || \
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --set-env-vars "PYTHONUNBUFFERED=1"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Deployment complete!"
echo "=============================================="
echo "🌐 Service URL: ${SERVICE_URL}"
echo "📖 API Docs: ${SERVICE_URL}/docs"
echo "💚 Health Check: ${SERVICE_URL}/api/health"
echo ""
echo "📝 Next steps:"
echo "1. Set environment variables:"
echo "   gcloud run services update ${SERVICE_NAME} --region ${REGION} \\"
echo "     --set-env-vars STRIPE_SECRET_KEY=sk_...,OPENAI_API_KEY=sk_..."
echo ""
echo "2. Update your app's .env file:"
echo "   EXPO_PUBLIC_API_BASE_URL=${SERVICE_URL}"
echo ""
echo "3. Update Stripe webhook URL:"
echo "   ${SERVICE_URL}/api/payments/webhook"

