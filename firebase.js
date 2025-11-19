// firebase.js
// Real Firebase implementation - NO MOCK FALLBACKS
// Configure Firebase credentials in .env file or app.json

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword as firebaseCreateUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignIn,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from 'firebase/auth';
import {
  getFirestore
} from 'firebase/firestore';
import {
  getFunctions
} from 'firebase/functions';
import {
  getStorage
} from 'firebase/storage';
import 'react-native-get-random-values';

import * as ImageManipulator from 'expo-image-manipulator';
import { v4 as uuidv4 } from 'uuid';

// Firebase configuration - REQUIRED from environment variables
// Set these in your .env file:
// EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
// EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
// EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
// EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
// EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
// EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Validate Firebase configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  const errorMessage = `❌ FIREBASE CONFIGURATION ERROR: Missing required environment variables:\n${missingFields.map(f => `  - EXPO_PUBLIC_FIREBASE_${f.toUpperCase().replace(/([A-Z])/g, '_$1')}`).join('\n')}\n\nPlease configure Firebase credentials in your .env file or app.json extra section.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Initialize Firebase - REQUIRED, no fallback
let app, auth, db, storage, functions;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error) {
    // Fallback to getAuth if initializeAuth fails (already initialized)
    auth = getAuth(app);
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  console.log('🔥 Real Firebase initialized successfully!');
  console.log('📦 Project:', firebaseConfig.projectId);
} catch (error) {
  const errorMessage = `❌ FIREBASE INITIALIZATION FAILED: ${error.message}\n\nPlease check your Firebase configuration and ensure all credentials are correct.`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

/* ------------------------------------------------------------------ */
/* Authentication Functions                                            */
/* ------------------------------------------------------------------ */
export const signInWithEmailAndPassword = async (email, password) => {
  try {
    const result = await firebaseSignIn(auth, email, password);
    console.log('✅ Firebase sign in successful');
    return result;
  } catch (error) {
    console.error('❌ Firebase sign in failed:', error.message);
    throw error;
  }
};

export const createUserWithEmailAndPassword = async (email, password) => {
  try {
    const result = await firebaseCreateUser(auth, email, password);
    console.log('✅ Firebase user creation successful');
    return result;
  } catch (error) {
    console.error('❌ Firebase user creation failed:', error.message);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    console.log('✅ Firebase sign out successful');
  } catch (error) {
    console.error('❌ Firebase sign out failed:', error.message);
    throw error;
  }
};

export const onAuthStateChanged = (callback) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export const updateProfile = async (user, updates) => {
  try {
    await firebaseUpdateProfile(user, updates);
    console.log('✅ Firebase profile update successful');
  } catch (error) {
    console.error('❌ Firebase profile update failed:', error.message);
    throw error;
  }
};

/* ------------------------------------------------------------------ */
/* Helper Functions                                                    */
/* ------------------------------------------------------------------ */
export const isFirebaseReady = () => {
  // Real Firestore doesn't have a collection method on db
  // Check if db exists and is a Firestore instance (not a mock)
  return auth !== undefined && db !== undefined && typeof db.collection !== 'function';
};

/* ------------------------------------------------------------------ */
/* Core Exports                                                        */
/* ------------------------------------------------------------------ */
export { app, auth, db, functions, storage };

// Helper function for httpsCallable
export const httpsCallable = (functionName) => {
  const { httpsCallable: firebaseHttpsCallable } = require('firebase/functions');
  return firebaseHttpsCallable(functions, functionName);
};

/* ------------------------------------------------------------------ */
/* User profile helpers                                                */
/* ------------------------------------------------------------------ */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  if (!auth.currentUser) {
    console.warn('No authenticated user for getUserProfile');
    return null;
  }
  
  const { doc, getDoc, Timestamp } = await import('firebase/firestore');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  
  const data = snap.data();
  // Convert Firestore Timestamps to numbers for photoUpdatedAt and coverUpdatedAt
  const profile = { id: snap.id, ...data };
  if (data.photoUpdatedAt && data.photoUpdatedAt.toMillis) {
    profile.photoUpdatedAt = data.photoUpdatedAt.toMillis();
  } else if (data.photoUpdatedAt && typeof data.photoUpdatedAt === 'object' && data.photoUpdatedAt.seconds) {
    profile.photoUpdatedAt = data.photoUpdatedAt.seconds * 1000;
  }
  if (data.coverUpdatedAt && data.coverUpdatedAt.toMillis) {
    profile.coverUpdatedAt = data.coverUpdatedAt.toMillis();
  } else if (data.coverUpdatedAt && typeof data.coverUpdatedAt === 'object' && data.coverUpdatedAt.seconds) {
    profile.coverUpdatedAt = data.coverUpdatedAt.seconds * 1000;
  }
  return profile;
};

