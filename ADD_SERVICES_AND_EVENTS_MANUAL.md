# 📋 How to Add Services and NYE Event to Firestore

## Quick Method: Firebase Console (Recommended)

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/project/m1alive/firestore
2. Click **"Start collection"** or select existing collections

### Step 2: Add Services

1. **Create `services` collection** (if it doesn't exist)
2. **Add each service** by clicking "Add document":

#### Service 1: Recording Time (Special Deal)
- **Document ID**: Auto-generate
- **Fields**:
  ```
  name: "Recording Time" (string)
  description: "Professional recording studio time. 10 hours for $200 - Special Deal!" (string)
  price: 200 (number)
  duration: 10 (number)
  category: "Recording" (string)
  available: true (boolean)
  popularity: 100 (number)
  image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800" (string)
  location: "Merkaba Studios" (string)
  rating: 4.8 (number)
  reviews: 24 (number)
  isDeal: true (boolean)
  dealHours: 10 (number)
  dealPrice: 200 (number)
  regularPrice: 500 (number)
  createdAt: [timestamp] (click "timestamp" button)
  updatedAt: [timestamp] (click "timestamp" button)
  ```

#### Service 2: Music Production
- **Fields**:
  ```
  name: "Music Production" (string)
  description: "Full music production services including mixing and mastering" (string)
  price: 500 (number)
  duration: 8 (number)
  category: "Production" (string)
  available: true (boolean)
  popularity: 85 (number)
  image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800" (string)
  location: "Merkaba Studios" (string)
  rating: 4.9 (number)
  reviews: 18 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

#### Service 3: Event Photography
- **Fields**:
  ```
  name: "Event Photography" (string)
  description: "Professional event photography services" (string)
  price: 300 (number)
  duration: 4 (number)
  category: "Photography" (string)
  available: true (boolean)
  popularity: 75 (number)
  image: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800" (string)
  location: "On-site" (string)
  rating: 4.7 (number)
  reviews: 32 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

#### Service 4: Video Production
- **Fields**:
  ```
  name: "Video Production" (string)
  description: "Professional video production for events and performances" (string)
  price: 800 (number)
  duration: 6 (number)
  category: "Video" (string)
  available: true (boolean)
  popularity: 70 (number)
  image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800" (string)
  location: "On-site" (string)
  rating: 4.8 (number)
  reviews: 15 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

#### Service 5: Live Sound Engineering
- **Fields**:
  ```
  name: "Live Sound Engineering" (string)
  description: "Professional live sound engineering for events" (string)
  price: 400 (number)
  duration: 5 (number)
  category: "Sound" (string)
  available: true (boolean)
  popularity: 65 (number)
  image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800" (string)
  location: "On-site" (string)
  rating: 4.6 (number)
  reviews: 20 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

### Step 3: Add Events (Including NYE)

1. **Create `events` collection** (if it doesn't exist)
2. **Add NYE Event**:

#### New Year's Eve Celebration
- **Document ID**: Auto-generate
- **Fields**:
  ```
  name: "New Year's Eve Celebration" (string)
  description: "Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night." (string)
  eventDate: [timestamp] - Set to: December 31, 2025, 8:00 PM
  startTime: "8:00 PM" (string)
  endTime: "1:00 AM" (string)
  location: "Merkaba Venue" (string)
  address: "123 Main Street, Your City" (string)
  price: 50 (number)
  capacity: 500 (number)
  available: true (boolean)
  isRSVP: false (boolean)
  category: "Performance" (string)
  image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" (string)
  popularity: 95 (number)
  rating: 4.9 (number)
  reviews: 45 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

#### Holiday Showcase (Optional)
- **Fields**:
  ```
  name: "Holiday Showcase" (string)
  description: "Special holiday showcase featuring local artists" (string)
  eventDate: [timestamp] - Set to: December 20, 2025, 7:00 PM
  startTime: "7:00 PM" (string)
  endTime: "11:00 PM" (string)
  location: "Merkaba Venue" (string)
  address: "123 Main Street, Your City" (string)
  price: 25 (number)
  capacity: 300 (number)
  available: true (boolean)
  isRSVP: false (boolean)
  category: "Showcase" (string)
  image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800" (string)
  popularity: 60 (number)
  rating: 4.5 (number)
  reviews: 12 (number)
  createdAt: [timestamp]
  updatedAt: [timestamp]
  ```

---

## Alternative: Use Seed Script (After Authentication)

If you want to use the seed script, you need to:

1. **Download Firebase Admin SDK Key**:
   - Go to: https://console.firebase.google.com/project/m1alive/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root
   - **⚠️ Add to .gitignore** (never commit this file!)

2. **Install Firebase Admin**:
   ```bash
   npm install firebase-admin
   ```

3. **Run seed script**:
   ```bash
   node scripts/seed-services-and-events-auth.js
   ```

---

## ✅ Verification

After adding data:

1. **Check ExploreScreen**:
   - Services should appear in "Services" tab
   - Events should appear in "Events" tab
   - NYE event should be visible

2. **Test Booking Flow**:
   - Click on "Recording Time" service
   - Should navigate to ServiceBookingScreen
   - Fill out form and complete booking

3. **Test Event Booking**:
   - Click on "New Year's Eve Celebration"
   - Should navigate to ServiceBookingScreen (or EventBookingScreen)
   - Complete booking flow

---

## 🎯 Quick Copy-Paste for Firebase Console

### Recording Time Service
```
name: Recording Time
description: Professional recording studio time. 10 hours for $200 - Special Deal!
price: 200
duration: 10
category: Recording
available: true
popularity: 100
image: https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800
location: Merkaba Studios
rating: 4.8
reviews: 24
isDeal: true
dealHours: 10
dealPrice: 200
regularPrice: 500
```

### NYE Event
```
name: New Year's Eve Celebration
description: Ring in the New Year with live music, performances, and celebration!
eventDate: [Set to Dec 31, 2025 8:00 PM]
startTime: 8:00 PM
endTime: 1:00 AM
location: Merkaba Venue
price: 50
capacity: 500
available: true
isRSVP: false
category: Performance
image: https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800
popularity: 95
rating: 4.9
reviews: 45
```

---

**Time Required**: 5-10 minutes to add all services and events manually

