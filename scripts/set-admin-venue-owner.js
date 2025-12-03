/**
 * Script to set admin@merkabaent.com as venue owner
 * This ensures the admin account has the correct persona
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export async function setAdminAsVenueOwner() {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser || currentUser.email !== 'admin@merkabaent.com') {
      console.log('⚠️ This script should be run by admin@merkabaent.com');
      return;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('❌ User document not found');
      return;
    }

    const userData = userDoc.data();
    
    // Check if already set as venue owner
    if (userData.category === 'venue_owner' && userData.role === 'admin') {
      console.log('✅ admin@merkabaent.com is already set as venue owner and admin');
      return;
    }

    // Update to venue owner
    await updateDoc(userRef, {
      category: 'venue_owner',
      categoryTitle: 'Venue Owner',
      categoryUpdatedAt: new Date().toISOString(),
      role: 'admin',
      roleUpdatedAt: new Date().toISOString(),
    });

    console.log('✅ Successfully set admin@merkabaent.com as venue owner');
  } catch (error) {
    console.error('❌ Error setting admin as venue owner:', error);
    throw error;
  }
}

