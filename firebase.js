// firebase.js
// Real Firebase implementation - NO MOCK FALLBACKS
// Configure Firebase credentials in .env file or app.json

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword as firebaseCreateUser,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
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

export const sendEmailVerification = async (user) => {
  try {
    await firebaseSendEmailVerification(user);
    console.log('✅ Email verification sent successfully');
  } catch (error) {
    console.error('❌ Email verification failed:', error.message);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email) => {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully');
  } catch (error) {
    console.error('❌ Password reset email failed:', error.message);
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

/**
 * Check if a username is available (not already taken)
 * @param {string} username - Username to check
 * @param {string} excludeUserId - User ID to exclude from check (for updates)
 * @returns {Promise<boolean>} True if username is available
 */
export const checkUsernameAvailability = async (username, excludeUserId = null) => {
  if (!username || !username.trim()) return false;
  
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const normalizedUsername = username.trim().toLowerCase();
  
  const q = query(
    collection(db, 'users'),
    where('username', '==', normalizedUsername)
  );
  
  const snapshot = await getDocs(q);
  
  // If checking for update, exclude current user
  if (excludeUserId) {
    return snapshot.empty || snapshot.docs.every(doc => doc.id === excludeUserId);
  }
  
  return snapshot.empty;
};

/* ------------------------------------------------------------------ */
/* Input Sanitization Helpers                                         */
/* ------------------------------------------------------------------ */

/**
 * Sanitize text input by removing HTML tags and dangerous characters
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  // Remove HTML tags
  return text.replace(/<[^>]*>/g, '').trim();
};

/**
 * Validate and sanitize URL
 * @param {string} url - URL to validate
 * @returns {string|null} Valid URL or null
 */
export const validateAndSanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  // Add https:// if no protocol
  let urlToValidate = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    urlToValidate = `https://${trimmed}`;
  }
  
  // Basic URL validation
  try {
    const urlObj = new URL(urlToValidate);
    // Whitelist allowed protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    return urlToValidate;
  } catch {
    return null;
  }
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {object} { valid: boolean, error: string }
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (trimmed.length > 30) {
    return { valid: false, error: 'Username must be less than 30 characters' };
  }
  
  // Allow alphanumeric, underscore, and hyphen
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  // Cannot start or end with underscore or hyphen
  if (/^[_-]|[_-]$/.test(trimmed)) {
    return { valid: false, error: 'Username cannot start or end with underscore or hyphen' };
  }
  
  return { valid: true, error: null };
};

/* ------------------------------------------------------------------ */
/* Social Features (Follow/Unfollow, Block, Report)                    */
/* ------------------------------------------------------------------ */

// Import statsCache for cache invalidation
import { statsCache } from './utils/statsCache';

/**
 * Follow a user
 * @param {string} userId - User ID to follow
 * @returns {Promise<void>}
 */
export const followUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  if (currentUserId === userId) throw new Error('Cannot follow yourself');
  
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const followId = `${currentUserId}_${userId}`;
  const followRef = doc(db, 'followers', followId);
  
  await setDoc(followRef, {
    followerId: currentUserId,
    followingId: userId,
    createdAt: serverTimestamp(),
  });
  
  // Invalidate stats cache for both users
  statsCache.invalidate(currentUserId);
  statsCache.invalidate(userId);
};

/**
 * Unfollow a user
 * @param {string} userId - User ID to unfollow
 * @returns {Promise<void>}
 */
export const unfollowUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, deleteDoc } = await import('firebase/firestore');
  const followId = `${currentUserId}_${userId}`;
  const followRef = doc(db, 'followers', followId);
  
  await deleteDoc(followRef);
  
  // Invalidate stats cache for both users
  const { statsCache } = await import('./utils/statsCache');
  statsCache.invalidate(currentUserId);
  statsCache.invalidate(userId);
};

/**
 * Check if current user is following a user
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
export const isFollowing = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return false;
  
  const { doc, getDoc } = await import('firebase/firestore');
  const followId = `${currentUserId}_${userId}`;
  const followRef = doc(db, 'followers', followId);
  const snap = await getDoc(followRef);
  
  return snap.exists();
};

/**
 * Block a user
 * @param {string} userId - User ID to block
 * @returns {Promise<void>}
 */
export const blockUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  if (currentUserId === userId) throw new Error('Cannot block yourself');
  
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const blockId = `${currentUserId}_${userId}`;
  const blockRef = doc(db, 'blocks', blockId);
  
  await setDoc(blockRef, {
    blockerId: currentUserId,
    blockedId: userId,
    createdAt: serverTimestamp(),
  });
  
  // Unfollow if following
  try {
    await unfollowUser(userId);
  } catch (e) {
    // Ignore if not following
  }
};

