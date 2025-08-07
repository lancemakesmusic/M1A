// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ",
  authDomain: "m1alive.firebaseapp.com",
  projectId: "m1alive",
  storageBucket: "m1alive.appspot.com",
  messagingSenderId: "83002254287",
  appId: "1:83002254287:web:defaultAppIdIfGiven" // Replace with actual App ID if listed
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
