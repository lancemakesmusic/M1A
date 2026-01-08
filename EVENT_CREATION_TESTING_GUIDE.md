# Event Creation Testing Guide

## Step-by-Step Testing Instructions

### Prerequisites
- ✅ App is running (Expo/development server)
- ✅ Firebase is configured and connected
- ✅ You have access to `admin@merkabaent.com` account

---

## Test 1: Verify Admin Access

### Step 1.1: Login as Admin
1. Open the app
2. Navigate to **Login Screen**
3. Enter email: `admin@merkabaent.com`
4. Enter your password
5. Tap **Login**
6. ✅ **Expected**: Login successful, redirected to Home screen

### Step 1.2: Access Admin Control Center
1. Tap the **Profile** tab (bottom navigation - person icon)
2. Scroll down on your profile screen
3. Look for **"Admin Control Center"** button (it appears as a card with a shield icon)
   - It should be visible between the action buttons and Dark Mode toggle
   - The button has:
     - Shield icon on the left
     - Title: "Admin Control Center"
     - Subtitle: "Manage users, events, and settings"
     - Chevron arrow on the right
4. Tap the **"Admin Control Center"** button
5. ✅ **Expected**: Admin Control Center screen opens with admin statistics and management options

---

## Test 2: Create an Event

### Step 2.1: Navigate to Event Creation
1. In **Admin Control Center**, scroll to find **"Create Event"** section
2. Look for the card with:
   - Icon: `add-circle` (plus icon)
   - Title: "Create Event"
   - Description: "Create public events with tickets, pricing, and photos"
3. Tap the **"Create Event"** card
4. ✅ **Expected**: Navigate to Admin Event Creation screen

### Step 2.2: Fill Event Details

**Basic Information:**
1. **Event Photo** (Optional):
   - Tap "Tap to add photo"
   - Select an image from your gallery
   - ✅ **Expected**: Image preview appears

2. **Event Title** (Required):
   - Enter: `Weekend Music Festival`
   - ✅ **Expected**: Text appears in input field

3. **Description** (Optional):
   - Enter: `Join us for an amazing weekend of live music, food, and fun!`
   - ✅ **Expected**: Text appears in text area

4. **Location** (Optional):
   - Enter: `123 Main Street, City, State`
   - ✅ **Expected**: Text appears in input field

5. **Category**:
   - Scroll through category chips
   - Select: **Performance** (or any category)
   - ✅ **Expected**: Category chip highlights in blue

**Date & Time:**
1. **Start Date**:
   - Tap "Start Date" button
   - Select a date (this weekend or future date)
   - ✅ **Expected**: Date picker opens, selected date appears

2. **Start Time**:
   - Tap "Start Time" button
   - Select: `7:00 PM` (or any time)
   - ✅ **Expected**: Time picker opens, selected time appears

3. **End Date**:
   - Tap "End Date" button
   - Select end date (same day or next day)
   - ✅ **Expected**: Date picker opens, selected date appears

4. **End Time**:
   - Tap "End Time" button
   - Select: `11:00 PM` (or any time)
   - ✅ **Expected**: Time picker opens, selected time appears

**Ticket Pricing (Optional):**
1. **Enable Ticket Sales**:
   - Toggle the switch to **ON**
   - ✅ **Expected**: Ticket pricing fields appear

2. **Regular Ticket Price**:
   - Enter: `25.00`
   - ✅ **Expected**: Price appears in input field

3. **Early Bird Price** (Optional):
   - Enter: `20.00`
   - Tap "Early Bird Ends" date button
   - Select a date before the event
   - ✅ **Expected**: Early bird price and date set

4. **VIP Price** (Optional):
   - Enter: `50.00`
   - ✅ **Expected**: VIP price appears

5. **Capacity** (Optional):
   - Enter: `200`
   - ✅ **Expected**: Capacity number appears

**Discounts (Optional):**
1. **Enable Discount**:
   - Toggle the switch to **ON**
   - ✅ **Expected**: Discount fields appear

2. **Discount Code**:
   - Enter: `WEEKEND20`
   - ✅ **Expected**: Code appears in uppercase

3. **Discount Percentage**:
   - Enter: `20`
   - ✅ **Expected**: Percentage appears

**Visibility:**
1. **Public Event**:
   - Ensure toggle is **ON** (default)
   - ✅ **Expected**: Toggle is enabled

### Step 2.3: Save Event
1. Review all entered information
2. Tap **"Save"** button (top right)
3. ✅ **Expected**: 
   - Loading indicator appears briefly
   - Success alert: "Event created successfully!"
   - Screen navigates back to Admin Control Center

---

## Test 3: Verify Event Appears in Events Tab

### Step 3.1: Navigate to Events Tab
1. Tap **Explore** tab (bottom navigation - search icon)
2. ✅ **Expected**: Explore screen opens

### Step 3.2: Select Events Category
1. Look for category tabs at the top: `Users | Events | Services | Bar`
2. Tap **"Events"** category
3. ✅ **Expected**: 
   - Category highlights
   - Screen shows only Events

