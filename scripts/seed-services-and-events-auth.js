// scripts/seed-services-and-events-auth.js
// Script to seed Firestore with services and events (including NYE event)
// This version uses Firebase Admin SDK (server-side) for authentication-free seeding

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this from Firebase Console

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const services = [
  {
    name: 'Recording Time',
    description: 'Professional recording studio time. 10 hours for $200 - Special Deal!',
    price: 200,
    duration: 10, // hours
    category: 'Recording',
    available: true,
    popularity: 100,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    features: ['Professional equipment', 'Sound engineer included', 'Mixing available'],
    location: 'Merkaba Studios',
    rating: 4.8,
    reviews: 24,
    isDeal: true,
    dealHours: 10,
    dealPrice: 200,
    regularPrice: 500,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: 'Music Production',
    description: 'Full music production services including mixing and mastering',
    price: 500,
    duration: 8,
    category: 'Production',
    available: true,
    popularity: 85,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    features: ['Full production', 'Mixing', 'Mastering', 'Unlimited revisions'],
    location: 'Merkaba Studios',
    rating: 4.9,
    reviews: 18,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: 'Event Photography',
    description: 'Professional event photography services',
    price: 300,
    duration: 4,
    category: 'Photography',
    available: true,
    popularity: 75,
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
    features: ['High-res photos', 'Edited images', 'Same-day delivery'],
    location: 'On-site',
    rating: 4.7,
    reviews: 32,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: 'Video Production',
    description: 'Professional video production for events and performances',
    price: 800,
    duration: 6,
    category: 'Video',
    available: true,
    popularity: 70,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    features: ['4K video', 'Editing', 'Color grading', 'Final delivery'],
    location: 'On-site',
    rating: 4.8,
    reviews: 15,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: 'Live Sound Engineering',
    description: 'Professional live sound engineering for events',
    price: 400,
    duration: 5,
    category: 'Sound',
    available: true,
    popularity: 65,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    features: ['Sound check', 'Live mixing', 'Equipment provided'],
    location: 'On-site',
    rating: 4.6,
    reviews: 20,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
];

// NYE Event - December 31, 2025
const nyeEventDate = new Date('2025-12-31T20:00:00');
const events = [
  {
    name: 'New Year\'s Eve Celebration',
    description: 'Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night.',
    eventDate: admin.firestore.Timestamp.fromDate(nyeEventDate),
    startTime: '8:00 PM',
    endTime: '1:00 AM',
    location: 'Merkaba Venue',
    address: '123 Main Street, Your City',
    price: 50,
    capacity: 500,
    available: true,
    isRSVP: false, // Regular booking event, not RSVP
    category: 'Performance',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    features: ['Live performances', 'DJ sets', 'Champagne toast', 'Food & drinks', 'VIP options available'],
    popularity: 95,
    rating: 4.9,
    reviews: 45,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    name: 'Holiday Showcase',
    description: 'Special holiday showcase featuring local artists',
    eventDate: admin.firestore.Timestamp.fromDate(new Date('2025-12-20T19:00:00')),
    startTime: '7:00 PM',
    endTime: '11:00 PM',
    location: 'Merkaba Venue',
    address: '123 Main Street, Your City',
    price: 25,
    capacity: 300,
    available: true,
    isRSVP: false,
    category: 'Showcase',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    features: ['Multiple artists', 'Holiday theme', 'Food available'],
    popularity: 60,
    rating: 4.5,
    reviews: 12,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function seedData() {
  try {
    console.log('🌱 Starting to seed services and events...\n');

    // Seed services
    console.log('📦 Seeding services...');
    for (const service of services) {
      try {
        const docRef = await db.collection('services').add(service);
        console.log(`✅ Created service: ${service.name} (ID: ${docRef.id})`);
      } catch (error) {
        console.error(`❌ Error creating service ${service.name}:`, error.message);
      }
    }

    // Seed events
    console.log('\n🎉 Seeding events...');
    for (const event of events) {
      try {
        const docRef = await db.collection('events').add(event);
        console.log(`✅ Created event: ${event.name} (ID: ${docRef.id})`);
        if (event.name.includes('New Year')) {
          console.log(`   🎊 NYE Event Date: ${nyeEventDate.toLocaleDateString()} at ${event.startTime}`);
        }
      } catch (error) {
        console.error(`❌ Error creating event ${event.name}:`, error.message);
      }
    }

    console.log('\n✅ Seeding complete!');
    console.log('\n📋 Summary:');
    console.log(`   - ${services.length} services created`);
    console.log(`   - ${events.length} events created (including NYE event)`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Check ExploreScreen - services and events should now be visible');
    console.log('   2. Test booking flow - click on a service or event');
    console.log('   3. Verify NYE event appears in Events category');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

