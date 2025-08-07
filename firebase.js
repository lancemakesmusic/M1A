// firebase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ",
  authDomain: "m1a-app.firebaseapp.com",
  projectId: "m1a-app",
  storageBucket: "m1a-app.appspot.com",
  messagingSenderId: "83002254287",
  appId: "1:83002254287:web:b802e1e040cb51494668ba"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Use initializeAuth with AsyncStorage for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ✅ Firestore instance
export const db = getFirestore(app);
