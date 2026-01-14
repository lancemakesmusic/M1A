# Google Calendar Sync Setup for admin@merkabaent.com

## Overview

All bookings (services and events) are now automatically synced to **admin@merkabaent.com**'s Google Calendar after successful payment. This ensures you have a centralized calendar view of all bookings.

## What's Been Implemented

### ✅ Calendar Sync Features

1. **Automatic Sync After Booking**
   - Bookings are automatically synced to Google Calendar after successful payment
   - Works for both Stripe and wallet payments
   - Non-blocking (booking won't fail if calendar sync fails)

2. **Event Details Included**
   - Service/Event name
   - Customer name and contact information
   - Booking date and time
   - Duration (calculated from service hours)
   - Total cost
   - Order ID
   - Special requests (if any)
   - Location

3. **Attendees**
   - **admin@merkabaent.com** (always included)
   - Customer email (if available)

4. **Calendar Configuration**
   - Default calendar: `admin@merkabaent.com`
   - Can be overridden with `EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID` environment variable
   - Timezone: America/New_York

## Setup Instructions

### Step 1: Connect Google Calendar

1. **In the M1A App:**
   - Navigate to Settings or Calendar screen
   - Tap "Connect Google Calendar"
   - Sign in with **admin@merkabaent.com** Google account
   - Grant calendar permissions

2. **Or via Environment Variable:**
   - Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in your `.env` file or `app.json`
   - This is your Google OAuth Client ID from Google Cloud Console

### Step 2: Google Cloud Console Setup

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/
   - Select your project (or create a new one)

2. **Enable Google Calendar API:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs:
     - `exp://localhost:8081` (for Expo development)
     - `your-app-scheme://auth/google` (for production)
   - Copy the Client ID

4. **Set Client ID:**
   - Add to `.env` file:
     ```
     EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
     ```
   - Or add to `app.json`:
     ```json
     {
       "expo": {
         "extra": {
           "EXPO_PUBLIC_GOOGLE_CLIENT_ID": "your-client-id-here.apps.googleusercontent.com"
         }
       }
     }
     ```

### Step 3: Verify Calendar Access

1. **Test Calendar Connection:**
   - Make a test booking in the app
   - Check admin@merkabaent.com's Google Calendar
   - You should see the booking event appear

2. **Check Event Details:**
   - Event title: `[Service Name] - [Customer Name]`
   - Event description includes all booking details
   - Admin email is included as attendee
   - Customer email is included as attendee (if available)

## How It Works

### Booking Flow

1. User completes booking and payment
2. Payment is processed (Stripe or wallet)
3. Order is saved to Firestore
4. Email notifications are sent
5. **Calendar sync is triggered automatically**
6. Event is created in admin@merkabaent.com's calendar

### Calendar Sync Function

The `syncBookingToCalendar` function:
- Checks if Google Calendar is connected
- Parses booking date and time
- Calculates event duration
- Checks calendar availability (non-blocking)
- Creates calendar event with all booking details
- Includes admin@merkabaent.com and customer as attendees

### Error Handling

- Calendar sync failures are logged but don't break the booking flow
- If calendar is not connected, booking still succeeds
- If date/time is missing, calendar sync is skipped
- All errors are logged for debugging

## Troubleshooting

### Calendar Events Not Appearing

1. **Check Calendar Connection:**
   - Verify Google Calendar is connected in app settings
   - Try disconnecting and reconnecting

2. **Check Permissions:**
   - Ensure admin@merkabaent.com has calendar access
   - Verify OAuth scopes include `https://www.googleapis.com/auth/calendar`

3. **Check Logs:**
   - Look for calendar sync errors in console/logs
   - Common errors:
     - "Calendar not connected" - Need to connect Google Calendar
     - "Invalid date format" - Date parsing issue
     - "No date/time information" - Booking missing date/time

4. **Verify Calendar ID:**
   - Default: `admin@merkabaent.com`
   - Can be overridden with `EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID`
   - Ensure the calendar ID matches your actual Google Calendar

### Calendar Sync Failing Silently

- Check app logs for calendar sync errors
- Verify Google Calendar API is enabled in Google Cloud Console
- Ensure OAuth credentials are correct
- Check that the calendar ID is correct

## Environment Variables

```bash
# Required for Google Calendar integration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id

# Optional - override default calendar
EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID=admin@merkabaent.com
```

## Testing

### Test Calendar Sync

1. **Make a Test Booking:**
   - Book a service or event
   - Complete payment (Stripe or wallet)
   - Check admin@merkabaent.com's Google Calendar

2. **Verify Event Details:**
   - Event title includes service name and customer name
   - Event description includes all booking details
   - Admin email is in attendees list
   - Customer email is in attendees list (if available)
   - Event time matches booking time
   - Event duration matches service duration

3. **Check Error Handling:**
   - Disconnect Google Calendar and make a booking
   - Booking should succeed, calendar sync should be skipped
   - Check logs for "Calendar not connected" message

## Next Steps

- ✅ Calendar sync implemented for ServiceBookingScreen
- ⚠️ EventBookingScreen may need calendar sync (check if needed)
- ✅ Admin email included as attendee
- ✅ Customer email included as attendee
- ✅ Non-blocking error handling

## Notes

- Calendar sync happens asynchronously and won't block bookings
- If calendar sync fails, booking still succeeds
- All calendar sync attempts are logged for debugging
- Calendar events include full booking details for reference
