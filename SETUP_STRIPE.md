# 💳 Stripe Setup Guide
## Quick setup to enable payment processing

### Step 1: Create Stripe Account (5 minutes)

1. Go to https://dashboard.stripe.com/register
2. Enter your email and create password
3. Complete business information:
   - Business type: **Individual** or **Company**
   - Business name: **Merkaba Entertainment** (or your business name)
   - Country: **United States**
   - Business website: Your website URL (optional)
4. Click **Create account**

### Step 2: Get API Keys (2 minutes)

1. In Stripe Dashboard, click **Developers** in left sidebar
2. Click **API keys**
3. You'll see two keys:

**Publishable key** (starts with `pk_test_` or `pk_live_`):
- This is safe to use in frontend code
- Copy this key

**Secret key** (starts with `sk_test_` or `sk_live_`):
- ⚠️ **KEEP THIS SECRET!** Never expose in frontend
- Only use in backend code
- Click **Reveal test key** to see it
- Copy this key

**Note:** Start with **Test mode** keys (they start with `pk_test_` and `sk_test_`). Switch to live keys when ready for production.

### Step 3: Add Keys to Your App (5 minutes)

#### Frontend (Publishable Key):

**Option A: Update StripeService.js directly**

Open `services/StripeService.js` and update line 8:

```javascript
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_KEY_HERE';
```

**Option B: Use Environment Variable** (Recommended)

Add to `.env` file:
```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

#### Backend (Secret Key):

**Option A: Set Environment Variable**

In PowerShell (Windows):
```powershell
$env:STRIPE_SECRET_KEY="sk_test_YOUR_SECRET_KEY_HERE"
```

Or create `.env` file in `autoposter-backend/`:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

**Option B: Update payments.py directly** (Not recommended for production)

Open `autoposter-backend/api/payments.py` and update line 14:
```python
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "sk_test_YOUR_SECRET_KEY_HERE")
```

### Step 4: Test Payment Flow (10 minutes)

1. **Restart backend** (if running):
   ```bash
   cd autoposter-backend
   python start_backend.py
   ```

2. **Restart Expo app**

3. **Test with Stripe test card:**
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)

4. **Complete a test booking:**
   - Go to Explore > Events
   - Select an event
   - Complete booking form
   - Use test card for payment
   - Verify payment succeeds

5. **Check Stripe Dashboard:**
   - Go to Stripe Dashboard > Payments
   - You should see the test payment
   - Status should be "Succeeded"

### Step 5: Test Other Payment Scenarios (5 minutes)

**Test Declined Card:**
- Card: `4000 0000 0000 0002`
- Should show decline error

**Test Insufficient Funds:**
- Card: `4000 0000 0000 9995`
- Should show insufficient funds error

### Step 6: Verify Integration (3 minutes)

Check that:
- [ ] Payment intent is created in Stripe
- [ ] Payment appears in Stripe Dashboard
- [ ] Booking is saved to backend
- [ ] Receipt is generated
- [ ] Confirmation message appears

### Troubleshooting

**If payment fails:**
- Check Stripe Dashboard > Logs for errors
- Verify API keys are correct
- Check backend logs for errors
- Ensure backend is running

**If "Stripe not configured" error:**
- Verify publishable key starts with `pk_`
- Check environment variable is set
- Restart Expo after changing keys

**If backend payment fails:**
- Verify secret key is set
- Check backend logs
- Ensure Stripe Python SDK is installed: `pip install stripe`

---

## 🔄 Switching to Live Mode

When ready for production:

1. **Complete Stripe account activation:**
   - Add business details
   - Add bank account
   - Complete identity verification

2. **Get live keys:**
   - Toggle "Test mode" to "Live mode" in Stripe Dashboard
   - Copy live publishable key (`pk_live_...`)
   - Copy live secret key (`sk_live_...`)

3. **Update keys:**
   - Replace test keys with live keys
   - Update in both frontend and backend

4. **Test with small amount first!**

---

**Total Time: ~25 minutes**
**Difficulty: Easy**

