// scripts/check-events-details.js
// Check what events exist and why they're not showing

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

async function checkEvents() {
  try {
    console.log('🔍 Checking all events in Firestore...\n');
    
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    console.log(`Found ${eventsSnapshot.size} events:\n`);
    
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`📅 Event: ${data.name || 'Unnamed'} (ID: ${doc.id})`);
      console.log(`   - eventDate: ${data.eventDate?.toDate?.() || data.eventDate || 'MISSING'}`);
      console.log(`   - available: ${data.available ?? 'MISSING'}`);
      console.log(`   - isRSVP: ${data.isRSVP ?? 'MISSING'}`);
      console.log(`   - category: ${data.category || 'MISSING'}`);
      console.log('');
    });
    
    // Check if any are in the future
    const { Timestamp } = await import('firebase/firestore');
    const now = Timestamp.now();
    console.log(`\n⏰ Current time: ${now.toDate()}`);
    console.log(`\n🔍 Events in the future:`);
    
    let futureCount = 0;
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      const eventDate = data.eventDate;
      if (eventDate) {
        const eventTimestamp = eventDate.toMillis ? Timestamp.fromMillis(eventDate.toMillis()) : eventDate;
        if (eventTimestamp && eventTimestamp.toMillis && eventTimestamp.toMillis() >= now.toMillis()) {
          futureCount++;
          console.log(`   ✅ ${data.name} - ${eventTimestamp.toDate()}`);
        } else {
          console.log(`   ❌ ${data.name} - ${eventTimestamp?.toDate?.() || eventDate} (PAST)`);
        }
      } else {
        console.log(`   ⚠️ ${data.name} - NO DATE`);
      }
    });
    
    console.log(`\n📊 Summary: ${futureCount} future events out of ${eventsSnapshot.size} total`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkEvents().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

