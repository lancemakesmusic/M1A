# Stripe Testing Guide for Expo & TestFlight

## ✅ Yes, You Can Test Payments!

You can test Stripe payments in **Expo development builds** and **TestFlight** using Stripe's **Test Mode**. No real money will be charged.

---

## 🔧 Setup for Testing

### 1. Get Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Make sure you're in **Test mode** (toggle in top right)
3. Copy your test keys:
   - **Publishable Key**: Starts with `pk_test_...`
   - **Secret Key**: Starts with `sk_test_...`

### 2. Configure Environment Variables

#### Frontend (`.env` file):
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE
EXPO_PUBLIC_API_BASE_URL=http://localhost:8001  # or your backend URL
```

#### Backend (`autoposter-backend/.env`):
```bash
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 3. Set Up Test Webhook (Important!)

For webhooks to work in testing:

#### Option A: Local Testing with Stripe CLI (Recommended)
```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to your local backend
stripe listen --forward-to http://localhost:8001/api/payments/webhook

# Copy the webhook signing secret (whsec_...) and add to backend .env
```

#### Option B: TestFlight/Expo Testing
1. Deploy your backend to a public URL (Cloud Run, Heroku, etc.)
2. In Stripe Dashboard → Webhooks → Add endpoint
3. URL: `https://your-backend-url.com/api/payments/webhook`
4. Select events: `checkout.session.completed`, `payment_intent.succeeded`
5. Copy the webhook signing secret to your backend `.env`

---

## 🧪 Test Cards

Use these test card numbers in Stripe Checkout:

### ✅ Success Cards
| Card Number | Description |
|------------|-------------|
| `4242 4242 4242 4242` | Visa - Always succeeds |
| `5555 5555 5555 4444` | Mastercard - Always succeeds |
| `3782 822463 10005` | American Express - Always succeeds |

### ❌ Decline Cards
| Card Number | Description |
|------------|-------------|
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |

### 🔄 Other Test Scenarios
| Card Number | Description |
|------------|-------------|
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 3220` | Requires authentication |

**For all test cards:**
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

---

## 📱 Testing in Expo

### Development Build:
```bash
# Start Expo
npm start

# Or run on device
npm run ios
npm run android
```

1. Make sure your `.env` file has test keys
2. Restart Expo after changing `.env`
3. Try a test transaction using card `4242 4242 4242 4242`

### TestFlight Build:
1. Build with test keys in `.env`:
   ```bash
   eas build --platform ios --profile production
   ```
2. Submit to TestFlight
3. Test with Stripe test cards

---

## 🔍 Verifying Test Mode

### Check if Test Mode is Active:

#### Frontend:
```javascript
// In your app, check the key
const isTestMode = STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_');
console.log('Stripe Test Mode:', isTestMode);
```

#### Backend:
```python
# In payments.py
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
is_test_mode = STRIPE_SECRET_KEY.startswith('sk_test_')
print(f"Stripe Test Mode: {is_test_mode}")
```

---

## 🧪 Testing Checklist

- [ ] Test keys configured (`pk_test_` and `sk_test_`)
- [ ] Backend running and accessible
- [ ] Webhook endpoint configured
- [ ] Test successful payment with `4242 4242 4242 4242`
- [ ] Test declined payment with `4000 0000 0000 0002`
- [ ] Verify order status updates to "completed" after payment
- [ ] Verify calendar events are created after payment
- [ ] Check Stripe Dashboard → Payments to see test transactions

---

## 🐛 Troubleshooting

### Payment Not Completing?
1. **Check webhook**: Make sure webhook is receiving events
   ```bash
   # Check backend logs
   # Should see: "✅ Purchase completed" or "✅ Calendar event created"
   ```

2. **Check Stripe Dashboard**: 
   - Go to Stripe Dashboard → Payments
   - Look for test payment attempts
   - Check if payment_intent status is "succeeded"

3. **Check Network**:
   - Ensure backend URL is accessible from device
   - For TestFlight, backend must be publicly accessible
   - Check CORS settings if testing from web

### Webhook Not Firing?
1. **Verify webhook URL** is correct in Stripe Dashboard
2. **Check webhook secret** matches in backend `.env`
3. **Test webhook locally** with Stripe CLI first
4. **Check backend logs** for webhook errors

### Calendar Events Not Creating?
1. **Check webhook logs** - should see calendar creation attempt
2. **Verify Google Calendar credentials** are configured
3. **Check order status** - events only create when payment succeeds
4. **Look for errors** in backend console

---

## 📊 Monitoring Test Transactions

### Stripe Dashboard:
- **Payments**: See all test transactions
- **Events**: See webhook events
- **Logs**: See API request logs

### Backend Logs:
Look for these messages:
```
✅ Purchase completed: Deducted $X from wallet
✅ Calendar event created successfully
✅ Updated order status to 'completed'
```

---

## 🚀 Switching to Live Mode

When ready for production:

1. **Get Live Keys** from Stripe Dashboard (toggle to Live mode)
2. **Update environment variables**:
   - Change `pk_test_` → `pk_live_`
   - Change `sk_test_` → `sk_live_`
3. **Update webhook** to use live webhook secret
4. **Test thoroughly** before going live!

---

## 💡 Pro Tips

1. **Always test in Test Mode first** - no real charges
2. **Use Stripe CLI** for local webhook testing
3. **Check Stripe Dashboard** regularly during testing
4. **Test both success and failure scenarios**
5. **Verify calendar events** are created correctly
6. **Test on real devices** (not just simulator)

---

## 📚 Resources

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Dashboard](https://dashboard.stripe.com/test)

---

## ✅ Quick Test

Try this right now:

1. Open your app in Expo/TestFlight
2. Go to Service Booking or Event Booking
3. Fill out the form
4. Click "Proceed to Payment"
5. Use card: `4242 4242 4242 4242`
6. Expiry: `12/34`, CVC: `123`
7. Complete payment
8. Check Stripe Dashboard → Payments (should see test payment)
9. Verify order status updates and calendar event is created

**You're all set! Happy testing! 🎉**





