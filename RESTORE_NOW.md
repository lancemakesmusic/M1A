# 🔄 Restore Services & Events - Quick Guide

## ✅ All Data Ready to Copy-Paste!

I've found all your previous services and events. Here's how to restore them:

---

## 📦 Step 1: Restore Services (10 services)

### Go to Firebase Console:
👉 https://console.firebase.google.com/project/m1alive/firestore/data

### Create `services` collection:
1. Click **"Start collection"**
2. Collection ID: `services`
3. Click **"Next"**

### Add Each Service (Copy-Paste Ready):

#### Service 1: Recording Time
- Document ID: **Auto-ID**
- Fields (click "Add field" for each):

```
name: Recording Time (string)
description: Professional studio recording time. Special deal: 10 hours for $200 (save $300!). (string)
price: 200 (number)
duration: 10 (number)
category: Recording (string)
subcategory: Audio Production (string)
available: true (boolean)
popularity: 98 (number)
image: https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800 (string)
location: Merkaba Studios (string)
rating: 5.0 (number)
reviews: 24 (number)
artist: Merkaba Entertainment (string)
isDeal: true (boolean)
dealHours: 10 (number)
dealPrice: 200 (number)
regularPrice: 500 (number)
createdAt: [timestamp - click timestamp button] (timestamp)
updatedAt: [timestamp - click timestamp button] (timestamp)
```

#### Service 2: Vocal Recording
```
name: Vocal Recording (string)
description: Elevate your sound with our industry-quality vocal recording service, complete with final mix and mastering options. (string)
price: 50 (number)
duration: 1 (number)
category: Services (string)
subcategory: Audio Production (string)
available: true (boolean)
popularity: 95 (number)
image: https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop&q=80 (string)
location: Merkaba Studios (string)
rating: 4.9 (number)
reviews: 18 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 3: Music Production
```
name: Music Production (string)
description: Full music production services including mixing and mastering (string)
price: 500 (number)
duration: 8 (number)
category: Production (string)
subcategory: Audio Production (string)
available: true (boolean)
popularity: 85 (number)
image: https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800 (string)
location: Merkaba Studios (string)
rating: 4.9 (number)
reviews: 18 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 4: Photography
```
name: Photography (string)
description: Capture your most precious moments with our high-quality photography services tailored to meet your individual needs. (string)
price: 150 (number)
duration: 1 (number)
category: Services (string)
subcategory: Photography (string)
available: true (boolean)
popularity: 92 (number)
image: https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80 (string)
location: On-site (string)
rating: 4.8 (number)
reviews: 32 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 5: Event Photography
```
name: Event Photography (string)
description: Professional event photography services (string)
price: 300 (number)
duration: 4 (number)
category: Photography (string)
subcategory: Photography (string)
available: true (boolean)
popularity: 75 (number)
image: https://images.unsplash.com/photo-1511578314322-379afb476865?w=800 (string)
location: On-site (string)
rating: 4.7 (number)
reviews: 32 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 6: Videography
```
name: Videography (string)
description: Experience top-tier videography services tailored to your unique event needs. (string)
price: 500 (number)
duration: 3 (number)
category: Services (string)
subcategory: Video Production (string)
available: true (boolean)
popularity: 94 (number)
image: https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=800&fit=crop&q=80 (string)
location: On-site (string)
rating: 4.9 (number)
reviews: 15 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 7: Video Production
```
name: Video Production (string)
description: Professional video production for events and performances (string)
price: 800 (number)
duration: 6 (number)
category: Video (string)
subcategory: Video Production (string)
available: true (boolean)
popularity: 70 (number)
image: https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800 (string)
location: On-site (string)
rating: 4.8 (number)
reviews: 15 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 8: Graphic Design
```
name: Graphic Design (string)
description: Elevate your brand with our high-quality custom graphic design service. (string)
price: 50 (number)
duration: 0.5 (number)
category: Services (string)
subcategory: Design (string)
available: true (boolean)
popularity: 88 (number)
image: https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&q=80 (string)
location: Remote (string)
rating: 4.8 (number)
reviews: 20 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 9: Website Development
```
name: Website Development (string)
description: Experience a tailored website development service designed to enhance user experience and drive traffic. (string)
price: 250 (number)
duration: 0.5 (number)
category: Services (string)
subcategory: Web Development (string)
available: true (boolean)
popularity: 90 (number)
image: https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop&q=80 (string)
location: Remote (string)
rating: 4.9 (number)
reviews: 12 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

#### Service 10: Live Sound Engineering
```
name: Live Sound Engineering (string)
description: Professional live sound engineering for events (string)
price: 400 (number)
duration: 5 (number)
category: Sound (string)
subcategory: Sound Engineering (string)
available: true (boolean)
popularity: 65 (number)
image: https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800 (string)
location: On-site (string)
rating: 4.6 (number)
reviews: 20 (number)
artist: Merkaba Entertainment (string)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

---

## 🎉 Step 2: Restore Events (NYE + Holiday Showcase)

### Create `events` collection:
1. Go back to root (click "Firestore Database")
2. Click **"Start collection"**
3. Collection ID: `events`
4. Click **"Next"**

### Event 1: New Year's Eve Celebration
- Document ID: **Auto-ID**
- Fields:

```
name: New Year's Eve Celebration (string)
description: Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night. (string)
eventDate: [timestamp] - Set to: December 31, 2025, 8:00 PM (timestamp)
startTime: 8:00 PM (string)
endTime: 1:00 AM (string)
location: Merkaba Venue (string)
address: 123 Main Street, Your City (string)
price: 50 (number)
capacity: 500 (number)
available: true (boolean)
isRSVP: false (boolean)
category: Performance (string)
image: https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800 (string)
features: Live performances, DJ sets, Champagne toast, Food & drinks, VIP options available (string)
popularity: 95 (number)
rating: 4.9 (number)
reviews: 45 (number)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

### Event 2: Holiday Showcase
```
name: Holiday Showcase (string)
description: Special holiday showcase featuring local artists (string)
eventDate: [timestamp] - Set to: December 20, 2025, 7:00 PM (timestamp)
startTime: 7:00 PM (string)
endTime: 11:00 PM (string)
location: Merkaba Venue (string)
address: 123 Main Street, Your City (string)
price: 25 (number)
capacity: 300 (number)
available: true (boolean)
isRSVP: false (boolean)
category: Showcase (string)
image: https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800 (string)
features: Multiple artists, Holiday theme, Food available (string)
popularity: 60 (number)
rating: 4.5 (number)
reviews: 12 (number)
createdAt: [timestamp] (timestamp)
updatedAt: [timestamp] (timestamp)
```

---

## ✅ Done!

After adding all services and events:

1. **Refresh your app**
2. **Go to ExploreScreen → Services tab** → Should see all 10 services
3. **Go to Events tab** → Should see NYE event and Holiday Showcase
4. **Test booking** → Click on any service or event

**Time: ~10-15 minutes to add all data**

---

## 🎯 Quick Tips:

- **For timestamps**: Click the "timestamp" button, then set date/time
- **For NYE eventDate**: December 31, 2025, 8:00 PM
- **Copy-paste field names** from above
- **All services have `available: true`** - they'll show immediately!

**Your services and events are restored!** 🚀

