// firebase.js
// Real Firebase implementation with fallback to mock

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

// Firebase configuration - uses environment variables or defaults
// To use real Firebase, set these in your .env file or app.json extra section
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "m1alive.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "m1alive",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "m1alive.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};

// Check if we have real Firebase credentials (not placeholder values)
const hasRealFirebaseConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ" &&
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "m1alive" &&
  firebaseConfig.appId && 
  firebaseConfig.appId !== "1:123456789012:web:abcdefghijklmnopqrstuvwxyz";

// Initialize Firebase
let app, realAuth, realDb, realStorage, realFunctions;
let isRealFirebase = false;

// Only try to initialize real Firebase if we have real config
if (hasRealFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth with persistence
    try {
      realAuth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch (error) {
      // Fallback to getAuth if initializeAuth fails
      realAuth = getAuth(app);
    }
    
    realDb = getFirestore(app);
    realStorage = getStorage(app);
    realFunctions = getFunctions(app);
    
    isRealFirebase = true;
    console.log('🔥 Real Firebase initialized successfully!');
    console.log('📦 Project:', firebaseConfig.projectId);
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed, using mock:', error.message);
    isRealFirebase = false;
  }
} else {
  console.warn('⚠️ Using mock Firebase - configure real Firebase credentials to enable full functionality');
  console.warn('💡 Set EXPO_PUBLIC_FIREBASE_* environment variables or update firebase.js config');
  isRealFirebase = false;
}

// Mock Firebase implementation (fallback)
const mockAuth = {
  currentUser: {
    uid: 'wGdVeOThCQOF65f3emHhisgrUsx2',
    email: 'brogdon.lance@gmail.com',
    displayName: 'Lance'
  },
  onAuthStateChanged: (callback) => {
    // Simulate immediate authentication
    setTimeout(() => {
      callback(mockAuth.currentUser);
    }, 100);
    // Return unsubscribe function
    return () => console.log('Mock auth unsubscribe');
  }
};

