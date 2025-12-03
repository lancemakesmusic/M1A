/**
 * Setup Admin Account Script
 * Sets admin@merkabaent.com as the first admin account
 * 
 * Run this from your app or Firebase Console
 */

import { doc, getDoc, updateDoc, setDoc, query, where, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Set user as admin by email
 * @param {string} email - User email (default: admin@merkabaent.com)
 * @returns {Promise<Object>} Result
 */
export async function setupAdminAccount(email = 'admin@merkabaent.com') {
  try {
    console.log(`🔧 Setting up admin account: ${email}`);

    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      throw new Error(
        `User with email ${email} not found in Firestore. ` +
        `Please make sure the user has signed up at least once, or create the user document manually.`
      );
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

    // Update user document
    await updateDoc(doc(db, 'users', userId), updateData);

    console.log(`✅ Successfully set ${email} as admin`);
    return {
      success: true,
      userId,
      email,
      role: 'admin',
      message: `User ${email} has been set as admin`,
    };
  } catch (error) {
    console.error('❌ Error setting up admin account:', error);
    throw error;
  }
}

/**
 * Manual setup instructions for Firebase Console
 */
export const MANUAL_SETUP_INSTRUCTIONS = `
═══════════════════════════════════════════════════════════════
MANUAL SETUP: Set admin@merkabaent.com as Admin
═══════════════════════════════════════════════════════════════

Option 1: Firebase Console (Recommended)
─────────────────────────────────────────
1. Go to Firebase Console → Firestore Database
2. Navigate to 'users' collection
3. Find the document for admin@merkabaent.com
   (Search by email field or find by user ID)
4. Click "Edit document"
5. Add/update these fields:
   
   Field: role
   Value: "admin"
   
   Field: adminInfo (Map)
   - adminId: "{userId}"
   - department: "Management"
   - assignedDate: {current timestamp}
   - status: "active"
   - createdBy: "system"
   - isFirstAdmin: true
   
   Field: roleUpdatedAt
   Value: {current timestamp}
   
   Field: roleUpdatedBy
   Value: "system"

6. Click "Update"

Option 2: Use this script in your app
──────────────────────────────────────
import { setupAdminAccount } from './scripts/setupAdminAccount';

// In a component or function
await setupAdminAccount('admin@merkabaent.com');

Option 3: Firebase CLI
──────────────────────
firebase firestore:set users/{userId} '{
  "role": "admin",
  "adminInfo": {
    "adminId": "{userId}",
    "department": "Management",
    "assignedDate": {timestamp},
    "status": "active",
    "createdBy": "system",
    "isFirstAdmin": true
  },
  "roleUpdatedAt": {timestamp},
  "roleUpdatedBy": "system"
}'
`;

// Export for use in app
export default {
  setupAdminAccount,
  MANUAL_SETUP_INSTRUCTIONS,
};