export const updateUserProfileInDB = async (uid, updates) => {
  if (!uid) return;
  if (!auth.currentUser) {
    console.warn('No authenticated user for updateUserProfileInDB');
    return;
  }
  
  const { doc, updateDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
  const userRef = doc(db, 'users', uid);
  
  // Convert timestamp fields to Firestore Timestamp if they're numbers
  const firestoreUpdates = { ...updates };
  if (firestoreUpdates.photoUpdatedAt && typeof firestoreUpdates.photoUpdatedAt === 'number') {
    firestoreUpdates.photoUpdatedAt = Timestamp.fromMillis(firestoreUpdates.photoUpdatedAt);
  }
  if (firestoreUpdates.coverUpdatedAt && typeof firestoreUpdates.coverUpdatedAt === 'number') {
    firestoreUpdates.coverUpdatedAt = Timestamp.fromMillis(firestoreUpdates.coverUpdatedAt);
  }
  
  await updateDoc(userRef, { 
    ...firestoreUpdates, 
    updatedAt: serverTimestamp() 
  });
  console.log('[Firestore] Profile updated successfully:', Object.keys(updates));
};

export const createUserProfileIfMissing = async (uid, seed = {}) => {
  if (!uid) return null;
  if (!auth.currentUser) {
    console.warn('No authenticated user for createUserProfileIfMissing');
    return null;
  }
  
  const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const defaults = {
      displayName: '',
      username: '',
      bio: '',
      avatarUrl: '',
      coverUrl: '',
      photoURL: '',
      socials: {},
      private: false,
      showOnlineStatus: true,
      allowMessages: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...seed,
    };
    await setDoc(userRef, defaults, { merge: true });
    return { id: uid, ...defaults };
  }
  return { id: snap.id, ...snap.data() };
};

/* ------------------------------------------------------------------ */
/* Upload helpers                                                      */
/* ------------------------------------------------------------------ */
const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10MB

// Resize + compress before upload so it fits rules and is fast
async function compressImageForAvatar(inputUri, maxSize = 1024, quality = 0.8) {
  const actions = [{ resize: { width: maxSize, height: maxSize } }];
  const saveOptions = {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  };
  const { uri } = await ImageManipulator.manipulateAsync(inputUri, actions, saveOptions);
  return { uri, contentType: 'image/jpeg', ext: 'jpg' };
}

/**
 * Upload an image to Firebase Storage and return its download URL.
 * @param {string} uri - Local file URI
 * @param {string} folder - Folder path ('avatars' or 'covers')
 * @param {number} maxSize - Max width/height for resizing (default: 1024 for avatars, 1200 for covers)
 * @returns {Promise<string>} Download URL
 */
export const uploadImageAsync = async (uri, folder = 'avatars', maxSize = null) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  // Determine max size based on folder if not provided
  const resizeSize = maxSize || (folder === 'covers' ? 1200 : 1024);

  // 1) compress/resize first
  const processed = await compressImageForAvatar(uri, resizeSize, 0.8);

  // 2) read file into Blob
  const res = await fetch(processed.uri);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to read file: ${res.status} ${text}`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error('Selected file is empty or unreadable');
  if (blob.size > MAX_AVATAR_BYTES) throw new Error('Image exceeds 10MB limit');

  // 3) build path + metadata
  const filename = `${uuidv4()}.jpg`;
  const path = `${folder}/${uid}/${filename}`;
  const metadata = { contentType: processed.contentType };

  console.log('[Storage debug]', {
    path,
    type: metadata.contentType,
    size: blob.size,
  });

  // 4) upload using Firebase Storage
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  try {
    await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[Storage] Upload successful:', downloadURL);
    return downloadURL;
  } catch (err) {
    console.error('[Storage upload error]', {
      code: err?.code,
      message: err?.message,
    });
    throw err;
  }
};

// Upload video or audio files
export const uploadFileAsync = async (uri, folder = 'posts', fileType = 'video') => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  // Read file into Blob
  const res = await fetch(uri);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to read file: ${res.status} ${text}`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) throw new Error('Selected file is empty or unreadable');
  
  // Size limits: 50MB for video, 25MB for audio
  const maxSize = fileType === 'video' ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
  if (blob.size > maxSize) {
    throw new Error(`${fileType === 'video' ? 'Video' : 'Audio'} exceeds ${maxSize / (1024 * 1024)}MB limit`);
  }

  // Determine file extension and content type
  let extension = 'mp4';
  let contentType = 'video/mp4';
  if (fileType === 'audio') {
    extension = 'mp3';
    contentType = 'audio/mpeg';
  }

  // Build path + metadata
  const filename = `${uuidv4()}.${extension}`;
  const path = `${folder}/${uid}/${filename}`;
  const metadata = { contentType };

  console.log('[Storage debug]', {
    path,
    type: metadata.contentType,
    size: blob.size,
  });

  // Upload using Firebase Storage
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  try {
    await uploadBytes(storageRef, blob, metadata);
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[Storage] Upload successful:', downloadURL);
    return downloadURL;
  } catch (err) {
    console.error('[Storage upload error]', {
      code: err?.code,
      message: err?.message,
    });
    throw err;
  }
};
