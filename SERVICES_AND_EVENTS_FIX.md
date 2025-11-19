# 🔧 Services and Events Fix - Complete Guide

## Problem
Services and NYE event disappeared from ExploreScreen because:
1. No data exists in Firestore `services` and `events` collections
2. Queries require indexes that may still be building
3. Firestore rules needed updating

## ✅ What I Fixed

### 1. Firestore Rules Updated
- ✅ Services collection: Allow authenticated users to create/update
- ✅ Events collection: Allow authenticated users to create/update
- ✅ EventBookings collection: Added permissions for dashboard stats
- ✅ Rules deployed successfully

### 2. Firestore Indexes Updated
- ✅ Added events index for `eventDate` ordering
- ✅ All indexes deployed

### 3. ExploreScreen Query Improved
- ✅ Added fallback for when index isn't ready
- ✅ Better error handling

### 4. Seed Script Created
- ✅ `scripts/seed-services-and-events.js` - Client-side seeding (requires auth)
- ✅ `scripts/seed-services-and-events-auth.js` - Server-side seeding (requires Admin SDK)
- ✅ `ADD_SERVICES_AND_EVENTS_MANUAL.md` - Manual Firebase Console guide

## 🚀 How to Add Services and Events

### Option 1: Firebase Console (Easiest - 5 minutes)

1. Go to: https://console.firebase.google.com/project/m1alive/firestore
2. Click **"Start collection"** → Name: `services`
3. Add documents using the data from `ADD_SERVICES_AND_EVENTS_MANUAL.md`
4. Repeat for `events` collection
5. **NYE Event Date**: December 31, 2025, 8:00 PM

**See `ADD_SERVICES_AND_EVENTS_MANUAL.md` for complete step-by-step instructions with all field values.**

### Option 2: Use Seed Script (After Setup)

If you have Firebase Admin SDK set up:
```bash
# 1. Download serviceAccountKey.json from Firebase Console
# 2. Install firebase-admin
npm install firebase-admin

# 3. Run seed script
node scripts/seed-services-and-events-auth.js
```

## 📋 Required Services

1. **Recording Time** - 10 hours for $200 (Special Deal)
2. **Music Production** - Full production services
3. **Event Photography** - Professional photography
4. **Video Production** - Professional videography
5. **Live Sound Engineering** - Live sound services

## 🎉 Required Events

1. **New Year's Eve Celebration** - Dec 31, 2025, 8:00 PM
2. **Holiday Showcase** - Dec 20, 2025, 7:00 PM (optional)

## ✅ Verification Steps

After adding data:

1. **Open ExploreScreen**:
   - Should see services in "Services" tab
   - Should see events in "Events" tab
   - NYE event should be visible

2. **Test Service Booking**:
   - Click "Recording Time" service
   - Should navigate to ServiceBookingScreen
   - Fill form → Select date/time → Complete booking
   - Should save to Firestore
   - Should process payment (Stripe)
   - Should create Google Calendar event

3. **Test Event Booking**:
   - Click "New Year's Eve Celebration"
   - Should navigate to ServiceBookingScreen
   - Complete booking flow
   - Should work end-to-end

## 🔍 Troubleshooting

### If services/events still don't show:

1. **Check Firestore Console**:
   - Verify data exists: https://console.firebase.google.com/project/m1alive/firestore
   - Check `services` collection has documents
   - Check `events` collection has documents

2. **Check Indexes**:
   - Go to: https://console.firebase.google.com/project/m1alive/firestore/indexes
   - Verify all indexes show "Enabled" (not "Building")

3. **Check App Logs**:
   - Look for "Firebase load failed" errors
   - Check for index errors
   - Verify queries are executing

4. **Refresh App**:
   - Pull down to refresh on ExploreScreen
   - Or restart app

## 📝 Next Steps

1. **Add data to Firestore** (use manual method above - 5 minutes)
2. **Wait for indexes** (if still building - 1-5 minutes)
3. **Test in app** - Services and events should appear
4. **Test booking flow** - End-to-end functionality

---

**Status**: Rules and indexes fixed. Ready for data seeding! 🚀

