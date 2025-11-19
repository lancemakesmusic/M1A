// scripts/add-services-events-now.js
// Automated script to add services and events to Firestore
// Uses Firebase client SDK with email/password authentication

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

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
const auth = getAuth(app);

// Create readline interface for password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

const services = [
  {
    name: 'Recording Time',
    description: 'Professional recording studio time. 10 hours for $200 - Special Deal!',
    price: 200,
    duration: 10,
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

// NYE Event - December 31, 2025, 8:00 PM
const nyeEventDate = new Date('2025-12-31T20:00:00');
const events = [
  {
    name: 'New Year\'s Eve Celebration',
    description: 'Ring in the New Year with live music, performances, and celebration! Join us for an unforgettable night.',
    eventDate: Timestamp.fromDate(nyeEventDate),
    startTime: '8:00 PM',
    endTime: '1:00 AM',
    location: 'Merkaba Venue',
    address: '123 Main Street, Your City',
    price: 50,
    capacity: 500,
    available: true,
    isRSVP: false,
    category: 'Performance',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    features: ['Live performances', 'DJ sets', 'Champagne toast', 'Food & drinks', 'VIP options available'],
    popularity: 95,
    rating: 4.9,
    reviews: 45,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    name: 'Holiday Showcase',
    description: 'Special holiday showcase featuring local artists',
    eventDate: Timestamp.fromDate(new Date('2025-12-20T19:00:00')),
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

async function addData() {
  try {
    console.log('🌱 Adding Services and Events to Firestore...\n');

    // Authenticate
    console.log('🔐 Authentication required to add data...');
    const email = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'brogdon.lance@gmail.com';
    console.log(`   Using email: ${email}`);
    
    // Try to get password from environment or prompt
    let password = process.env.FIREBASE_ADMIN_PASSWORD;
    if (!password) {
      password = await question('Enter your Firebase password: ');
    }
    
    if (!password || password.trim() === '') {
      throw new Error('Password is required. Set FIREBASE_ADMIN_PASSWORD in .env or enter it when prompted.');
    }
    
    console.log('\n⏳ Signing in...');
    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated successfully!\n');

    // Add services
    console.log('📦 Adding services...');
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

    // Add events
    console.log('\n🎉 Adding events...');
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

    console.log('\n✅ Complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   - ${servicesAdded}/${services.length} services added`);
    console.log(`   - ${eventsAdded}/${events.length} events added`);
    console.log('\n🎯 Next steps:');
    console.log('   1. Open your app and go to ExploreScreen');
    console.log('   2. Services should appear in "Services" tab');
    console.log('   3. Events (including NYE) should appear in "Events" tab');
    console.log('   4. Test booking flow by clicking on a service or event');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      console.error('   Authentication failed. Please check your email and password.');
    } else if (error.code === 'permission-denied') {
      console.error('   Permission denied. Make sure Firestore rules allow authenticated users to create documents.');
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

addData().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