const mockFirestore = {
  collection: (name) => ({
    doc: (id) => ({
      id: id || `mock-${Date.now()}`,
      get: async () => ({
        exists: () => true,
        data: () => ({
          displayName: 'Lance',
          username: 'Lance makes music',
          bio: 'Founder',
          avatarUrl: '',
          socials: { instagram: 'instagram.com/merkaba_ent' },
          private: false,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }),
      set: async (data) => {
        console.log('Mock Firestore set:', data);
        return { id: id || `mock-${Date.now()}` };
      },
      update: async (data) => {
        console.log('Mock Firestore update:', data);
        return { id: id || `mock-${Date.now()}` };
      }
    }),
    // Support for addDoc
    add: async (data) => {
      const docId = `mock-${Date.now()}`;
      console.log('Mock Firestore add:', name, data);
      return { id: docId };
    }
  })
};

const mockFunctions = {
  httpsCallable: (name) => async (data) => {
    console.log('Mock Functions call:', name, data);
    return { data: { success: true, message: 'Mock function called' } };
  }
};

const mockStorage = {
  ref: (path) => ({
    put: async (blob, metadata) => {
      console.log('Mock Storage upload:', path, metadata);
      return { ref: { getDownloadURL: async () => 'https://mock-url.com/image.jpg' } };
    },
    getDownloadURL: async () => 'https://mock-url.com/image.jpg'
  })
};

/* ------------------------------------------------------------------ */
/* Real Firebase + Mock Fallback Exports                               */
/* ------------------------------------------------------------------ */

// Authentication functions with real Firebase + mock fallback
export const signInWithEmailAndPassword = async (email, password) => {
  if (isRealFirebase) {
    try {
      const result = await firebaseSignIn(realAuth, email, password);
      console.log('✅ Real Firebase sign in successful');
      return result;
    } catch (error) {
      console.error('❌ Real Firebase sign in failed:', error.message);
      throw error;
    }
  } else {
    console.log('🔧 Mock sign in:', email);
    // Check for bypass auth or admin email from env
    const bypassAuth = process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';
    const adminEmail = process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'brogdon.lance@gmail.com';
    
    // In mock mode, accept any password for any email (for demo purposes)
    // Or check if it's the admin email or bypass is enabled
    if (bypassAuth || email === adminEmail || email === 'brogdon.lance@gmail.com' || password.length >= 6) {
      // Update mock user email if different
      if (email !== mockAuth.currentUser.email) {
        mockAuth.currentUser.email = email;
        mockAuth.currentUser.displayName = email.split('@')[0];
      }
      console.log('✅ Mock sign in successful');
      
      // Notify all auth state listeners
      if (mockAuth._listeners && mockAuth._listeners.length > 0) {
        console.log('🔔 Notifying auth state listeners of login');
        mockAuth._listeners.forEach(listener => {
          try {
            listener();
          } catch (e) {
            console.error('Error in auth state listener:', e);
          }
        });
      }
      
      return { user: mockAuth.currentUser };
    }
    throw new Error('Invalid credentials');
  }
};

export const createUserWithEmailAndPassword = async (email, password) => {
  if (isRealFirebase) {
    try {
      const result = await firebaseCreateUser(realAuth, email, password);
      console.log('✅ Real Firebase user creation successful');
      return result;
    } catch (error) {
      console.error('❌ Real Firebase user creation failed:', error.message);
      throw error;
    }
  } else {
    console.log('🔧 Mock user creation:', email);
    return { user: mockAuth.currentUser };
  }
};

export const signOut = async () => {
  if (isRealFirebase) {
    try {
      await firebaseSignOut(realAuth);
      console.log('✅ Real Firebase sign out successful');
    } catch (error) {
      console.error('❌ Real Firebase sign out failed:', error.message);
      throw error;
    }
  } else {
    console.log('🔧 Mock sign out');
  }
};

export const onAuthStateChanged = (callback) => {
  if (isRealFirebase) {
    return firebaseOnAuthStateChanged(realAuth, callback);
  } else {
    // Mock auth state change - call immediately with current user
    // Also set up a listener for when currentUser changes
    const callCallback = () => {
      callback(mockAuth.currentUser);
    };
    
    // Call immediately with current user
    callCallback();
    
    // Store callback so signIn can trigger it
    if (!mockAuth._listeners) {
      mockAuth._listeners = [];
    }
    mockAuth._listeners.push(callCallback);
    
    return () => {
      if (mockAuth._listeners) {
        const index = mockAuth._listeners.indexOf(callCallback);
        if (index > -1) {
          mockAuth._listeners.splice(index, 1);
        }
      }
      console.log('Mock auth unsubscribe');
    };
  }
};

export const updateProfile = async (user, updates) => {
  if (isRealFirebase) {
    try {
      await firebaseUpdateProfile(user, updates);
      console.log('✅ Real Firebase profile update successful');
    } catch (error) {
      console.error('❌ Real Firebase profile update failed:', error.message);
      throw error;
    }
  } else {
    console.log('🔧 Mock profile update:', updates);
    Object.assign(mockAuth.currentUser, updates);
  }
};

/* ------------------------------------------------------------------ */
/* Helper Functions                                                    */
/* ------------------------------------------------------------------ */
export const isFirebaseReady = () => {
  return isRealFirebase && realAuth !== undefined;
};

/* ------------------------------------------------------------------ */
/* Core Exports (Real Firebase + Mock Fallback)                       */
/* ------------------------------------------------------------------ */
export const auth = isRealFirebase ? realAuth : mockAuth;
export const db = isRealFirebase ? realDb : mockFirestore;
export { app }; // Export app for analytics
export const storage = isRealFirebase ? realStorage : mockStorage;
export const functions = isRealFirebase ? realFunctions : mockFunctions;

// Helper function for httpsCallable (Mock)
export const httpsCallable = (functionName) => {
  return mockFunctions.httpsCallable(functionName);
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
  
  if (isFirebaseReady() && db && typeof db.collection !== 'function') {
    // Real Firestore
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
  } else if (db && typeof db.collection === 'function') {
    // Mock Firestore
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists()) return null;
    const data = snap.data();
    // Convert Date objects to timestamps
    const profile = { ...data };
    if (data.photoUpdatedAt instanceof Date) {
      profile.photoUpdatedAt = data.photoUpdatedAt.getTime();
    }
    if (data.coverUpdatedAt instanceof Date) {
      profile.coverUpdatedAt = data.coverUpdatedAt.getTime();
    }
    return profile;
  }
  return null;
};

export const updateUserProfileInDB = async (uid, updates) => {
  if (!uid) return;
  if (!auth.currentUser) {
    console.warn('No authenticated user for updateUserProfileInDB');
    return;
  }
  
  if (isFirebaseReady() && db && typeof db.collection !== 'function') {
    // Real Firestore
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
  } else if (db && typeof db.collection === 'function') {
    // Mock Firestore
    const userRef = db.collection('users').doc(uid);
    await userRef.update({ ...updates, updatedAt: new Date() });
    console.log('[Mock Firestore] Profile updated successfully:', Object.keys(updates));
  }
};

export const createUserProfileIfMissing = async (uid, seed = {}) => {
  if (!uid) return null;
  if (!auth.currentUser) {
    console.warn('No authenticated user for createUserProfileIfMissing');
    return null;
  }
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    const defaults = {
      displayName: '',
      username: '',
      bio: '',
      avatarUrl: '',
      socials: {},
      private: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...seed,
    };
    await userRef.set(defaults, { merge: true });
    return defaults;
  }
  return snap.data();
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

  // 4) upload using real or mock storage
  if (isRealFirebase && realStorage) {
    // Real Firebase Storage
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storageRef = ref(realStorage, path);
    try {
      await uploadBytes(storageRef, blob, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (err) {
      console.error('[Storage upload error]', {
        code: err?.code,
        message: err?.message,
      });
      throw err;
    }
  } else {
    // Mock storage
    const storageRef = storage.ref(path);
    try {
      await storageRef.put(blob, metadata);
      return await storageRef.getDownloadURL();
    } catch (err) {
      console.error('[Storage upload error]', {
        code: err?.code,
        message: err?.message,
      });
      throw err;
    }
  }
};

/* ------------------------------------------------------------------ */
/* Optional sanity log                                                 */
/* ------------------------------------------------------------------ */
try {
  console.log('🐻 Firebase initialized for project: m1alive');
} catch {}
