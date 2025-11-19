// scripts/activate-services.js
// Activate existing services in Firestore by setting available: true

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
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

async function activateServices() {
  try {
    console.log('🔍 Finding all services in Firestore...\n');
    
    // Get all services (no filters)
    const servicesSnapshot = await getDocs(collection(db, 'services'));
    console.log(`Found ${servicesSnapshot.size} services\n`);
    
    if (servicesSnapshot.size === 0) {
      console.log('❌ No services found in Firestore!');
      console.log('👉 You need to add services first. See ADD_DATA_NOW.md');
      return;
    }
    
    let activated = 0;
    let alreadyActive = 0;
    let needsPopularity = 0;
    
    for (const docSnap of servicesSnapshot.docs) {
      const data = docSnap.data();
      const serviceId = docSnap.id;
      const serviceName = data.name || 'Unnamed Service';
      
      console.log(`📦 ${serviceName} (ID: ${serviceId})`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Check and set available
      if (data.available !== true) {
        updates.available = true;
        needsUpdate = true;
        console.log(`   ✅ Setting available: true`);
      } else {
        console.log(`   ✓ Already available`);
        alreadyActive++;
      }
      
      // Check and set popularity (required for sorting)
      if (!data.popularity || typeof data.popularity !== 'number') {
        updates.popularity = data.popularity || 50; // Default to 50 if missing
        needsUpdate = true;
        needsPopularity++;
        console.log(`   ✅ Setting popularity: ${updates.popularity}`);
      } else {
        console.log(`   ✓ Popularity: ${data.popularity}`);
      }
      
      // Update if needed
      if (needsUpdate) {
        try {
          await updateDoc(doc(db, 'services', serviceId), updates);
          console.log(`   ✅ Updated successfully!\n`);
          activated++;
        } catch (error) {
          console.error(`   ❌ Error updating: ${error.message}\n`);
        }
      } else {
        console.log(`   ✓ No updates needed\n`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   - Total services: ${servicesSnapshot.size}`);
    console.log(`   - Activated/Updated: ${activated}`);
    console.log(`   - Already active: ${alreadyActive}`);
    if (needsPopularity > 0) {
      console.log(`   - Added popularity field: ${needsPopularity}`);
    }
    
    console.log('\n✅ Activation complete!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Refresh your app');
    console.log('   2. Go to ExploreScreen → Services tab');
    console.log('   3. Services should now be visible!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'permission-denied') {
      console.error('\n⚠️ Permission denied!');
      console.error('   Make sure Firestore rules allow updates to services collection.');
      console.error('   Rules should allow: allow update: if request.auth != null;');
    }
  }
}

activateServices().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