/**
 * Unblock a user
 * @param {string} userId - User ID to unblock
 * @returns {Promise<void>}
 */
export const unblockUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, deleteDoc } = await import('firebase/firestore');
  const blockId = `${currentUserId}_${userId}`;
  const blockRef = doc(db, 'blocks', blockId);
  
  await deleteDoc(blockRef);
};

/**
 * Check if current user has blocked a user
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
export const isBlocked = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return false;
  
  const { doc, getDoc } = await import('firebase/firestore');
  const blockId = `${currentUserId}_${userId}`;
  const blockRef = doc(db, 'blocks', blockId);
  const snap = await getDoc(blockRef);
  
  return snap.exists();
};

/**
 * Report a user
 * @param {string} userId - User ID to report
 * @param {string} reason - Reason for reporting
 * @param {string} details - Additional details
 * @returns {Promise<void>}
 */
export const reportUser = async (userId, reason, details = '') => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  if (currentUserId === userId) throw new Error('Cannot report yourself');
  
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const reportsRef = collection(db, 'reports');
  
  await addDoc(reportsRef, {
    reporterId: currentUserId,
    reportedUserId: userId,
    reason: sanitizeText(reason),
    details: sanitizeText(details),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

/**
 * Mute a user (hide their posts from feed)
 * @param {string} userId - User ID to mute
 * @returns {Promise<void>}
 */
export const muteUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  if (currentUserId === userId) throw new Error('Cannot mute yourself');
  
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const muteId = `${currentUserId}_${userId}`;
  const muteRef = doc(db, 'mutes', muteId);
  
  await setDoc(muteRef, {
    muterId: currentUserId,
    mutedId: userId,
    createdAt: serverTimestamp(),
  });
};

/**
 * Unmute a user
 * @param {string} userId - User ID to unmute
 * @returns {Promise<void>}
 */
export const unmuteUser = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, deleteDoc } = await import('firebase/firestore');
  const muteId = `${currentUserId}_${userId}`;
  const muteRef = doc(db, 'mutes', muteId);
  
  await deleteDoc(muteRef);
};

/**
 * Check if current user has muted a user
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>}
 */
export const isMuted = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return false;
  
  const { doc, getDoc } = await import('firebase/firestore');
  const muteId = `${currentUserId}_${userId}`;
  const muteRef = doc(db, 'mutes', muteId);
  const snap = await getDoc(muteRef);
  
  return snap.exists();
};

/**
 * Get list of followers for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of user profiles
 */
export const getFollowers = async (userId, limit = 50) => {
  const { collection, query, where, getDocs, limit: limitFn } = await import('firebase/firestore');
  const followersQuery = query(
    collection(db, 'followers'),
    where('followingId', '==', userId),
    limitFn(limit)
  );
  
  const snapshot = await getDocs(followersQuery);
  const followerIds = snapshot.docs.map(doc => doc.data().followerId);
  
  // Fetch user profiles
  const { doc, getDoc } = await import('firebase/firestore');
  const userProfiles = await Promise.all(
    followerIds.map(async (followerId) => {
      const userRef = doc(db, 'users', followerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
      return null;
    })
  );
  
  return userProfiles.filter(Boolean);
};

/**
 * Get list of users a user is following
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of user profiles
 */
export const getFollowing = async (userId, limit = 50) => {
  const { collection, query, where, getDocs, limit: limitFn } = await import('firebase/firestore');
  const followingQuery = query(
    collection(db, 'followers'),
    where('followerId', '==', userId),
    limitFn(limit)
  );
  
  const snapshot = await getDocs(followingQuery);
  const followingIds = snapshot.docs.map(doc => doc.data().followingId);
  
  // Fetch user profiles
  const { doc, getDoc } = await import('firebase/firestore');
  const userProfiles = await Promise.all(
    followingIds.map(async (followingId) => {
      const userRef = doc(db, 'users', followingId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
      return null;
    })
  );
  
  return userProfiles.filter(Boolean);
};

/* ------------------------------------------------------------------ */
/* Profile Verification & Categories                                    */
/* ------------------------------------------------------------------ */

/**
 * Request profile verification (user-initiated)
 * @param {string} reason - Reason for verification request
 * @param {string} evidence - Evidence/documentation (optional)
 * @returns {Promise<void>}
 */
export const requestVerification = async (reason, evidence = '') => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const verificationRequestsRef = collection(db, 'verificationRequests');
  
  await addDoc(verificationRequestsRef, {
    userId: currentUserId,
    reason: sanitizeText(reason),
    evidence: sanitizeText(evidence),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
};

/**
 * Verify a user profile (admin-only, typically done via Cloud Function)
 * @param {string} userId - User ID to verify
 * @returns {Promise<void>}
 */
export const verifyUserProfile = async (userId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  // Check if user is admin (you'll need to implement admin check)
  // For now, this is a placeholder - implement admin check based on your needs
  const { doc, updateDoc } = await import('firebase/firestore');
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, {
    verified: true,
    verifiedAt: new Date().toISOString(),
    verifiedBy: currentUserId,
  });
};

/**
 * Set user category/type
 * @param {string} category - Category ID (e.g., 'promoter', 'vendor', 'performer')
 * @param {string} categoryTitle - Display title for category
 * @returns {Promise<void>}
 */
export const setUserCategory = async (category, categoryTitle) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, updateDoc } = await import('firebase/firestore');
  const userRef = doc(db, 'users', currentUserId);
  
  await updateDoc(userRef, {
    category: category,
    categoryTitle: categoryTitle || category,
    categoryUpdatedAt: new Date().toISOString(),
  });
};

