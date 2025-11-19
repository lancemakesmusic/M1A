# 🚀 Quick Add Services & Events - 3 Minutes

## Method 1: Firebase Console (Easiest - No Password Needed!)

### Step 1: Open Firebase Console
👉 **Click this link**: https://console.firebase.google.com/project/m1alive/firestore/data

### Step 2: Add Services Collection

1. Click **"Start collection"** (or click `services` if it exists)
2. Collection ID: `services`
3. Click **"Next"**

#### Add Service 1: Recording Time
- Document ID: Click **"Auto-ID"**
- Add these fields (click "Add field" for each):

| Field Name | Type | Value |
|------------|------|-------|
| `name` | string | `Recording Time` |
| `description` | string | `Professional recording studio time. 10 hours for $200 - Special Deal!` |
| `price` | number | `200` |
| `duration` | number | `10` |
| `category` | string | `Recording` |
| `available` | boolean | `true` |
| `popularity` | number | `100` |
| `image` | string | `https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800` |
| `location` | string | `Merkaba Studios` |
| `rating` | number | `4.8` |
| `reviews` | number | `24` |
| `isDeal` | boolean | `true` |
| `dealHours` | number | `10` |
| `dealPrice` | number | `200` |
| `regularPrice` | number | `500` |
| `createdAt` | timestamp | Click "timestamp" button (current time) |
| `updatedAt` | timestamp | Click "timestamp" button (current time) |

4. Click **"Save"**

#### Add Service 2: Music Production
- Click **"Add document"** in `services` collection
- Document ID: Auto-ID
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Music Production` |
| `description` | string | `Full music production services including mixing and mastering` |
| `price` | number | `500` |
| `duration` | number | `8` |
| `category` | string | `Production` |
| `available` | boolean | `true` |
| `popularity` | number | `85` |
| `image` | string | `https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800` |
| `location` | string | `Merkaba Studios` |
| `rating` | number | `4.9` |
| `reviews` | number | `18` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

#### Add Service 3: Event Photography
- Click **"Add document"**
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Event Photography` |
| `description` | string | `Professional event photography services` |
| `price` | number | `300` |
| `duration` | number | `4` |
| `category` | string | `Photography` |
| `available` | boolean | `true` |
| `popularity` | number | `75` |
| `image` | string | `https://images.unsplash.com/photo-1511578314322-379afb476865?w=800` |
| `location` | string | `On-site` |
| `rating` | number | `4.7` |
| `reviews` | number | `32` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

#### Add Service 4: Video Production
- Click **"Add document"**
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Video Production` |
| `description` | string | `Professional video production for events and performances` |
| `price` | number | `800` |
| `duration` | number | `6` |
| `category` | string | `Video` |
| `available` | boolean | `true` |
| `popularity` | number | `70` |
| `image` | string | `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800` |
| `location` | string | `On-site` |
| `rating` | number | `4.8` |
| `reviews` | number | `15` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

#### Add Service 5: Live Sound Engineering
- Click **"Add document"**
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Live Sound Engineering` |
| `description` | string | `Professional live sound engineering for events` |
| `price` | number | `400` |
| `duration` | number | `5` |
| `category` | string | `Sound` |
| `available` | boolean | `true` |
| `popularity` | number | `65` |
| `image` | string | `https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800` |
| `location` | string | `On-site` |
| `rating` | number | `4.6` |
| `reviews` | number | `20` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

### Step 3: Add Events Collection

1. Click **"Start collection"** (or go back to root)
2. Collection ID: `events`
3. Click **"Next"**

#### Add NYE Event: New Year's Eve Celebration
- Document ID: Auto-ID
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `New Year's Eve Celebration` |
| `description` | string | `Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night.` |
| `eventDate` | timestamp | **Dec 31, 2025, 8:00 PM** (Click timestamp, set date/time) |
| `startTime` | string | `8:00 PM` |
| `endTime` | string | `1:00 AM` |
| `location` | string | `Merkaba Venue` |
| `address` | string | `123 Main Street, Your City` |
| `price` | number | `50` |
| `capacity` | number | `500` |
| `available` | boolean | `true` |
| `isRSVP` | boolean | `false` |
| `category` | string | `Performance` |
| `image` | string | `https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800` |
| `popularity` | number | `95` |
| `rating` | number | `4.9` |
| `reviews` | number | `45` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

4. Click **"Save"**

#### Add Event 2: Holiday Showcase (Optional)
- Click **"Add document"** in `events` collection
- Fields:

| Field | Type | Value |
|-------|------|-------|
| `name` | string | `Holiday Showcase` |
| `description` | string | `Special holiday showcase featuring local artists` |
| `eventDate` | timestamp | **Dec 20, 2025, 7:00 PM** |
| `startTime` | string | `7:00 PM` |
| `endTime` | string | `11:00 PM` |
| `location` | string | `Merkaba Venue` |
| `address` | string | `123 Main Street, Your City` |
| `price` | number | `25` |
| `capacity` | number | `300` |
| `available` | boolean | `true` |
| `isRSVP` | boolean | `false` |
| `category` | string | `Showcase` |
| `image` | string | `https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800` |
| `popularity` | number | `60` |
| `rating` | number | `4.5` |
| `reviews` | number | `12` |
| `createdAt` | timestamp | Now |
| `updatedAt` | timestamp | Now |

---

## ✅ Done!

After adding all services and events:

1. **Open your app** → Go to **ExploreScreen**
2. **Services tab** → Should show all 5 services
3. **Events tab** → Should show NYE event and Holiday Showcase
4. **Test booking** → Click on "Recording Time" or "New Year's Eve Celebration"

---

## 🎯 Quick Tips

- **Copy-paste field names** from the tables above
- **For timestamps**: Click the "timestamp" button, then set date/time
- **For NYE eventDate**: Set to December 31, 2025, 8:00 PM
- **All done in ~3-5 minutes!**

---

**Need help?** The Firebase Console is the easiest way - no passwords, no scripts, just point and click! 🚀

