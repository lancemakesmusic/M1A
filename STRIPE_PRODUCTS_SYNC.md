# Stripe Products Sync - Fix Checkout Issues

## Problem Identified

The checkout process was **creating products on-the-fly** instead of using your existing Stripe Products. This causes:
- ❌ Tax categories not mapped correctly
- ❌ Products not tracked properly in Stripe dashboard
- ❌ Duplicate products created for each checkout
- ❌ Can't use existing product metadata

## Solution Implemented

### 1. Created Stripe Products Sync Service ✅
**File:** `autoposter-backend/api/stripe_products.py`

**Features:**
- Fetches all Stripe products
- Maps products by name and price
- Syncs to Firestore for fast lookup
- Finds matching Price IDs for checkout

### 2. Updated Checkout to Use Stripe Products ✅
**File:** `autoposter-backend/api/payments.py`

**Changes:**
- Tries to find existing Stripe Product/Price first
- Uses Price ID if match found (preserves tax categories)
- Falls back to creating product on-the-fly if no match
- Logs which method is used for debugging

### 3. Added Sync Endpoints ✅
**File:** `autoposter-backend/api/main.py`

**New Endpoints:**
- `POST /api/stripe/sync-products` - Sync products to Firestore
- `GET /api/stripe/products` - List all Stripe products

## How It Works

### Checkout Flow (Updated):

1. **User adds items to cart** (Bar Menu, Services, etc.)
2. **Checkout session created** with order items
3. **For each item:**
   - Try to find matching Stripe Product by name
   - If found, get matching Price ID
   - Use Price ID in checkout (preserves tax category)
   - If not found, create product on-the-fly (fallback)
4. **Stripe Checkout opens** with proper products
5. **Tax categories applied** correctly from Stripe Products

### Product Matching Logic:

```python
# Tries to match by:
1. Product name (case-insensitive, partial match)
2. Price amount (exact match)
3. Currency (USD)
4. Returns Price ID if match found
```

## Your Stripe Products

Based on your dashboard, you have:
1. **10 hour Recording Block** - $200.00
2. **VIP Duo Pass** - $75.00
3. **VIP Single Pass NYE** - $50.00
4. **Recording Hours** - $50.00

All currently mapped to: **"Alcoholic Beverages - Spirits"** tax category

## Next Steps

### 1. Sync Products to Firestore

**Call this endpoint once:**
```bash
POST http://localhost:8001/api/stripe/sync-products
Authorization: Bearer <your-token>
```

This will:
- Fetch all Stripe products
- Save to Firestore `stripeProducts` collection
- Enable fast lookup during checkout

### 2. Map Products to App Items

You need to ensure your app items match Stripe product names:

**Bar Menu Items:**
- Should match product names in Stripe
- Or add `stripeProductId` field to bar menu items

**Services:**
- Should match product names in Stripe
- Or add `stripeProductId` field to services

### 3. Fix Tax Categories

Update your Stripe Products to have correct tax categories:
- Recording services → Should NOT be "Alcoholic Beverages"
- VIP passes → Should NOT be "Alcoholic Beverages"
- Bar items → "Alcoholic Beverages" is correct

**In Stripe Dashboard:**
1. Go to Product catalog
2. Edit each product
3. Update Tax category metadata
4. Re-sync: `POST /api/stripe/sync-products`

### 4. Test Checkout

After syncing:
1. Add items to cart
2. Go to checkout
3. Check backend logs - should see:
   - `"Using Stripe Price ID price_xxx for [Product Name]"`
4. Complete payment
5. Verify in Stripe dashboard:
   - Uses existing product
   - Tax category correct
   - No duplicate products created

## API Endpoints

### Sync Products
```bash
POST /api/stripe/sync-products
Authorization: Bearer <token>

Response:
{
  "success": true,
  "synced": 4,
  "total": 4
}
```

### List Products
```bash
GET /api/stripe/products
Authorization: Bearer <token>

Response:
{
  "success": true,
  "products": [
    {
      "id": "prod_xxx",
      "name": "10 hour Recording Block",
      "description": "",
      "active": true,
      "metadata": {}
    },
    ...
  ]
}
```

## Troubleshooting

### Products Not Matching?

**Check:**
1. Product names match exactly (case-insensitive)
2. Prices match exactly
3. Products are active in Stripe
4. Sync was run: `POST /api/stripe/sync-products`

### Still Creating Products On-The-Fly?

**Check backend logs:**
- Look for: `"Creating product on-the-fly for [name]"`
- This means no match was found
- Verify product names match

### Tax Categories Still Wrong?

**Fix in Stripe Dashboard:**
1. Edit product
2. Update metadata: `tax_category`
3. Re-sync products
4. Test checkout again

## Benefits

✅ **Proper Tax Categories** - Uses tax categories from Stripe Products
✅ **No Duplicate Products** - Reuses existing products
✅ **Better Tracking** - All checkouts use same products
✅ **Easier Management** - Update products in Stripe, not code
✅ **Fallback Support** - Still works if product not found

## Files Changed

1. `autoposter-backend/api/stripe_products.py` - NEW - Product sync service
2. `autoposter-backend/api/payments.py` - Updated checkout to use Stripe Products
3. `autoposter-backend/api/main.py` - Added sync endpoints




