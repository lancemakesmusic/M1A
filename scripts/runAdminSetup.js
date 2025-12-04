/**
 * Run Admin Setup Script
 * This script can be run directly to set up admin@merkabaent.com as admin
 * 
 * Usage: node scripts/runAdminSetup.js
 * Or import and call in your app
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase config - you'll need to import from your firebase.js or provide config
// For now, this will be run in the app context where firebase is already initialized

/**
 * Set up admin account
 * This function can be called from your app or run as a script
 */
export async function runAdminSetup(email = 'admin@merkabaent.com') {
  try {
    console.log('🚀 Starting admin setup for:', email);
    
    // Import firebase from your app
    const { db } = await import('../firebase.js');
    
    if (!db) {
      throw new Error('Firebase not initialized. Make sure firebase.js exports db.');
    }

    // Find user by email
    console.log('📧 Searching for user with email:', email);
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      console.error('❌ User not found!');
      console.log('\n📝 Instructions:');
      console.log('1. Make sure the user has signed up at least once');
      console.log('2. Or create the user document manually in Firestore');
      console.log('3. Then run this script again');
      throw new Error(`User with email ${email} not found in Firestore. Please ensure the user has signed up.`);
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log('✅ User found:', userId);
    console.log('📊 Current role:', userData.role || 'client');

    // Check if already admin
    if (userData.role === 'admin' || userData.role === 'master_admin') {
      console.log(`✅ User is already ${userData.role}`);
      return {
        success: true,
        userId,
        email,
        role: userData.role,
        message: `User is already ${userData.role}`,
      };
    }

    // Set as admin
    console.log('🔧 Updating user to admin role...');
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

    await updateDoc(doc(db, 'users', userId), updateData);

    console.log('✅ Successfully set', email, 'as admin!');
    console.log('\n🎉 Setup complete!');
    console.log('The user can now:');
    console.log('- Access Admin Tools in Settings');
    console.log('- Manage users and upgrade them to employee');
    console.log('- Revoke employee roles');
    
    return {
      success: true,
      userId,
      email,
      role: 'admin',
      message: `User ${email} has been set as admin`,
    };
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    throw error;
  }
}

// If running as a script directly
if (typeof window === 'undefined' && require.main === module) {
  // Node.js environment
  runAdminSetup()
    .then((result) => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}

export default runAdminSetup;




