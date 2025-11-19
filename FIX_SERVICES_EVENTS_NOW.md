# 🚨 URGENT: Services & Events Not Showing - Fix Now

## Problem Found:
- ❌ **0 services** in Firestore (need to add 5 services)
- ❌ **3 events exist** but missing required fields (`eventDate`, `available`, `isRSVP`, `category`)
- ❌ **NYE event doesn't exist** with proper fields

## ✅ Solution: Add Data to Firestore

### Quick Fix (5 minutes):

1. **Open Firebase Console**: https://console.firebase.google.com/project/m1alive/firestore/data

2. **Add Services Collection**:
   - Click "Start collection" → ID: `services`
   - Add 5 services (see ADD_DATA_NOW.md for exact fields)

3. **Add/Update Events Collection**:
   - Go to `events` collection
   - **Either**: Delete the 3 broken events and add new ones
   - **Or**: Update existing events to add missing fields:
     - `eventDate`: timestamp (Dec 31, 2025, 8:00 PM for NYE)
     - `available`: true
     - `isRSVP`: false
     - `category`: "Performance" or "Showcase"

4. **Add NYE Event** (if not already there):
   - Collection: `events`
   - Document ID: Auto-ID
   - **Required fields**:
     ```
     name: "New Year's Eve Celebration"
     eventDate: [timestamp] - Dec 31, 2025, 8:00 PM
     available: true
     isRSVP: false
     category: "Performance"
     ```

## 📋 Required Fields for Events:

Every event MUST have:
- ✅ `eventDate` (timestamp) - **REQUIRED for query to work**
- ✅ `available` (boolean) - true
- ✅ `isRSVP` (boolean) - false for booking events
- ✅ `category` (string) - "Performance", "Showcase", etc.

## 📋 Required Fields for Services:

Every service MUST have:
- ✅ `available` (boolean) - true
- ✅ `popularity` (number) - for sorting
- ✅ `name`, `description`, `price`, etc.

---

**See `ADD_DATA_NOW.md` for complete step-by-step instructions!**

