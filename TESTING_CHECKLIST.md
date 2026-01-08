# Complete Testing Checklist for Checkout Screens

## Prerequisites Setup

### 1. Deploy Firestore Rules ✅ REQUIRED FIRST
```bash
firebase deploy --only firestore:rules
```

**Expected Output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/YOUR_PROJECT/overview
```

**Wait:** 1-2 minutes for rules to propagate

**Verify:** Check Firebase Console → Firestore Database → Rules tab

---

### 2. Start Backend Server
```bash
cd autoposter-backend
python start_backend.py
```

**Expected Output:**
```
[OK] Loaded environment variables from .env
[OK] Loaded api/main.py (with payments)
🚀 Starting M1A Backend API...
📍 Server: http://0.0.0.0:8001
✅ Backend is running!
```

**Verify Backend Health:**
- Open browser: http://localhost:8001/api/payments/health
- Should return: `{"status":"healthy","stripe_configured":true}`

---

### 3. Start Expo App
```bash
npx expo start --clear
```

**Expected Output:**
- QR code appears
- Metro bundler running
- No errors in console

---

## Test Each Checkout Screen

### Test 1: BarMenuScreen ✅

**Steps:**
1. Navigate to Bar Menu in app
2. Add items to cart (e.g., Margarita, Buffalo Trace)
3. Click "Proceed to Payment"
4. Review order summary
5. Click "Pay $X.XX" button

**Expected Behavior:**
- ✅ Stripe Checkout opens in browser
- ✅ Shows order total
- ✅ Payment form appears

**Test Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`
- ZIP: `12345`

**Verify After Payment:**
- [ ] Order appears in Firestore `barOrders` collection
- [ ] Order `status` = `'completed'`
- [ ] Order `paymentStatus` = `'completed'`
- [ ] Order has `checkoutSessionId`
- [ ] Transaction appears in `walletTransactions`
- [ ] Transaction `status` = `'completed'`
- [ ] Transaction `description` contains "Bar Order:"
- [ ] Transaction appears in Wallet Screen

**Check Firestore:**
```javascript
// In Firebase Console → Firestore
// Collection: barOrders
// Look for latest order with your userId
```

**Check Wallet Screen:**
- Navigate to Wallet Screen
- Check "Recent Transactions"
- Should see transaction with description like "Bar Order: Margarita, Buffalo Trace"

---

### Test 2: ServiceBookingScreen ✅

**Steps:**
1. Navigate to Explore Screen
2. Select a service (e.g., "Vocal Recording")
3. Fill out booking form:
   - Select date
   - Select time
   - Enter quantity
   - Add special requests (optional)
4. Click "Proceed to Payment"
5. Click "Pay $X.XX" button

**Expected Behavior:**
- ✅ Stripe Checkout opens
- ✅ Shows service name and total

**Test Payment:**
- Use same test card: `4242 4242 4242 4242`

**Verify After Payment:**
- [ ] Order appears in Firestore `serviceOrders` collection
- [ ] Order `status` = `'completed'`
- [ ] Order `paymentStatus` = `'completed'`
- [ ] Calendar event created in Google Calendar
- [ ] Transaction appears in `walletTransactions`
- [ ] Transaction `description` contains "Service Booking:"
- [ ] Transaction appears in Wallet Screen

**Check Calendar:**
- Check Google Calendar (business calendar)
- Should see event for selected date/time

---

### Test 3: EventBookingScreen ✅

**Steps:**
1. Navigate to Event Booking
2. Complete all 5 steps:
   - **Step 1:** Select event type (e.g., "Performance")
   - **Step 2:** Select date, time, guests, duration
   - **Step 3:** Enter contact info
   - **Step 4:** Select bar package, add-ons
   - **Step 5:** Review and pay deposit
3. Click "Pay Deposit" button

**Expected Behavior:**
- ✅ Stripe Checkout opens
- ✅ Shows deposit amount (not full amount)

**Test Payment:**
- Use same test card: `4242 4242 4242 4242`

**Verify After Payment:**
- [ ] Order appears in Firestore `eventOrders` collection
- [ ] Order `status` = `'completed'`
- [ ] Order `paymentStatus` = `'completed'`
- [ ] Calendar event created
- [ ] Transaction appears in `walletTransactions`
- [ ] Transaction `description` contains "Event Booking:"
- [ ] Transaction amount = deposit amount
- [ ] Transaction appears in Wallet Screen

---

### Test 4: BarMenuCategoryScreen ✅

**Steps:**
1. Navigate to Bar Menu Category (e.g., "Spirits")
2. Add items to cart
3. Open cart (bottom sheet)
4. Click checkout button
5. Click "Pay" button

**Expected Behavior:**
- ✅ Stripe Checkout opens
- ✅ Shows order total

**Test Payment:**
- Use same test card: `4242 4242 4242 4242`

