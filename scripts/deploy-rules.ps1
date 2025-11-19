# Quick Firebase Rules Deployment
Write-Host "🔥 Deploying Firebase Rules...`n" -ForegroundColor Cyan

# Step 1: Login if needed
Write-Host "Step 1: Checking authentication..." -ForegroundColor Yellow
firebase login --no-localhost

# Step 2: Use project
Write-Host "`nStep 2: Setting project to m1alive..." -ForegroundColor Yellow
firebase use m1alive --add

# Step 3: Deploy Storage Rules
Write-Host "`nStep 3: Deploying Storage Rules..." -ForegroundColor Yellow
firebase deploy --only storage

# Step 4: Deploy Firestore Rules  
Write-Host "`nStep 4: Deploying Firestore Rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

Write-Host "`n✅ Rules deployed! Check Firebase Console to verify." -ForegroundColor Green

