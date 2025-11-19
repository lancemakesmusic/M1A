// Debug Firebase Authentication and Permissions
import { auth, db } from './firebase.js';

export const debugFirebaseAuth = async () => {
  console.log('🔍 Firebase Debug Information:');
  console.log('================================');
  
  // Check authentication state
  console.log('1. Auth State:', auth.currentUser ? 'Authenticated' : 'Not Authenticated');
  console.log('2. User UID:', auth.currentUser?.uid || 'No UID');
  console.log('3. User Email:', auth.currentUser?.email || 'No Email');
  console.log('4. Auth Token:', auth.currentUser ? 'Token Available' : 'No Token');
  
  // Test Firestore read (real Firestore)
  if (auth.currentUser) {
    try {
      console.log('5. Testing Firestore Read...');
      const { doc, getDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      console.log('   - Document exists:', userSnap.exists());
      console.log('   - Document data:', userSnap.data());
    } catch (error) {
      console.log('   - Firestore Error:', error.message);
      console.log('   - Error Code:', error.code);
    }
  }
  
  // Test Firestore write (real Firestore)
  if (auth.currentUser) {
    try {
      console.log('6. Testing Firestore Write...');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const testRef = doc(db, 'test', 'debug');
      await setDoc(testRef, { 
        test: true, 
        timestamp: serverTimestamp(),
        uid: auth.currentUser.uid 
      });
      console.log('   - Write successful');
    } catch (error) {
      console.log('   - Write Error:', error.message);
      console.log('   - Error Code:', error.code);
    }
  }
  
  console.log('================================');
};
