# Stripe Products Setup Guide

## Quick Setup with PowerShell

### Option 1: Using PowerShell Script (Recommended)

**Step 1: Set Stripe Secret Key**
```powershell
$env:STRIPE_SECRET_KEY = "mk_1RnG7RIinkSRXhqMOR2H7nVa"
```

**Step 2: Run Script**
```powershell
.\CREATE_STRIPE_PRODUCTS.ps1
```

**Or with dry run (test first):**
```powershell
.\CREATE_STRIPE_PRODUCTS.ps1 -DryRun
```

### Option 2: Using Stripe CLI

**Install Stripe CLI:**
```powershell
# Download from: https://stripe.com/docs/stripe-cli
# Or via winget:
winget install stripe.stripe-cli
```

**Set API Key:**
```powershell
stripe login
# Or set manually:
$env:STRIPE_API_KEY = "sk_test_YOUR_KEY_HERE"
```

**Create Products:**
```powershell
# Product 1: 10 hour Recording Block
stripe products create --name "10 hour Recording Block" --description "10 hour recording session block" --metadata tax_category="Digital Products"
stripe prices create --product prod_XXX --unit-amount 20000 --currency usd

# Product 2: VIP Duo Pass
stripe products create --name "VIP Duo Pass" --description "VIP pass for two people" --metadata tax_category="Entertainment Services"
stripe prices create --product prod_XXX --unit-amount 7500 --currency usd

# Product 3: VIP Single Pass NYE
stripe products create --name "VIP Single Pass NYE" --description "VIP single pass for New Year's Eve" --metadata tax_category="Entertainment Services"
stripe prices create --product prod_XXX --unit-amount 5000 --currency usd

# Product 4: Recording Hours
stripe products create --name "Recording Hours" --description "Recording studio hours" --metadata tax_category="Digital Products"
stripe prices create --product prod_XXX --unit-amount 5000 --currency usd
```

### Option 3: Using curl (Manual)

**Create Product:**
```powershell
$headers = @{
    "Authorization" = "Bearer sk_test_YOUR_KEY"
    "Content-Type" = "application/x-www-form-urlencoded"
}

$body = "name=10 hour Recording Block&description=10 hour recording session block&metadata[tax_category]=Digital Products"

Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" -Method Post -Headers $headers -Body $body
```

**Create Price:**
```powershell
$body = "product=prod_XXX&unit_amount=20000&currency=usd"

Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Method Post -Headers $headers -Body $body
```

## Products to Create

Based on your Stripe dashboard:

1. **10 hour Recording Block**
   - Price: $200.00
   - Tax Category: Digital Products (update if needed)

2. **VIP Duo Pass**
   - Price: $75.00
   - Tax Category: Entertainment Services (update if needed)

3. **VIP Single Pass NYE**
   - Price: $50.00
   - Tax Category: Entertainment Services (update if needed)

4. **Recording Hours**
   - Price: $50.00
   - Tax Category: Digital Products (update if needed)

## Tax Categories

**Current Issue:** All products show "Alcoholic Beverages - Spirits" ❌

**Recommended Categories:**
- Recording services → "Digital Products" or "Professional Services"
- VIP passes → "Entertainment Services" or "Admission Fees"
- Bar items → "Alcoholic Beverages - Spirits" ✅

## After Creating Products

1. **Verify in Stripe Dashboard:**
   - Go to: https://dashboard.stripe.com/products
   - Check all 4 products exist
   - Verify prices are correct
   - Update tax categories if needed

2. **Sync to Firestore:**
   ```powershell
   # After backend is running:
   POST http://localhost:8001/api/stripe/sync-products
   ```

3. **Test Checkout:**
   - Add items to cart
   - Complete checkout
   - Verify products are used (check backend logs)

## Troubleshooting

### "Unauthorized" Error
- Check Stripe secret key is correct
- Make sure it starts with `sk_test_` or `sk_live_`

### "Product already exists"
- Products with same name already exist
- Either update existing or use different names

### Tax Category Not Applied
- Update product metadata in Stripe Dashboard
- Re-sync: `POST /api/stripe/sync-products`

## Scripts Provided

1. **CREATE_STRIPE_PRODUCTS.ps1** - Full-featured script with error handling
2. **CREATE_STRIPE_PRODUCTS_SIMPLE.ps1** - Simple version using Stripe CLI or API

## Quick Command Reference

```powershell
# Set key
$env:STRIPE_SECRET_KEY = "sk_test_..."

# Run script
.\CREATE_STRIPE_PRODUCTS.ps1

# Or use Stripe CLI
stripe products list
stripe products create --name "Product Name" --description "Description"
stripe prices create --product prod_XXX --unit-amount 5000 --currency usd
```




