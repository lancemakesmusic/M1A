// firebase.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { CACHE_SIZE_UNLIMITED, initializeFirestore } from 'firebase/firestore';

// ——— your Firebase Web app config for “m1alive” ———
const firebaseConfig = {
  apiKey: "AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ",
  authDomain: "m1alive.firebaseapp.com",
  projectId: "m1alive",
  storageBucket: "m1alive.appspot.com",
  messagingSenderId: "83002254287",
  appId: "1:83002254287:web:b802e1e040cb51494668ba"
};

// initialize the Firebase App
const app = initializeApp(firebaseConfig);

// set up Auth to persist in AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// set up Firestore with long-polling (fixes WebChannel errors) and unlimited cache
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// optional sanity check
console.log('🐻 Firebase initialized for project:', getApp().options.projectId);