/**
 * Pin a post to profile highlights
 * @param {string} postId - Post ID to pin
 * @returns {Promise<void>}
 */
export const pinPost = async (postId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, getDoc, updateDoc } = await import('firebase/firestore');
  
  // Verify post belongs to user
  const postRef = doc(db, 'posts', postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  
  if (postSnap.data().userId !== currentUserId) {
    throw new Error('You can only pin your own posts');
  }
  
  // Update user profile with pinned posts (max 5)
  const userRef = doc(db, 'users', currentUserId);
  const userSnap = await getDoc(userRef);
  const currentPinned = userSnap.data()?.pinnedPosts || [];
  
  if (currentPinned.length >= 5) {
    throw new Error('Maximum 5 pinned posts allowed');
  }
  
  if (currentPinned.includes(postId)) {
    throw new Error('Post is already pinned');
  }
  
  await updateDoc(userRef, {
    pinnedPosts: [...currentPinned, postId],
    pinnedPostsUpdatedAt: new Date().toISOString(),
  });
};

/**
 * Unpin a post from profile highlights
 * @param {string} postId - Post ID to unpin
 * @returns {Promise<void>}
 */
export const unpinPost = async (postId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, getDoc, updateDoc } = await import('firebase/firestore');
  const userRef = doc(db, 'users', currentUserId);
  const userSnap = await getDoc(userRef);
  const currentPinned = userSnap.data()?.pinnedPosts || [];
  
  if (!currentPinned.includes(postId)) {
    throw new Error('Post is not pinned');
  }
  
  await updateDoc(userRef, {
    pinnedPosts: currentPinned.filter(id => id !== postId),
    pinnedPostsUpdatedAt: new Date().toISOString(),
  });
};

/**
 * Get pinned posts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pinned post documents
 */
export const getPinnedPosts = async (userId) => {
  const { doc, getDoc } = await import('firebase/firestore');
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return [];
  }
  
  const pinnedPostIds = userSnap.data()?.pinnedPosts || [];
  if (pinnedPostIds.length === 0) {
    return [];
  }
  
  // Fetch pinned posts
  const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
  const postsRef = collection(db, 'posts');
  
  // Firestore 'in' query supports up to 10 items, so we'll handle it
  const posts = [];
  for (const postId of pinnedPostIds) {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      posts.push({ id: postSnap.id, ...postSnap.data() });
    }
  }
  
  // Sort by pinned order (maintain order from pinnedPosts array)
  return pinnedPostIds
    .map(id => posts.find(p => p.id === id))
    .filter(Boolean);
};

/* ------------------------------------------------------------------ */
/* Profile Views Tracking                                              */
/* ------------------------------------------------------------------ */

/**
 * Track a profile view (when user views another user's profile)
 * @param {string} viewedUserId - User ID whose profile was viewed
 * @returns {Promise<void>}
 */
