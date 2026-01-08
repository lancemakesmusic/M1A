// scripts/seed-services-and-events.js
// Script to seed Firestore with services and events (including NYE event)

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
    reviews: 24
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
    reviews: 18
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
    reviews: 32
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
    reviews: 15
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
    reviews: 20
  }
];

// NYE Event - December 31, 2025
const nyeEventDate = new Date('2025-12-31T20:00:00');
const events = [
  {
    name: 'New Year\'s Eve Celebration',
    description: 'Ring in the New Year with live music, performances, and celebration! Free RSVP event on December 31, 2025.',
    eventDate: Timestamp.fromDate(nyeEventDate),
    startTime: '8:00 PM',
    endTime: '1:00 AM',
    location: 'Merkaba Venue',
    price: 0, // Free event
    capacity: 500,
    available: true,
    isRSVP: true, // Free RSVP event - phone number only required
    category: 'Performance',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    features: ['Live performances', 'DJ sets', 'Champagne toast', 'Food & drinks'],
    popularity: 95,
    rating: 4.9,
    reviews: 45,
    phoneOnlyRSVP: true // Only phone number required for this event
  }
];

async function seedData() {
  try {
    console.log('🌱 Starting to seed services and events...\n');

    // Seed services
    console.log('📦 Seeding services...');
    for (const service of services) {
      try {
        const docRef = await addDoc(collection(db, 'services'), {
          ...service,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        console.log(`✅ Created service: ${service.name} (ID: ${docRef.id})`);
      } catch (error) {
        console.error(`❌ Error creating service ${service.name}:`, error.message);
      }
    }

    // Seed events
    console.log('\n🎉 Seeding events...');
    for (const event of events) {
      try {
        const docRef = await addDoc(collection(db, 'events'), {
          ...event,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
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

