// scripts/restore-all-authenticated.js
// Authenticated script to restore all services and events

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import readlineSync from 'readline-sync';

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
const auth = getAuth(app);

// All 10 services
const services = [
  {
    name: 'Recording Time',
    description: 'Professional studio recording time. Special deal: 10 hours for $200 (save $300!).',
    price: 200,
    duration: 10,
    category: 'Recording',
    subcategory: 'Audio Production',
    available: true,
    popularity: 98,
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800',
    location: 'Merkaba Studios',
    rating: 5.0,
    reviews: 24,
    artist: 'Merkaba Entertainment',
    isDeal: true,
    dealHours: 10,
    dealPrice: 200,
    regularPrice: 500,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Vocal Recording',
    description: 'Elevate your sound with our industry-quality vocal recording service, complete with final mix and mastering options.',
    price: 50,
    duration: 1,
    category: 'Services',
    subcategory: 'Audio Production',
    available: true,
    popularity: 95,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop&q=80',
    location: 'Merkaba Studios',
    rating: 4.9,
    reviews: 18,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Music Production',
    description: 'Full music production services including mixing and mastering',
    price: 500,
    duration: 8,
    category: 'Production',
    subcategory: 'Audio Production',
    available: true,
    popularity: 85,
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    location: 'Merkaba Studios',
    rating: 4.9,
    reviews: 18,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Photography',
    description: 'Capture your most precious moments with our high-quality photography services tailored to meet your individual needs.',
    price: 150,
    duration: 1,
    category: 'Services',
    subcategory: 'Photography',
    available: true,
    popularity: 92,
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80',
    location: 'On-site',
    rating: 4.8,
    reviews: 32,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Event Photography',
    description: 'Professional event photography services',
    price: 300,
    duration: 4,
    category: 'Photography',
    subcategory: 'Photography',
    available: true,
    popularity: 75,
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800',
    location: 'On-site',
    rating: 4.7,
    reviews: 32,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Videography',
    description: 'Experience top-tier videography services tailored to your unique event needs.',
    price: 500,
    duration: 3,
    category: 'Services',
    subcategory: 'Video Production',
    available: true,
    popularity: 94,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=800&fit=crop&q=80',
    location: 'On-site',
    rating: 4.9,
    reviews: 15,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Video Production',
    description: 'Professional video production for events and performances',
    price: 800,
    duration: 6,
    category: 'Video',
    subcategory: 'Video Production',
    available: true,
    popularity: 70,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    location: 'On-site',
    rating: 4.8,
    reviews: 15,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Graphic Design',
    description: 'Elevate your brand with our high-quality custom graphic design service.',
    price: 50,
    duration: 0.5,
    category: 'Services',
    subcategory: 'Design',
    available: true,
    popularity: 88,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&q=80',
    location: 'Remote',
    rating: 4.8,
    reviews: 20,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Website Development',
    description: 'Experience a tailored website development service designed to enhance user experience and drive traffic.',
    price: 250,
    duration: 0.5,
    category: 'Services',
    subcategory: 'Web Development',
    available: true,
    popularity: 90,
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop&q=80',
    location: 'Remote',
    rating: 4.9,
    reviews: 12,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Live Sound Engineering',
    description: 'Professional live sound engineering for events',
    price: 400,
    duration: 5,
    category: 'Sound',
    subcategory: 'Sound Engineering',
    available: true,
    popularity: 65,
    image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
    location: 'On-site',
    rating: 4.6,
    reviews: 20,
    artist: 'Merkaba Entertainment',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

// NYE Event
const nyeEventDate = new Date('2025-12-31T20:00:00');
const events = [
  {
    name: 'New Year\'s Eve Celebration',
    description: 'Ring in the New Year with live music, performances, and celebration! Free RSVP event on December 31, 2025.',
    eventDate: Timestamp.fromDate(nyeEventDate),
    startTime: '8:00 PM',
    endTime: '1:00 AM',
    location: 'Merkaba Venue',
    address: '123 Main Street, Your City',
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
    phoneOnlyRSVP: true, // Only phone number required for this event
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function restoreAll() {
  try {
    console.log('🔄 Restoring All Services and Events to Firestore...\n');

    // Authenticate
    console.log('🔐 Authentication Required\n');
    console.log('   (Use the email/password you use to log into the M1A app)');
    console.log('   (Based on app logs, your email might be: brogdon.lance@gmail.com)\n');
    
    const defaultEmail = 'brogdon.lance@gmail.com';
    const emailInput = readlineSync.question(`   Enter your email [${defaultEmail}]: `);
    const email = emailInput.trim() || defaultEmail;
    
    console.log(`   Using email: ${email}\n`);
    
    const password = readlineSync.question('   Enter your Firebase password: ', {
      hideEchoBack: true
    });
    
    if (!password || password.trim() === '') {
      throw new Error('Password is required');
    }
    
    console.log('\n⏳ Signing in...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated successfully!\n');

    // Restore services
    console.log('📦 Restoring services...');
    let servicesAdded = 0;
    for (const service of services) {
      try {
        const docRef = await addDoc(collection(db, 'services'), service);
        console.log(`   ✅ ${service.name} (ID: ${docRef.id})`);
        servicesAdded++;
      } catch (error) {
        console.error(`   ❌ Error adding ${service.name}:`, error.message);
      }
    }

    // Restore events
    console.log('\n🎉 Restoring events...');
    let eventsAdded = 0;
    for (const event of events) {
      try {
        const docRef = await addDoc(collection(db, 'events'), event);
        console.log(`   ✅ ${event.name} (ID: ${docRef.id})`);
        if (event.name.includes('New Year')) {
          console.log(`      🎊 Date: ${nyeEventDate.toLocaleDateString()} at ${event.startTime}`);
        }
        eventsAdded++;
      } catch (error) {
        console.error(`   ❌ Error adding ${event.name}:`, error.message);
      }
    }

    console.log('\n✅ Restoration Complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - ${servicesAdded}/${services.length} services restored`);
    console.log(`   - ${eventsAdded}/${events.length} events restored`);
    
    if (servicesAdded > 0 || eventsAdded > 0) {
      console.log('\n🎯 Next steps:');
      console.log('   1. Refresh your app');
      console.log('   2. Go to ExploreScreen → Services tab');
      console.log('   3. All services should now be visible!');
      console.log('   4. Go to Events tab → NYE event should be visible!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      console.error('   Authentication failed. Please check your email and password.');
    } else if (error.code === 'permission-denied') {
      console.error('   Permission denied. Firestore rules may need updating.');
    }
  }
}

restoreAll().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

