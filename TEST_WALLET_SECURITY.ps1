# PowerShell Script to Test Wallet Security Implementation
# Run this script to verify all security features are working

Write-Host "🧪 Testing Wallet Security Implementation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Backend is Running
Write-Host "Test 1: Checking Backend Status..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/payments/health" -Method GET -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend returned status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend is not running or not accessible" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Start backend with: python autoposter-backend/start_backend.py" -ForegroundColor Yellow
}
Write-Host ""

# Test 2: Check Webhook Endpoint Exists
Write-Host "Test 2: Checking Webhook Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/payments/webhook" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"; "stripe-signature"="test"} `
        -Body '{"test":"data"}' `
        -TimeoutSec 5 `
        -ErrorAction Stop
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✅ Webhook endpoint exists and verifies signatures (400 = invalid signature, which is correct)" -ForegroundColor Green
    } elseif ($statusCode -eq 404) {
        Write-Host "⚠️  Webhook endpoint returned 404 - Backend needs restart to register endpoint" -ForegroundColor Yellow
        Write-Host "   ACTION: Restart backend with: python autoposter-backend/start_backend.py" -ForegroundColor Yellow
        Write-Host "   See FIX_WEBHOOK_ENDPOINT.md for details" -ForegroundColor Cyan
    } elseif ($statusCode -eq 500) {
        Write-Host "⚠️  Webhook endpoint exists but returned 500 error - Check backend logs" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  Webhook endpoint responded with: $statusCode" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: Check Environment Variables
Write-Host "Test 3: Checking Environment Variables..." -ForegroundColor Yellow
$envVars = @(
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET"
)

$allSet = $true
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "✅ $var is set" -ForegroundColor Green
    } else {
        Write-Host "❌ $var is NOT set" -ForegroundColor Red
        $allSet = $false
    }
}

if (-not $allSet) {
    Write-Host ""
    Write-Host "⚠️  Some environment variables are missing" -ForegroundColor Yellow
    Write-Host "   Add them to autoposter-backend/.env file" -ForegroundColor Yellow
}
Write-Host ""

# Test 4: Check Firestore Rules
Write-Host "Test 4: Checking Firestore Rules..." -ForegroundColor Yellow
if (Test-Path "firestore.rules") {
    $rules = Get-Content "firestore.rules" -Raw
    if ($rules -match "lastTransactionId") {
        Write-Host "✅ Firestore rules include wallet security (transaction ID required)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Firestore rules may need updating" -ForegroundColor Yellow
    }
    
    if ($rules -match "walletTransactions.*allow update") {
        Write-Host "✅ Firestore rules include transaction security" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Transaction rules may need updating" -ForegroundColor Yellow
    }
    
    if ($rules -match "allow delete.*false") {
        Write-Host "✅ Firestore rules prevent deletion (security)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Deletion prevention may need updating" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ firestore.rules file not found" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check Webhook Handler Code
Write-Host "Test 5: Checking Webhook Handler Implementation..." -ForegroundColor Yellow
if (Test-Path "autoposter-backend/api/payments.py") {
    $paymentsCode = Get-Content "autoposter-backend/api/payments.py" -Raw
    if ($paymentsCode -match "@router.post.*webhook") {
        Write-Host "✅ Webhook endpoint defined" -ForegroundColor Green
    } else {
        Write-Host "❌ Webhook endpoint not found in payments.py" -ForegroundColor Red
    }
    
    if ($paymentsCode -match "stripe.Webhook.construct_event") {
        Write-Host "✅ Webhook signature verification implemented" -ForegroundColor Green
    } else {
        Write-Host "❌ Webhook signature verification not found" -ForegroundColor Red
    }
    
    if ($paymentsCode -match "handle_payment_succeeded") {
        Write-Host "✅ Payment success handler implemented" -ForegroundColor Green
    } else {
        Write-Host "❌ Payment success handler not found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ payments.py file not found" -ForegroundColor Red
}
Write-Host ""

# Test 6: Check WalletService Updates
Write-Host "Test 6: Checking WalletService Security..." -ForegroundColor Yellow
if (Test-Path "services/WalletService.js") {
    $walletCode = Get-Content "services/WalletService.js" -Raw
    if ($walletCode -match "runTransaction") {
        Write-Host "✅ Atomic transactions implemented" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Atomic transactions may not be fully implemented" -ForegroundColor Yellow
    }
    
    if ($walletCode -match "paymentStatus.*pending") {
        Write-Host "✅ Payment status handling implemented" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Payment status handling may need updates" -ForegroundColor Yellow
    }
    
    if ($walletCode -match "cashOut") {
        Write-Host "✅ Cash out functionality implemented" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Cash out functionality not found" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ WalletService.js not found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. ⚠️  RESTART BACKEND: Webhook endpoint needs restart to register" -ForegroundColor Yellow
Write-Host "   Run: python autoposter-backend/start_backend.py" -ForegroundColor White
Write-Host "   See: FIX_WEBHOOK_ENDPOINT.md for details" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Set STRIPE_WEBHOOK_SECRET in autoposter-backend/.env" -ForegroundColor White
Write-Host "   Get from: Stripe Dashboard > Webhooks > Signing secret" -ForegroundColor White
Write-Host ""
Write-Host "3. Test with Stripe CLI: stripe listen --forward-to localhost:8001/api/payments/webhook" -ForegroundColor White
Write-Host "4. Test in app: Add funds, send money, cash out" -ForegroundColor White
Write-Host "5. Check Firestore: Verify balances and transactions" -ForegroundColor White
Write-Host ""
Write-Host "See WALLET_SECURITY_TESTING_GUIDE.md for detailed testing instructions" -ForegroundColor Cyan
Write-Host ""

