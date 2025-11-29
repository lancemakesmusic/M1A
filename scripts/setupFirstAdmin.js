/**
 * Setup First Admin Script
 * Sets admin@merkabaent.com as the first admin account
 * 
 * Usage:
 * 1. Make sure admin@merkabaent.com user exists in Firebase Auth
 * 2. Run this script or manually set role in Firestore
 */

import { doc, getDoc, setDoc, updateDoc, query, where, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Set user as admin by email
 * @param {string} email - User email
 * @returns {Promise<Object>} Result
 */
export async function setupFirstAdmin(email = 'admin@merkabaent.com') {
  try {
    console.log(`🔧 Setting up first admin: ${email}`);

    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      throw new Error(`User with email ${email} not found. Please create the user account first.`);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    // Check if already admin
    if (userData.role === 'admin' || userData.role === 'master_admin') {
      console.log(`✅ User ${email} is already ${userData.role}`);
      return {
        success: true,
        userId,
        email,
        role: userData.role,
        message: `User is already ${userData.role}`,
      };
    }

    // Set as admin
    const updateData = {
      role: 'admin',
      roleUpdatedAt: serverTimestamp(),
      roleUpdatedBy: 'system',
      adminInfo: {
        adminId: userId,
        department: 'Management',
        assignedDate: serverTimestamp(),
        status: 'active',
        createdBy: 'system',
        isFirstAdmin: true,
      },
    };

    // If user doc exists, update it
    if (userDoc.exists()) {
      await updateDoc(doc(db, 'users', userId), updateData);
    } else {
      // Create new user doc with admin role
      await setDoc(doc(db, 'users', userId), {
        email,
        displayName: userData.displayName || 'Admin',
        role: 'admin',
        createdAt: new Date(),
        ...updateData,
      });
    }

    console.log(`✅ Successfully set ${email} as admin`);
    return {
      success: true,
      userId,
      email,
      role: 'admin',
      message: `User ${email} has been set as admin`,
    };
  } catch (error) {
    console.error('❌ Error setting up first admin:', error);
    throw error;
  }
}

/**
 * Manual setup instructions
 */
export const MANUAL_SETUP_INSTRUCTIONS = `
To manually set admin@merkabaent.com as admin:

1. Go to Firebase Console → Firestore
2. Navigate to 'users' collection
3. Find the user document for admin@merkabaent.com
4. Add/update the following fields:
   - role: "admin"
   - adminInfo: {
       adminId: "{userId}",
       department: "Management",
       assignedDate: {current timestamp},
       status: "active",
       createdBy: "system",
       isFirstAdmin: true
     }
   - roleUpdatedAt: {current timestamp}
   - roleUpdatedBy: "system"

Or use this script in your app:
import { setupFirstAdmin } from './scripts/setupFirstAdmin';
await setupFirstAdmin('admin@merkabaent.com');
`;

// Export for use in app
export default {
  setupFirstAdmin,
  MANUAL_SETUP_INSTRUCTIONS,
};

