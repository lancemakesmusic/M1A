// firebase.js
// Expo (iOS/Android/Web) + Firebase v11+

import 'react-native-get-random-values';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  setPersistence,
} from 'firebase/auth';
import {
  CACHE_SIZE_UNLIMITED,
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes, // non-resumable avoids RN Blob edge cases
} from 'firebase/storage';

// 🔐 App Check
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { v4 as uuidv4 } from 'uuid';

/* ------------------------------------------------------------------ */
/* Firebase config (project: m1alive)                                  */
/* ------------------------------------------------------------------ */
const firebaseConfig = {
  apiKey: 'AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ',
  authDomain: 'm1alive.firebaseapp.com',
  projectId: 'm1alive',
  // Bucket ID ONLY (no gs:// prefix)
  storageBucket: 'm1alive.firebasestorage.app',
  messagingSenderId: '83002254287',
  appId: '1:83002254287:web:b802e1e040cb51494668ba',
};

/* ------------------------------------------------------------------ */
/* App (guard against Fast Refresh)                                    */
/* ------------------------------------------------------------------ */
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/* ------------------------------------------------------------------ */
/* App Check                                                           */
/* - Web: reCAPTCHA v3 (needs EXPO_PUBLIC_RECAPTCHA_SITE_KEY)          */
/* - Dev (Expo Go / RN / Web): Debug token so uploads pass while testing */
/*   For production native builds, use DeviceCheck (iOS) + Play Integrity (Android). */
/* ------------------------------------------------------------------ */
const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;

try {
  if (__DEV__) {
    // Allow dev builds (including Expo Go) to pass App Check
    // eslint-disable-next-line no-underscore-dangle
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  if (Platform.OS === 'web' && RECAPTCHA_SITE_KEY) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (e) {
  console.warn('[AppCheck init warning]', e?.message || String(e));
}

/* ------------------------------------------------------------------ */
/* Auth (centralized init — import { auth } from this file only)       */
/* ------------------------------------------------------------------ */
function ensureAuth() {
  if (Platform.OS === 'web') {
    const a = getAuth(app);
    setPersistence(a, browserLocalPersistence).catch(() => {});
    return a;
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}
export const auth = ensureAuth();

/* ------------------------------------------------------------------ */
/* Firestore                                                           */
/* ------------------------------------------------------------------ */
let _db;
try {
  _db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  });
} catch {
  _db = getFirestore(app);
}
export const db = _db;

/* ------------------------------------------------------------------ */
/* Storage (uses firebaseConfig.storageBucket)                         */
/* ------------------------------------------------------------------ */
export const storage = getStorage(app);

/* ------------------------------------------------------------------ */
/* User profile helpers                                                */
/* ------------------------------------------------------------------ */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
};

export const updateUserProfileInDB = async (uid, updates) => {
  if (!uid) return;
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
};

export const createUserProfileIfMissing = async (uid, seed = {}) => {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const defaults = {
      displayName: '',
      username: '',
      bio: '',
      avatarUrl: '',
      socials: {},
      private: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...seed,
    };
    await setDoc(userRef, defaults, { merge: true });
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
    bucket: getApp().options.storageBucket, // "m1alive.firebasestorage.app"
    path,
    type: metadata.contentType,
    size: blob.size,
  });

  // 4) upload (non-resumable is simplest/most reliable on RN)
  const storageRef = ref(storage, path);
  try {
    await uploadBytes(storageRef, blob, metadata);
  } catch (err) {
    const resp =
      err?.customData?.serverResponse ||
      err?.serverResponse ||
      err?.message ||
      '';
    console.error('[Storage upload error]', {
      code: err?.code,
      name: err?.name,
      msg: err?.message,
      resp,
    });
    throw err;
  }

  // 5) return public URL
  return await getDownloadURL(storageRef);
};

/* ------------------------------------------------------------------ */
/* Optional sanity log                                                 */
/* ------------------------------------------------------------------ */
try {
  console.log('🐻 Firebase initialized for project:', getApp().options.projectId);
} catch {}