export const trackProfileView = async (viewedUserId) => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) return; // Don't track if not authenticated
  if (currentUserId === viewedUserId) return; // Don't track own profile views
  
  const { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } = await import('firebase/firestore');
  
  // Check if already viewed recently (within last hour) to prevent spam
  const viewsRef = collection(db, 'profileViews');
  const recentViewQuery = query(
    viewsRef,
    where('viewerId', '==', currentUserId),
    where('viewedUserId', '==', viewedUserId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  
  const recentViews = await getDocs(recentViewQuery);
  if (!recentViews.empty) {
    const lastView = recentViews.docs[0].data();
    const lastViewTime = lastView.createdAt?.toDate?.() || new Date(lastView.createdAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    if (lastViewTime > oneHourAgo) {
      return; // Already viewed within last hour
    }
  }
  
  // Record the view
  await addDoc(viewsRef, {
    viewerId: currentUserId,
    viewedUserId: viewedUserId,
    createdAt: serverTimestamp(),
  });
};

/**
 * Get profile views for a user (who viewed their profile)
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of viewer profiles
 */
export const getProfileViews = async (userId, limit = 50) => {
  const { collection, query, where, getDocs, orderBy, limit: limitFn } = await import('firebase/firestore');
  const viewsQuery = query(
    collection(db, 'profileViews'),
    where('viewedUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limitFn(limit)
  );
  
  const snapshot = await getDocs(viewsQuery);
  const viewerIds = [...new Set(snapshot.docs.map(doc => doc.data().viewerId))]; // Unique viewers
  
  // Fetch viewer profiles
  const { doc, getDoc } = await import('firebase/firestore');
  const viewerProfiles = await Promise.all(
    viewerIds.map(async (viewerId) => {
      const userRef = doc(db, 'users', viewerId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const viewData = snapshot.docs.find(d => d.data().viewerId === viewerId);
        return {
          id: userSnap.id,
          ...userSnap.data(),
          viewedAt: viewData?.data().createdAt?.toDate?.() || new Date(),
        };
      }
      return null;
    })
  );
  
  return viewerProfiles.filter(Boolean);
};

/**
 * Get profile view count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Total view count
 */
export const getProfileViewCount = async (userId) => {
  const { collection, query, where, getCountFromServer } = await import('firebase/firestore');
  const viewsQuery = query(
    collection(db, 'profileViews'),
    where('viewedUserId', '==', userId)
  );
  
  const snapshot = await getCountFromServer(viewsQuery);
  return snapshot.data().count;
};

/* ------------------------------------------------------------------ */
/* Mentions System                                                     */
/* ------------------------------------------------------------------ */

/**
 * Extract mentions from text (@username)
 * @param {string} text - Text to parse
 * @returns {Array} Array of mentioned usernames
 */
export const extractMentions = (text) => {
  if (!text || typeof text !== 'string') return [];
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  
  return [...new Set(mentions)]; // Unique mentions
};

/**
 * Create a mention notification
 * @param {string} postId - Post ID where mention occurred
 * @param {string} mentionedUserId - User ID who was mentioned
 * @param {string} mentionerId - User ID who mentioned
 * @param {string} postContent - Content of the post
 * @returns {Promise<void>}
 */
export const createMentionNotification = async (postId, mentionedUserId, mentionerId, postContent) => {
  if (mentionedUserId === mentionerId) return; // Don't notify self-mentions
  
  const { collection, addDoc, serverTimestamp, doc, getDoc } = await import('firebase/firestore');
  
  // Get mentioner's profile
  const mentionerRef = doc(db, 'users', mentionerId);
  const mentionerSnap = await getDoc(mentionerRef);
  if (!mentionerSnap.exists()) return;
  
  const mentioner = mentionerSnap.data();
  
  // Create notification
  const notificationsRef = collection(db, 'notifications');
  await addDoc(notificationsRef, {
    userId: mentionedUserId,
    type: 'mention',
    postId: postId,
    actorId: mentionerId,
    actorName: mentioner.displayName || mentioner.username,
    actorAvatar: mentioner.avatarUrl || mentioner.photoURL,
    content: postContent.substring(0, 100), // Preview
    read: false,
    createdAt: serverTimestamp(),
  });
};

/**
 * Get notifications for a user
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of notifications
 */
export const getNotifications = async (userId, limit = 50) => {
  const { collection, query, where, getDocs, orderBy, limit: limitFn } = await import('firebase/firestore');
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limitFn(limit)
  );
  
  const snapshot = await getDocs(notificationsQuery);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.() || new Date(),
  }));
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<void>}
 */
export const markNotificationRead = async (notificationId) => {
  const { doc, updateDoc } = await import('firebase/firestore');
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, {
    read: true,
    readAt: new Date().toISOString(),
  });
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const markAllNotificationsRead = async (userId) => {
  const { collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(notificationsQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      read: true,
      readAt: new Date().toISOString(),
    });
  });
  
  await batch.commit();
};

/* ------------------------------------------------------------------ */
/* Activity Feed                                                       */
/* ------------------------------------------------------------------ */

/**
 * Get activity feed for a user (recent activity from followed users)
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} Array of activities
 */
