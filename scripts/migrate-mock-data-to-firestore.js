/**
 * Migration Script: Mock Data to Firestore
 * 
 * This script migrates all mock data to Firestore collections.
 * Run this once after setting up real Firebase to populate your database.
 * 
 * Usage:
 * 1. Configure real Firebase credentials in .env file
 * 2. Run: node scripts/migrate-mock-data-to-firestore.js
 */

import { initializeApp } from 'firebase/app';
import { addDoc, collection, getFirestore } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually (since we're using ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

let envVars = {};
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        envVars[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes
      }
    }
  });
  console.log('✅ Loaded .env file');
} catch (error) {
  console.warn('⚠️  Could not load .env file, using environment variables or defaults');
}

// Merge with process.env (process.env takes precedence)
const getEnv = (key) => process.env[key] || envVars[key];

// Firebase config - use same as in firebase.js
const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY') || "YOUR_API_KEY",
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN') || "YOUR_AUTH_DOMAIN",
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID') || "YOUR_PROJECT_ID",
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET') || "YOUR_STORAGE_BUCKET",
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || "YOUR_SENDER_ID",
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID') || "YOUR_APP_ID"
};

// Validate config
if (firebaseConfig.projectId === "YOUR_PROJECT_ID" || !firebaseConfig.projectId) {
  console.error('❌ ERROR: Firebase configuration not found!');
  console.error('Please set Firebase credentials in .env file:');
  console.error('  EXPO_PUBLIC_FIREBASE_API_KEY=...');
  console.error('  EXPO_PUBLIC_FIREBASE_PROJECT_ID=...');
  console.error('  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...');
  console.error('  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...');
  console.error('  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...');
  console.error('  EXPO_PUBLIC_FIREBASE_APP_ID=...');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Services data (from ExploreScreen.js)
const services = [
  {
    name: 'Vocal Recording',
    description: 'Elevate your sound with our industry-quality vocal recording service, complete with final mix and mastering options. Book your session today to experience professional-grade audio production tailored to your unique style.',
    price: 50,
    category: 'Services',
    subcategory: 'Audio Production',
    rating: 4.9,
    popularity: 95,
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: '1 hr+',
    available: true,
  },
  {
    name: 'Photography',
    description: 'Capture your most precious moments with our high-quality photography services tailored to meet your individual needs. Book your appointment today to secure stunning images that will last a lifetime.',
    price: 150,
    category: 'Services',
    subcategory: 'Photography',
    rating: 4.8,
    popularity: 92,
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: '1 hr+',
    available: true,
  },
  {
    name: 'Videography',
    description: 'Experience top-tier videography services tailored to your unique event needs. Book now to capture your special moments with professional quality and expertise.',
    price: 500,
    category: 'Services',
    subcategory: 'Video Production',
    rating: 4.9,
    popularity: 94,
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: '3 hrs+',
    available: true,
  },
  {
    name: 'Graphic Design',
    description: 'Elevate your brand with our high-quality custom graphic design service. Our expert designers will work closely with you to bring your vision to life, ensuring a professional and tailored result that truly represents your unique style and message.',
    price: 50,
    category: 'Services',
    subcategory: 'Design',
    rating: 4.8,
    popularity: 88,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: '30 mins',
    available: true,
  },
  {
    name: 'Website Development',
    description: 'Experience a tailored website development service designed to enhance user experience, drive traffic, and boost conversions. Book your appointment now to elevate your online presence!',
    price: 250,
    category: 'Services',
    subcategory: 'Web Development',
    rating: 4.9,
    popularity: 90,
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: '30 mins',
    available: true,
  },
  {
    name: 'Auto Poster',
    description: 'AI-powered content generation and social media scheduling',
    price: 50,
    category: 'Services',
    subcategory: 'Digital Marketing',
    rating: 4.9,
    popularity: 96,
    image: 'https://images.unsplash.com/photo-1524820197278-540916411e20?w=800&h=800&fit=crop&q=80',
    artist: 'AI Content Studio',
    duration: 'Instant',
    available: true,
    isAutoPoster: true,
  },
];

// Events data
const events = [
  {
    name: 'NYE 2026 RSVP',
    description: 'Ring in the New Year with Merkaba Entertainment! Join us for an unforgettable New Year\'s Eve celebration. Formal attire dress code required. RSVP required - select your persona to continue.',
    price: 0,
    category: 'Events',
    subcategory: 'New Year\'s Eve',
    rating: 5.0,
    popularity: 100,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop&q=80',
    artist: 'Merkaba Entertainment',
    duration: 'Dec 31, 2026',
    eventDate: new Date('2026-12-31'),
    isRSVP: true,
    requiresPersona: true,
    dressCode: 'Formal Attire Required',
    available: true,
  },
];

// Bar menu items
const barMenuItems = [
  // MIXED DRINKS
  { name: 'Margarita', description: 'Classic margarita cocktail', price: 12, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', popular: true, available: true },
  { name: 'Green Tea Shot', description: 'Refreshing green tea shot', price: 6, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', available: true },
  { name: 'White Tea Shot', description: 'Smooth white tea shot', price: 6, category: 'Mixed Drinks', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=400&fit=crop', available: true },
  
  // SPIRITS
  { name: 'Buffalo Trace Bourbon', description: 'Premium bourbon whiskey', price: 9, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Jameson', description: 'Irish whiskey', price: 9, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Jack Daniel\'s', description: 'Tennessee whiskey', price: 8, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Espolon', description: 'Premium tequila', price: 8, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Tito\'s', description: 'Handmade vodka', price: 7, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Jose Cuervo', description: 'Classic tequila', price: 7, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  { name: 'Vodka / Whiskey / Tequila', description: 'House well spirits', price: 5, category: 'Spirits', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=400&fit=crop', available: true },
  
  // BEER
  { name: 'Dos Equis', description: 'Mexican lager', price: 6, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
  { name: 'Michelob Ultra', description: 'Light beer', price: 7, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
  { name: 'Modelo', description: 'Mexican beer', price: 7, category: 'Beer', image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=400&fit=crop', available: true },
  
  // MIXERS
  { name: 'Coca Cola', description: 'Mixer - additional charge', price: 1, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
  { name: 'Sprite', description: 'Mixer - additional charge', price: 1, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
  { name: 'Redbull', description: 'Energy drink mixer - additional charge', price: 3, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
  { name: 'Orange Juice', description: 'Mixer - additional charge', price: 1, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
  { name: 'Cranberry Juice', description: 'Mixer - additional charge', price: 1, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
  { name: 'Club Soda', description: 'Mixer - additional charge', price: 1, category: 'Mixers', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop', available: true, isMixer: true },
];

async function migrateData() {
  console.log('🚀 Starting data migration to Firestore...\n');
  console.log(`📋 Using Firebase project: ${firebaseConfig.projectId}\n`);

  try {
    // Migrate Services
    console.log('📦 Migrating services...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const service of services) {
      try {
        await addDoc(collection(db, 'services'), {
          ...service,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to migrate service "${service.name}":`, error.message);
        if (error.code === 'permission-denied') {
          console.error('  ⚠️  Permission denied! Make sure Firestore is in test mode or security rules allow writes.');
        }
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ Migrated ${successCount} services`);
    }
    if (errorCount > 0) {
      console.log(`❌ Failed to migrate ${errorCount} services\n`);
    } else {
      console.log('');
    }

    // Migrate Events
    console.log('📅 Migrating events...');
    successCount = 0;
    errorCount = 0;
    
    for (const event of events) {
      try {
        await addDoc(collection(db, 'events'), {
          ...event,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to migrate event "${event.name}":`, error.message);
        if (error.code === 'permission-denied') {
          console.error('  ⚠️  Permission denied! Make sure Firestore is in test mode or security rules allow writes.');
        }
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ Migrated ${successCount} events`);
    }
    if (errorCount > 0) {
      console.log(`❌ Failed to migrate ${errorCount} events\n`);
    } else {
      console.log('');
    }

    // Migrate Bar Menu Items
    console.log('🍹 Migrating bar menu items...');
    successCount = 0;
    errorCount = 0;
    
    for (const item of barMenuItems) {
      try {
        await addDoc(collection(db, 'barMenuItems'), {
          ...item,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`  ❌ Failed to migrate item "${item.name}":`, error.message);
        if (error.code === 'permission-denied') {
          console.error('  ⚠️  Permission denied! Make sure Firestore is in test mode or security rules allow writes.');
        }
      }
    }
    
    if (successCount > 0) {
      console.log(`✅ Migrated ${successCount} bar menu items`);
    }
    if (errorCount > 0) {
      console.log(`❌ Failed to migrate ${errorCount} bar menu items\n`);
    } else {
      console.log('');
    }

    console.log('🎉 Migration complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Services: ${services.length}`);
    console.log(`   - Events: ${events.length}`);
    console.log(`   - Bar Menu Items: ${barMenuItems.length}`);
    console.log('\n💡 Your app will now load real data from Firestore!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateData().then(() => {
  console.log('\n✅ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