### Step 3.3: Find Your Created Event
1. Scroll through the events list
2. Look for your event: **"Weekend Music Festival"**
3. ✅ **Expected**: 
   - Event card appears with:
     - Event photo (if uploaded)
     - Event title: "Weekend Music Festival"
     - Description text
     - Location (if provided)
     - Price: $25.00 (if tickets enabled)
     - Date/time information

### Step 3.4: Verify Event Details
1. Tap on the event card
2. ✅ **Expected**: 
   - Event details screen opens
   - All information is displayed correctly
   - Ticket purchase option available (if tickets enabled)

---

## Test 4: Verify Multiple Events

### Step 4.1: Create Another Event
1. Go back to **Admin Control Center**
2. Tap **"Create Event"** again
3. Create a second event with different details:
   - Title: `Friday Night Party`
   - Date: Different date
   - Category: `Party`
4. Save the event
5. ✅ **Expected**: Second event created successfully

### Step 4.2: Verify Both Events Appear
1. Navigate to **Explore** tab
2. Select **Events** category
3. ✅ **Expected**: 
   - Both events appear in the list
   - Events are sorted by date (upcoming first)
   - Each event shows correct information

---

## Test 5: Error Handling

### Test 5.1: Missing Required Fields
1. Navigate to **Create Event**
2. Leave **Event Title** empty
3. Try to save
4. ✅ **Expected**: 
   - Alert: "Please enter an event title"
   - Event is NOT saved

### Test 5.2: Missing Ticket Price (When Tickets Enabled)
1. Enable **Ticket Sales**
2. Leave **Regular Ticket Price** empty
3. Try to save
4. ✅ **Expected**: 
   - Alert: "Please enter a ticket price"
   - Event is NOT saved

### Test 5.3: Missing Discount Code (When Discount Enabled)
1. Enable **Discount**
2. Leave **Discount Code** empty
3. Try to save
4. ✅ **Expected**: 
   - Alert: "Please enter a discount code"
   - Event is NOT saved

---

## Test 6: Non-Admin Access (Security Test)

### Step 6.1: Login as Regular User
1. Logout from admin account
2. Login with a **non-admin** account
3. Try to access Admin Control Center
4. ✅ **Expected**: 
   - Access denied alert
   - Cannot access admin features

### Step 6.2: Try Direct Navigation (If Possible)
1. If you can navigate directly to AdminEventCreation screen
2. ✅ **Expected**: 
   - Alert: "Access Denied - Only admin@merkabaent.com can create events"
   - Screen navigates back

---

## Verification Checklist

After completing all tests, verify:

- [ ] Admin can login successfully
- [ ] Admin Control Center is accessible
- [ ] "Create Event" button is visible and works
- [ ] Event creation form loads correctly
- [ ] All form fields work (text inputs, date pickers, toggles)
- [ ] Event saves successfully
- [ ] Success message appears
- [ ] Created event appears in Events tab
- [ ] Event details are correct in Events tab
- [ ] Multiple events can be created
- [ ] Events are sorted correctly
- [ ] Required field validation works
- [ ] Non-admin users cannot access event creation
- [ ] Firestore rules prevent unauthorized access

---

## Troubleshooting

### Issue: "Create Event" button not visible
**Solution**: 
- Verify you're logged in as `admin@merkabaent.com`
- Check Admin Control Center screen loaded correctly
- Scroll down to find the button

### Issue: Event not appearing in Events tab
**Solution**:
- Check event date is in the future
- Verify `isPublic` is set to `true`
- Check Firestore console for `publicEvents` collection
- Refresh the Explore screen (pull down)

### Issue: Access Denied error
**Solution**:
- Verify email is exactly `admin@merkabaent.com` (case-sensitive)
- Check user profile in Firestore has correct email
- Verify Firestore rules are deployed

### Issue: Date picker not working
**Solution**:
- Check device date/time settings
- Try selecting date manually
- Verify date is not in the past

### Issue: Image upload fails
**Solution**:
- Check camera roll permissions
- Verify Firebase Storage is configured
- Check internet connection

---

## Expected Results Summary

✅ **Success Indicators:**
- Admin can create events successfully
- Events appear in Events tab immediately
- Event details are preserved correctly
- Security restrictions work properly
- Form validation prevents invalid submissions

❌ **Failure Indicators:**
- Access denied errors for admin
- Events not appearing in Events tab
- Form validation not working
- Data not saving to Firestore
- Non-admin users can access admin features

---

## Next Steps After Testing

1. **If all tests pass**: Feature is ready for production
2. **If tests fail**: 
   - Check error messages
   - Verify Firebase configuration
   - Check Firestore rules
   - Review console logs for errors
   - Check network connectivity

---

## Additional Notes

- Events are stored in `publicEvents` collection in Firestore
- Events are combined with `events` collection in ExploreScreen
- Only future events are shown (filtered by date)
- Admin-created events have `isAdminCreated: true` flag
- Events can be public or private (controlled by `isPublic` toggle)