export const getActivityFeed = async (userId, limit = 50) => {
  const { collection, query, where, getDocs, orderBy, limit: limitFn } = await import('firebase/firestore');
  
  // Get users that current user is following
  const followingQuery = query(
    collection(db, 'followers'),
    where('followerId', '==', userId)
  );
  const followingSnapshot = await getDocs(followingQuery);
  const followingIds = followingSnapshot.docs.map(doc => doc.data().followingId);
  
  if (followingIds.length === 0) {
    return [];
  }
  
  // Get recent posts from followed users
  const activities = [];
  
  // Get posts (limit per user to avoid too many)
  const postsPerUser = Math.ceil(limit / followingIds.length);
  for (const followingId of followingIds.slice(0, 10)) { // Limit to 10 followed users for performance
    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', followingId),
      orderBy('createdAt', 'desc'),
      limitFn(postsPerUser)
    );
    
    const postsSnapshot = await getDocs(postsQuery);
    postsSnapshot.docs.forEach(doc => {
      activities.push({
        type: 'post',
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      });
    });
  }
  
  // Sort by date and limit
  return activities
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
};

/* ------------------------------------------------------------------ */
/* Account Management                                                  */
/* ------------------------------------------------------------------ */

/**
 * Delete user account and all associated data
 * @returns {Promise<void>}
 */
export const deleteUserAccount = async () => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, deleteDoc, collection, query, where, getDocs, writeBatch } = await import('firebase/firestore');
  const batch = writeBatch(db);
  
  // Delete user profile
  const userRef = doc(db, 'users', currentUserId);
  batch.delete(userRef);
  
  // Delete all followers relationships (where user is follower or following)
  const followersQuery1 = query(collection(db, 'followers'), where('followerId', '==', currentUserId));
  const followersQuery2 = query(collection(db, 'followers'), where('followingId', '==', currentUserId));
  
  const [snapshot1, snapshot2] = await Promise.all([
    getDocs(followersQuery1),
    getDocs(followersQuery2),
  ]);
  
  snapshot1.docs.forEach(doc => batch.delete(doc.ref));
  snapshot2.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete all blocks (where user is blocker or blocked)
  const blocksQuery1 = query(collection(db, 'blocks'), where('blockerId', '==', currentUserId));
  const blocksQuery2 = query(collection(db, 'blocks'), where('blockedId', '==', currentUserId));
  
  const [blocksSnapshot1, blocksSnapshot2] = await Promise.all([
    getDocs(blocksQuery1),
    getDocs(blocksQuery2),
  ]);
  
  blocksSnapshot1.docs.forEach(doc => batch.delete(doc.ref));
  blocksSnapshot2.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete all mutes
  const mutesQuery = query(collection(db, 'mutes'), where('muterId', '==', currentUserId));
  const mutesSnapshot = await getDocs(mutesQuery);
  mutesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Delete all posts
  const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUserId));
  const postsSnapshot = await getDocs(postsQuery);
  postsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
  
  // Commit batch delete
  await batch.commit();
  
  // Delete Firebase Auth account
  const { deleteUser: firebaseDeleteUser } = await import('firebase/auth');
  await firebaseDeleteUser(auth.currentUser);
  
  // Clear stats cache
  const { statsCache } = await import('./utils/statsCache');
  statsCache.invalidate(currentUserId);
};

/**
 * Export user data (GDPR compliance)
 * @returns {Promise<object>} User data object
 */
export const exportUserData = async () => {
  const currentUserId = auth.currentUser?.uid;
  if (!currentUserId) throw new Error('Not authenticated');
  
  const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
  
  // Get user profile
  const userRef = doc(db, 'users', currentUserId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  
  // Get posts
  const postsQuery = query(collection(db, 'posts'), where('userId', '==', currentUserId));
  const postsSnapshot = await getDocs(postsQuery);
  const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Get followers
  const followers = await getFollowers(currentUserId, 1000);
  
  // Get following
  const following = await getFollowing(currentUserId, 1000);
  
  // Get blocks
  const blocksQuery = query(collection(db, 'blocks'), where('blockerId', '==', currentUserId));
  const blocksSnapshot = await getDocs(blocksQuery);
  const blocks = blocksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Get mutes
  const mutesQuery = query(collection(db, 'mutes'), where('muterId', '==', currentUserId));
  const mutesSnapshot = await getDocs(mutesQuery);
  const mutes = mutesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return {
    user: userData,
    posts: posts,
    followers: followers.map(u => ({ id: u.id, displayName: u.displayName, username: u.username })),
    following: following.map(u => ({ id: u.id, displayName: u.displayName, username: u.username })),
    blocks: blocks,
    mutes: mutes,
    exportedAt: new Date().toISOString(),
  };
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
