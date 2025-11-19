# ✅ Activate Services - Quick Guide

## Step 1: Check Firebase Console

1. **Open Firebase Console**: https://console.firebase.google.com/project/m1alive/firestore/data

2. **Look for your services**:
   - Check if there's a `services` collection
   - If you see services elsewhere, note the collection name

## Step 2: Activate Services

### If services are in `services` collection:

1. Click on the `services` collection
2. For each service document:
   - Click on the document
   - Click "Add field" or edit existing fields
   - **Add/Update these fields**:
     ```
     Field: available
     Type: boolean
     Value: true
     
     Field: popularity
     Type: number
     Value: 100 (or any number 1-100)
     ```
   - Click "Update"

### If services are in a different collection:

Tell me the collection name and I'll update the code to look there!

## Step 3: Verify Required Fields

Each service MUST have:
- ✅ `available`: true (boolean)
- ✅ `popularity`: number (for sorting - use 100 for most popular)
- ✅ `name`: string
- ✅ `description`: string
- ✅ `price`: number

## Step 4: Test

1. Refresh your app
2. Go to ExploreScreen → Services tab
3. Services should now appear!

---

## Quick Fix via Firebase Console:

1. Go to: https://console.firebase.google.com/project/m1alive/firestore/data
2. Click `services` collection
3. For each service:
   - Click the document
   - Add field: `available` = `true` (boolean)
   - Add field: `popularity` = `100` (number)
   - Click "Update"

**That's it!** Services will be live immediately. 🚀

