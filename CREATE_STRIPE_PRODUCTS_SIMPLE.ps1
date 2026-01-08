# Simple PowerShell Script to Create Stripe Products
# Uses Stripe CLI (if installed) or curl

param(
    [string]$StripeSecretKey = $env:STRIPE_SECRET_KEY
)

if (-not $StripeSecretKey) {
    Write-Host "`n❌ STRIPE_SECRET_KEY required!" -ForegroundColor Red
    Write-Host "`nSet it first:" -ForegroundColor Yellow
    Write-Host "  `$env:STRIPE_SECRET_KEY = 'sk_test_...'" -ForegroundColor Gray
    exit 1
}

Write-Host "`n🚀 Creating Stripe Products..." -ForegroundColor Cyan

# Check if Stripe CLI is installed
$stripeCliAvailable = Get-Command stripe -ErrorAction SilentlyContinue

if ($stripeCliAvailable) {
    Write-Host "`n✅ Using Stripe CLI" -ForegroundColor Green
    
    # Set Stripe key for CLI
    $env:STRIPE_API_KEY = $StripeSecretKey
    
    # Create products using Stripe CLI
    Write-Host "`nCreating: 10 hour Recording Block" -ForegroundColor Cyan
    stripe products create --name "10 hour Recording Block" --description "10 hour recording session block" --metadata tax_category="Digital Products"
    
    Write-Host "`nCreating: VIP Duo Pass" -ForegroundColor Cyan
    stripe products create --name "VIP Duo Pass" --description "VIP pass for two people" --metadata tax_category="Entertainment Services"
    
    Write-Host "`nCreating: VIP Single Pass NYE" -ForegroundColor Cyan
    stripe products create --name "VIP Single Pass NYE" --description "VIP single pass for New Year's Eve" --metadata tax_category="Entertainment Services"
    
    Write-Host "`nCreating: Recording Hours" -ForegroundColor Cyan
    stripe products create --name "Recording Hours" --description "Recording studio hours" --metadata tax_category="Digital Products"
    
    Write-Host "`n✅ Products created! Now create prices:" -ForegroundColor Green
    Write-Host "`nRun these commands to create prices:" -ForegroundColor Yellow
    Write-Host "  stripe prices create --product prod_XXX --unit-amount 20000 --currency usd" -ForegroundColor Gray
    Write-Host "  stripe prices create --product prod_XXX --unit-amount 7500 --currency usd" -ForegroundColor Gray
    Write-Host "  stripe prices create --product prod_XXX --unit-amount 5000 --currency usd" -ForegroundColor Gray
    Write-Host "  stripe prices create --product prod_XXX --unit-amount 5000 --currency usd" -ForegroundColor Gray
    
} else {
    Write-Host "`n⚠️ Stripe CLI not found. Using API directly..." -ForegroundColor Yellow
    
    # Products to create
    $products = @(
        @{Name="10 hour Recording Block"; Description="10 hour recording session block"; Price=200.00; TaxCategory="Digital Products"},
        @{Name="VIP Duo Pass"; Description="VIP pass for two people"; Price=75.00; TaxCategory="Entertainment Services"},
        @{Name="VIP Single Pass NYE"; Description="VIP single pass for New Year's Eve"; Price=50.00; TaxCategory="Entertainment Services"},
        @{Name="Recording Hours"; Description="Recording studio hours"; Price=50.00; TaxCategory="Digital Products"}
    )
    
    foreach ($product in $products) {
        Write-Host "`n📦 Creating: $($product.Name)" -ForegroundColor Cyan
        
        # Create product
        $productParams = "name=$([System.Web.HttpUtility]::UrlEncode($product.Name))&description=$([System.Web.HttpUtility]::UrlEncode($product.Description))&metadata[tax_category]=$([System.Web.HttpUtility]::UrlEncode($product.TaxCategory))"
        
        try {
            $productResponse = Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" `
                -Method Post `
                -Headers @{
                    "Authorization" = "Bearer $StripeSecretKey"
                    "Content-Type" = "application/x-www-form-urlencoded"
                } `
                -Body $productParams
            
            $productId = $productResponse.id
            Write-Host "   ✅ Product: $productId" -ForegroundColor Green
            
            # Create price
            $priceParams = "product=$productId&unit_amount=$([math]::Round($product.Price * 100))&currency=usd"
            
            $priceResponse = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" `
                -Method Post `
                -Headers @{
                    "Authorization" = "Bearer $StripeSecretKey"
                    "Content-Type" = "application/x-www-form-urlencoded"
                } `
                -Body $priceParams
            
            $priceId = $priceResponse.id
            Write-Host "   ✅ Price: $priceId (`$$($product.Price))" -ForegroundColor Green
            
            Start-Sleep -Milliseconds 500
            
        } catch {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`n✅ Done! Verify in Stripe Dashboard:" -ForegroundColor Green
Write-Host "   https://dashboard.stripe.com/products" -ForegroundColor Cyan