**Verify After Payment:**
- [ ] Order appears in Firestore `barOrders` collection
- [ ] Order `status` = `'completed'`
- [ ] Order `paymentStatus` = `'completed'`
- [ ] Transaction appears in `walletTransactions`
- [ ] Transaction appears in Wallet Screen

---

## Verify Webhook Creates Transactions

### Check Backend Logs

**Look for these log messages:**
```
✅ Updated order status to 'completed' for payment intent: pi_xxx
✅ Purchase completed: Deducted $X.XX from wallet for user xxx
✅ Created transaction record
```

### Check Firestore Collections

**1. Orders Collections:**
- `barOrders` - Should have completed orders
- `serviceOrders` - Should have completed orders
- `eventOrders` - Should have completed orders

**2. Transactions Collection:**
- `walletTransactions` - Should have transaction records
- Each transaction should have:
  - `userId` = your user ID
  - `type` = `'sent'`
  - `amount` = negative amount (e.g., -45.00)
  - `status` = `'completed'`
  - `description` = appropriate description
  - `orderType` = `'bar'`, `'service_booking'`, or `'event_booking'`
  - `orderId` = reference to order
  - `paymentIntentId` = Stripe payment intent ID
  - `timestamp` = Firestore timestamp

### Check Wallet Screen

**In App:**
1. Navigate to Wallet Screen
2. Check "Recent Transactions" section
3. Should see all completed transactions
4. Each transaction should show:
   - Description (e.g., "Bar Order: Item1, Item2")
   - Amount (negative, e.g., "-$45.00")
   - Status: "Completed" (green)
   - Timestamp

---

## Monitor Backend Logs

### What to Watch For:

**✅ Success Indicators:**
- `checkout.session.completed` event received
- Order found and updated
- Transaction created
- No errors

**❌ Error Indicators:**
- `Order not found for payment intent`
- `Failed to create transaction`
- `Firestore error`
- `Stripe error`

### Common Issues:

**1. Order Not Found:**
- **Cause:** Order not saved before checkout, or `checkoutSessionId` mismatch
- **Fix:** Check order was created before checkout session

**2. Transaction Not Created:**
- **Cause:** Webhook error or Firestore permissions
- **Fix:** Check backend logs, verify Firestore rules deployed

**3. Wallet Balance Not Updated:**
- **Cause:** Wallet doesn't exist or update failed
- **Fix:** Check wallet exists in Firestore, verify update permissions

---

## Test with Stripe Test Cards

### Success Cards:
- `4242 4242 4242 4242` - Visa (most common)
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

### Decline Cards:
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

### Test Scenarios:

**1. Successful Payment:**
- Use: `4242 4242 4242 4242`
- Expected: Order completed, transaction created

**2. Declined Payment:**
- Use: `4000 0000 0000 0002`
- Expected: Payment fails, order remains pending

**3. Cancel Payment:**
- Start checkout, close browser
- Expected: Returns to payment screen, order remains pending

---

## Verification Checklist

### After Each Test:

- [ ] Order created in Firestore
- [ ] Order status = 'completed'
- [ ] Order paymentStatus = 'completed'
- [ ] Order has checkoutSessionId
- [ ] Transaction created in walletTransactions
- [ ] Transaction status = 'completed'
- [ ] Transaction has correct description
- [ ] Transaction has correct amount
- [ ] Transaction appears in Wallet Screen
- [ ] Calendar event created (for services/events)
- [ ] No errors in backend logs
- [ ] No errors in app console

### Final Verification:

- [ ] All 4 checkout screens tested
- [ ] All payments successful
- [ ] All transactions appear in Wallet
- [ ] All calendar events created
- [ ] No mock payments used
- [ ] All orders properly completed
- [ ] Webhook working correctly

---

## Troubleshooting

### Issue: "Not Found" when creating checkout
**Solution:**
- Check backend is running
- Verify `EXPO_PUBLIC_API_BASE_URL` is set
- Check backend logs for errors

### Issue: "Missing or insufficient permissions"
**Solution:**
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Wait 1-2 minutes
- Try again

### Issue: Transaction not appearing in Wallet
**Solution:**
- Check `walletTransactions` collection in Firestore
- Verify transaction was created
- Check Wallet Screen refresh
- Verify user ID matches

### Issue: Order not completing
**Solution:**
- Check backend logs for webhook errors
- Verify Stripe webhook is configured
- Check webhook endpoint is accessible
- Verify Stripe keys are correct

---

## Success Criteria

✅ All checkout screens use Stripe Checkout Session
✅ No mock payments anywhere
✅ All orders complete successfully
✅ All transactions appear in Wallet Screen
✅ Calendar events created for services/events
✅ Webhook processes all payment types correctly
✅ No errors in logs
✅ User experience is smooth

---

## Next Steps After Testing

1. **Monitor Production:**
   - Set up error tracking
   - Monitor webhook success rate
   - Track transaction creation

2. **Optimize:**
   - Add retry logic for failed webhooks
   - Improve error messages
   - Add loading states

3. **Document:**
   - Update user documentation
   - Create support guides
   - Document edge cases





