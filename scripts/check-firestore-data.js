// scripts/check-firestore-data.js
// Script to check if services and events exist in Firestore

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
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

async function checkData() {
  try {
    console.log('🔍 Checking Firestore for services and events...\n');

    // Check services
    console.log('📦 Checking services collection...');
    try {
      const servicesQuery = query(
        collection(db, 'services'),
        where('available', '==', true),
        orderBy('popularity', 'desc'),
        limit(50)
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      console.log(`   ✅ Found ${servicesSnapshot.size} services`);
      servicesSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`      - ${data.name} (ID: ${doc.id})`);
      });
    } catch (error) {
      console.error(`   ❌ Error querying services:`, error.message);
      if (error.code === 'failed-precondition') {
        console.error('      ⚠️ Index required! Go to: https://console.firebase.google.com/project/m1alive/firestore/indexes');
      }
      
      // Try simple query without orderBy
      console.log('   🔄 Trying simple query (without orderBy)...');
      try {
        const simpleQuery = query(
          collection(db, 'services'),
          where('available', '==', true),
          limit(50)
        );
        const simpleSnapshot = await getDocs(simpleQuery);
        console.log(`   ✅ Found ${simpleSnapshot.size} services (simple query)`);
        simpleSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`      - ${data.name} (ID: ${doc.id})`);
        });
      } catch (simpleError) {
        console.error(`   ❌ Simple query also failed:`, simpleError.message);
      }
    }

    // Check events
    console.log('\n🎉 Checking events collection...');
    try {
      const { Timestamp } = await import('firebase/firestore');
      const now = Timestamp.now();
      const eventsQuery = query(
        collection(db, 'events'),
        where('eventDate', '>=', now),
        orderBy('eventDate', 'asc'),
        limit(20)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      console.log(`   ✅ Found ${eventsSnapshot.size} events`);
      eventsSnapshot.forEach((doc) => {
        const data = doc.data();
        const eventDate = data.eventDate?.toDate?.() || data.eventDate;
        console.log(`      - ${data.name} (ID: ${doc.id})`);
        console.log(`        Date: ${eventDate}`);
      });
    } catch (error) {
      console.error(`   ❌ Error querying events:`, error.message);
      if (error.code === 'failed-precondition') {
        console.error('      ⚠️ Index required! Go to: https://console.firebase.google.com/project/m1alive/firestore/indexes');
      }
      
      // Try simple query
      console.log('   🔄 Trying simple query (without orderBy)...');
      try {
        const { Timestamp } = await import('firebase/firestore');
        const now = Timestamp.now();
        const simpleQuery = query(
          collection(db, 'events'),
          where('eventDate', '>=', now),
          limit(20)
        );
        const simpleSnapshot = await getDocs(simpleQuery);
        console.log(`   ✅ Found ${simpleSnapshot.size} events (simple query)`);
        simpleSnapshot.forEach((doc) => {
          const data = doc.data();
          const eventDate = data.eventDate?.toDate?.() || data.eventDate;
          console.log(`      - ${data.name} (ID: ${doc.id})`);
          console.log(`        Date: ${eventDate}`);
        });
      } catch (simpleError) {
        console.error(`   ❌ Simple query also failed:`, simpleError.message);
      }
    }

    // Check all documents (no filters)
    console.log('\n📋 Checking all documents (no filters)...');
    try {
      const allServicesSnapshot = await getDocs(collection(db, 'services'));
      console.log(`   Services collection: ${allServicesSnapshot.size} total documents`);
      if (allServicesSnapshot.size === 0) {
        console.log('   ⚠️ NO SERVICES FOUND! You need to add them to Firestore.');
        console.log('   👉 Go to: https://console.firebase.google.com/project/m1alive/firestore/data');
        console.log('   👉 Follow: ADD_DATA_NOW.md');
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }

    try {
      const allEventsSnapshot = await getDocs(collection(db, 'events'));
      console.log(`   Events collection: ${allEventsSnapshot.size} total documents`);
      if (allEventsSnapshot.size === 0) {
        console.log('   ⚠️ NO EVENTS FOUND! You need to add them to Firestore.');
        console.log('   👉 Go to: https://console.firebase.google.com/project/m1alive/firestore/data');
        console.log('   👉 Follow: ADD_DATA_NOW.md');
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }

    console.log('\n✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

checkData().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

