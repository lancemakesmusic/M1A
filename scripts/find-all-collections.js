// scripts/find-all-collections.js
// Find all collections and documents in Firestore

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';

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

// Common collection names to check
const collectionsToCheck = [
  'services',
  'service',
  'Services',
  'Service',
  'items',
  'products',
  'listings'
];

async function findCollections() {
  try {
    console.log('🔍 Searching for services in Firestore...\n');
    
    for (const collectionName of collectionsToCheck) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.size > 0) {
          console.log(`✅ Found collection: "${collectionName}" (${snapshot.size} documents)`);
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`   - ${data.name || data.title || 'Unnamed'} (ID: ${doc.id})`);
            console.log(`     available: ${data.available ?? 'MISSING'}`);
            console.log(`     popularity: ${data.popularity ?? 'MISSING'}`);
          });
          console.log('');
        }
      } catch (error) {
        // Collection doesn't exist or permission denied
        if (error.code !== 'permission-denied') {
          // Silently skip non-existent collections
        }
      }
    }
    
    // Also check what collections exist by trying common ones
    console.log('\n📋 Checking common collections:');
    const commonCollections = ['users', 'events', 'posts', 'services', 'conversations'];
    for (const colName of commonCollections) {
      try {
        const snapshot = await getDocs(collection(db, colName));
        console.log(`   ${colName}: ${snapshot.size} documents`);
      } catch (error) {
        console.log(`   ${colName}: Error - ${error.code || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findCollections().then(() => {
  console.log('\n💡 Tip: If services exist but aren\'t showing, they might be:');
  console.log('   1. In a different collection name');
  console.log('   2. Missing the "available: true" field');
  console.log('   3. Missing the "popularity" field (required for sorting)');
  console.log('\n👉 Check Firebase Console: https://console.firebase.google.com/project/m1alive/firestore/data');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

