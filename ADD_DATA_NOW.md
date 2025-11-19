# ⚡ Add Services & Events NOW - Step by Step

## 🎯 Quick Start (3 Minutes)

### Open Firebase Console
👉 **Click here**: https://console.firebase.google.com/project/m1alive/firestore/data

---

## 📦 Step 1: Add Services (5 services)

### 1.1 Create Services Collection
1. Click **"Start collection"** button
2. Collection ID: `services`
3. Click **"Next"**

### 1.2 Add First Service: Recording Time
- Document ID: Click **"Auto-ID"** button
- Add fields (click "Add field" for each):

```
Field: name
Type: string
Value: Recording Time

Field: description  
Type: string
Value: Professional recording studio time. 10 hours for $200 - Special Deal!

Field: price
Type: number
Value: 200

Field: duration
Type: number
Value: 10

Field: category
Type: string
Value: Recording

Field: available
Type: boolean
Value: true

Field: popularity
Type: number
Value: 100

Field: image
Type: string
Value: https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800

Field: location
Type: string
Value: Merkaba Studios

Field: rating
Type: number
Value: 4.8

Field: reviews
Type: number
Value: 24

Field: isDeal
Type: boolean
Value: true

Field: dealHours
Type: number
Value: 10

Field: dealPrice
Type: number
Value: 200

Field: regularPrice
Type: number
Value: 500

Field: createdAt
Type: timestamp
Value: [Click timestamp button - use current time]

Field: updatedAt
Type: timestamp
Value: [Click timestamp button - use current time]
```

- Click **"Save"**

### 1.3 Add Remaining 4 Services
Repeat the process for each service (click "Add document" in services collection):

**Service 2: Music Production**
- name: `Music Production`
- description: `Full music production services including mixing and mastering`
- price: `500`
- duration: `8`
- category: `Production`
- available: `true`
- popularity: `85`
- image: `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800`
- location: `Merkaba Studios`
- rating: `4.9`
- reviews: `18`
- createdAt: timestamp (now)
- updatedAt: timestamp (now)

**Service 3: Event Photography**
- name: `Event Photography`
- description: `Professional event photography services`
- price: `300`
- duration: `4`
- category: `Photography`
- available: `true`
- popularity: `75`
- image: `https://images.unsplash.com/photo-1511578314322-379afb476865?w=800`
- location: `On-site`
- rating: `4.7`
- reviews: `32`
- createdAt: timestamp (now)
- updatedAt: timestamp (now)

**Service 4: Video Production**
- name: `Video Production`
- description: `Professional video production for events and performances`
- price: `800`
- duration: `6`
- category: `Video`
- available: `true`
- popularity: `70`
- image: `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800`
- location: `On-site`
- rating: `4.8`
- reviews: `15`
- createdAt: timestamp (now)
- updatedAt: timestamp (now)

**Service 5: Live Sound Engineering**
- name: `Live Sound Engineering`
- description: `Professional live sound engineering for events`
- price: `400`
- duration: `5`
- category: `Sound`
- available: `true`
- popularity: `65`
- image: `https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800`
- location: `On-site`
- rating: `4.6`
- reviews: `20`
- createdAt: timestamp (now)
- updatedAt: timestamp (now)

---

## 🎉 Step 2: Add Events (NYE Event)

### 2.1 Create Events Collection
1. Go back to root (click "Firestore Database" in breadcrumb)
2. Click **"Start collection"**
3. Collection ID: `events`
4. Click **"Next"**

### 2.2 Add NYE Event: New Year's Eve Celebration
- Document ID: Click **"Auto-ID"**
- Add fields:

```
Field: name
Type: string
Value: New Year's Eve Celebration

Field: description
Type: string
Value: Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night.

Field: eventDate
Type: timestamp
Value: [Click timestamp button]
   - Date: December 31, 2025
   - Time: 8:00 PM
   - Click "Set"

Field: startTime
Type: string
Value: 8:00 PM

Field: endTime
Type: string
Value: 1:00 AM

Field: location
Type: string
Value: Merkaba Venue

Field: address
Type: string
Value: 123 Main Street, Your City

Field: price
Type: number
Value: 50

Field: capacity
Type: number
Value: 500

Field: available
Type: boolean
Value: true

Field: isRSVP
Type: boolean
Value: false

Field: category
Type: string
Value: Performance

Field: image
Type: string
Value: https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800

Field: popularity
Type: number
Value: 95

Field: rating
Type: number
Value: 4.9

Field: reviews
Type: number
Value: 45

Field: createdAt
Type: timestamp
Value: [Click timestamp - current time]

Field: updatedAt
Type: timestamp
Value: [Click timestamp - current time]
```

- Click **"Save"**

### 2.3 Add Holiday Showcase (Optional)
- Click **"Add document"** in events collection
- Same fields as NYE, but:
  - name: `Holiday Showcase`
  - description: `Special holiday showcase featuring local artists`
  - eventDate: **December 20, 2025, 7:00 PM**
  - startTime: `7:00 PM`
  - endTime: `11:00 PM`
  - price: `25`
  - capacity: `300`
  - popularity: `60`
  - rating: `4.5`
  - reviews: `12`

---

## ✅ Step 3: Verify

1. **Check your collections**:
   - `services` collection should have 5 documents
   - `events` collection should have 1-2 documents

2. **Open your app**:
   - Go to **ExploreScreen**
   - Click **"Services"** tab → Should see all 5 services
   - Click **"Events"** tab → Should see NYE event

3. **Test booking**:
   - Click on **"Recording Time"** service
   - Should navigate to booking screen
   - Fill form and complete booking

---

## 🎯 That's It!

**Time taken**: ~3-5 minutes
**No passwords needed** - Just use Firebase Console!

**Your services and NYE event are now live!** 🚀

