# Deploy M1A Backend to Google Cloud Run
# Run this script from the autoposter-backend directory

Write-Host "`n🚀 Deploying M1A Backend to Google Cloud Run`n" -ForegroundColor Cyan

# Check if gcloud is installed
try {
    $gcloudVersion = gcloud --version 2>&1
    Write-Host "✅ Google Cloud SDK found" -ForegroundColor Green
} catch {
    Write-Host "❌ Google Cloud SDK not found!" -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK first:" -ForegroundColor Yellow
    Write-Host "  https://cloud.google.com/sdk/docs/install`n" -ForegroundColor White
    exit 1
}

# Check if authenticated
Write-Host "`nChecking authentication..." -ForegroundColor Yellow
$authStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1
if (-not $authStatus) {
    Write-Host "⚠️ Not authenticated. Please run: gcloud auth login" -ForegroundColor Yellow
    Write-Host "Opening browser for authentication..." -ForegroundColor White
    gcloud auth login
}

# Get project ID
$projectId = gcloud config get-value project 2>&1
if (-not $projectId -or $projectId -match "ERROR") {
    Write-Host "⚠️ No project set. Please set a project:" -ForegroundColor Yellow
    Write-Host "  gcloud config set project YOUR_PROJECT_ID`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ Using project: $projectId`n" -ForegroundColor Green

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable secretmanager.googleapis.com --quiet
Write-Host "✅ APIs enabled`n" -ForegroundColor Green

# Get environment variables
Write-Host "Environment Variables:" -ForegroundColor Yellow
$calendarId = Read-Host "Enter GOOGLE_BUSINESS_CALENDAR_ID (or press Enter to skip)"
$stripeKey = Read-Host "Enter STRIPE_SECRET_KEY (or press Enter to skip)"
$stripeWebhook = Read-Host "Enter STRIPE_WEBHOOK_SECRET (or press Enter to skip)"

# Build env vars string
$envVars = @()
if ($calendarId) {
    $envVars += "GOOGLE_BUSINESS_CALENDAR_ID=$calendarId"
}
if ($stripeKey) {
    $envVars += "STRIPE_SECRET_KEY=$stripeKey"
}
if ($stripeWebhook) {
    $envVars += "STRIPE_WEBHOOK_SECRET=$stripeWebhook"
}

$envVarsString = $envVars -join ","

# Deploy to Cloud Run
Write-Host "`n🚀 Deploying to Cloud Run...`n" -ForegroundColor Cyan

$deployCommand = "gcloud run deploy m1a-backend --source . --region us-central1 --platform managed --allow-unauthenticated --port 8080 --memory 512Mi --timeout 300"

if ($envVarsString) {
    $deployCommand += " --set-env-vars `"$envVarsString`""
}

Write-Host "Running: $deployCommand`n" -ForegroundColor Gray
Invoke-Expression $deployCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!`n" -ForegroundColor Green
    
    # Get service URL
    $serviceUrl = gcloud run services describe m1a-backend --region us-central1 --format="value(status.url)" 2>&1
    
    if ($serviceUrl) {
        Write-Host "🌐 Service URL: $serviceUrl`n" -ForegroundColor Cyan
        Write-Host "📋 Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Update frontend .env:" -ForegroundColor White
        Write-Host "     EXPO_PUBLIC_API_BASE_URL=$serviceUrl" -ForegroundColor Gray
        Write-Host "  2. Test health endpoint:" -ForegroundColor White
        Write-Host "     Invoke-RestMethod -Uri '$serviceUrl/api/health' -Method Get" -ForegroundColor Gray
        Write-Host "  3. Rebuild app:" -ForegroundColor White
        Write-Host "     eas build --platform ios --profile production`n" -ForegroundColor Gray
    }
} else {
    Write-Host "`n❌ Deployment failed. Check errors above.`n" -ForegroundColor Red
    exit 1
}
