# PowerShell Script to Create Stripe Products
# Run this to set up all products in Stripe

param(
    [string]$StripeSecretKey = $env:STRIPE_SECRET_KEY,
    [switch]$DryRun = $false
)

# Check if Stripe key is provided
if (-not $StripeSecretKey) {
    Write-Host "`n❌ STRIPE_SECRET_KEY not found!" -ForegroundColor Red
    Write-Host "`nSet it in environment or pass as parameter:" -ForegroundColor Yellow
    Write-Host "  `$env:STRIPE_SECRET_KEY = 'sk_test_...'" -ForegroundColor Gray
    Write-Host "  .\CREATE_STRIPE_PRODUCTS.ps1" -ForegroundColor Gray
    Write-Host "`nOr pass directly:" -ForegroundColor Yellow
    Write-Host "  .\CREATE_STRIPE_PRODUCTS.ps1 -StripeSecretKey 'sk_test_...'" -ForegroundColor Gray
    exit 1
}

# Products to create (based on your Stripe dashboard)
$products = @(
    @{
        Name = "10 hour Recording Block"
        Description = "10 hour recording session block"
        Price = 200.00
        Currency = "usd"
        TaxCategory = "Digital Products"  # Update this to correct category
    },
    @{
        Name = "VIP Duo Pass"
        Description = "VIP pass for two people"
        Price = 75.00
        Currency = "usd"
        TaxCategory = "Entertainment Services"  # Update this to correct category
    },
    @{
        Name = "VIP Single Pass NYE"
        Description = "VIP single pass for New Year's Eve"
        Price = 50.00
        Currency = "usd"
        TaxCategory = "Entertainment Services"  # Update this to correct category
    },
    @{
        Name = "Recording Hours"
        Description = "Recording studio hours"
        Price = 50.00
        Currency = "usd"
        TaxCategory = "Digital Products"  # Update this to correct category
    }
)

Write-Host "`n🚀 Creating Stripe Products..." -ForegroundColor Cyan
Write-Host "`nProducts to create: $($products.Count)" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n⚠️ DRY RUN MODE - No products will be created" -ForegroundColor Yellow
}

$createdProducts = @()
$errors = @()

foreach ($product in $products) {
    Write-Host "`n📦 Creating: $($product.Name)" -ForegroundColor Cyan
    Write-Host "   Price: `$$($product.Price) $($product.Currency)" -ForegroundColor Gray
    Write-Host "   Tax Category: $($product.TaxCategory)" -ForegroundColor Gray
    
    if ($DryRun) {
        Write-Host "   [DRY RUN] Would create product..." -ForegroundColor Yellow
        continue
    }
    
    try {
        # Create product
        $productBody = @{
            name = $product.Name
            description = $product.Description
            metadata = @{
                tax_category = $product.TaxCategory
                app_synced = "true"
                created_via = "powershell_script"
            }
        } | ConvertTo-Json -Depth 10
        
        $productResponse = Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $StripeSecretKey"
                "Content-Type" = "application/x-www-form-urlencoded"
            } `
            -Body $productBody
        
        $productId = $productResponse.id
        Write-Host "   ✅ Product created: $productId" -ForegroundColor Green
        
        # Create price for product
        $priceBody = @{
            product = $productId
            unit_amount = [math]::Round($product.Price * 100)  # Convert to cents
            currency = $product.Currency
        } | ConvertTo-Json -Depth 10
        
        $priceResponse = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" `
            -Method Post `
            -Headers @{
                "Authorization" = "Bearer $StripeSecretKey"
                "Content-Type" = "application/x-www-form-urlencoded"
            } `
            -Body $priceBody
        
        $priceId = $priceResponse.id
        Write-Host "   ✅ Price created: $priceId" -ForegroundColor Green
        
        $createdProducts += @{
            ProductId = $productId
            PriceId = $priceId
            Name = $product.Name
            Price = $product.Price
        }
        
        Start-Sleep -Milliseconds 500  # Rate limiting
        
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "   ❌ Error: $errorMsg" -ForegroundColor Red
        
        # Try to parse error response
        try {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorResponse.error) {
                Write-Host "   Details: $($errorResponse.error.message)" -ForegroundColor Red
            }
        } catch {
            # Ignore JSON parse errors
        }
        
        $errors += @{
            Product = $product.Name
            Error = $errorMsg
        }
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Write-Host "`n✅ Successfully Created: $($createdProducts.Count)" -ForegroundColor Green
foreach ($created in $createdProducts) {
    Write-Host "   • $($created.Name)" -ForegroundColor White
    Write-Host "     Product ID: $($created.ProductId)" -ForegroundColor Gray
    Write-Host "     Price ID: $($created.PriceId)" -ForegroundColor Gray
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ Errors: $($errors.Count)" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $($error.Product): $($error.Error)" -ForegroundColor Red
    }
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Verify products in Stripe Dashboard" -ForegroundColor White
Write-Host "   2. Update tax categories if needed" -ForegroundColor White
Write-Host "   3. Sync products: POST /api/stripe/sync-products" -ForegroundColor White
Write-Host "   4. Test checkout flow" -ForegroundColor White

if ($createdProducts.Count -gt 0) {
    Write-Host "`n💡 To sync these products to Firestore, call:" -ForegroundColor Cyan
    Write-Host "   POST http://localhost:8001/api/stripe/sync-products" -ForegroundColor White
}




