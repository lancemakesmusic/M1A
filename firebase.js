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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: "m1alive.firebaseapp.com",
  projectId: "m1alive",
  storageBucket: "m1alive.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnopqrstuvwxyz"
};

// Initialize Firebase
let app, realAuth, realDb, realStorage, realFunctions;
let isRealFirebase = false;

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
} catch (error) {
  console.warn('⚠️ Firebase initialization failed, using mock:', error.message);
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
      get: async () => ({
        exists: true,
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
      set: async (data) => console.log('Mock Firestore set:', data),
      update: async (data) => console.log('Mock Firestore update:', data)
    })
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
    if (email === 'brogdon.lance@gmail.com' && password === 'password123') {
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
    // Mock auth state change
    setTimeout(() => {
      callback(mockAuth.currentUser);
    }, 100);
    return () => console.log('Mock auth unsubscribe');
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
/* Core Exports (Real Firebase + Mock Fallback)                       */
/* ------------------------------------------------------------------ */
export const auth = isRealFirebase ? realAuth : mockAuth;
export const db = isRealFirebase ? realDb : mockFirestore;
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
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  return snap.exists ? snap.data() : null;
};

export const updateUserProfileInDB = async (uid, updates) => {
  if (!uid) return;
  if (!auth.currentUser) {
    console.warn('No authenticated user for updateUserProfileInDB');
    return;
  }
  const userRef = db.collection('users').doc(uid);
  await userRef.update({ ...updates, updatedAt: new Date() });
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
 * Upload an image (avatar) to Firebase Storage and return its download URL.
 * Storage rules must allow: avatars/{uid}/*
 */
export const uploadImageAsync = async (uri) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');

  // 1) compress/resize first
  const processed = await compressImageForAvatar(uri, 1024, 0.8);

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
  const path = `avatars/${uid}/${filename}`;
  const metadata = { contentType: processed.contentType };

  console.log('[Storage debug]', {
    path,
    type: metadata.contentType,
    size: blob.size,
  });

  // 4) upload using mock storage
  const storageRef = storage.ref(path);
  try {
    await storageRef.put(blob, metadata);
  } catch (err) {
    console.error('[Storage upload error]', {
      code: err?.code,
      message: err?.message,
    });
    throw err;
  }

  // 5) return public URL
  return await storageRef.getDownloadURL();
};

/* ------------------------------------------------------------------ */
/* Optional sanity log                                                 */
/* ------------------------------------------------------------------ */
try {
  console.log('🐻 Firebase initialized for project: m1alive');
} catch {}
