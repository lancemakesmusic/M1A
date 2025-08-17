// firebase.js
import 'react-native-get-random-values'; // ensure uuid works on RN

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import {
  CACHE_SIZE_UNLIMITED,
  doc,
  getDoc,
  initializeFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// ——— Firebase config for "m1alive" ———
const firebaseConfig = {
  apiKey: 'AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ',
  authDomain: 'm1alive.firebaseapp.com',
  projectId: 'm1alive',
  storageBucket: 'm1alive.appspot.com',
  messagingSenderId: '83002254287',
  appId: '1:83002254287:web:b802e1e040cb51494668ba',
};

// ——— Initialize Firebase App ———
const app = initializeApp(firebaseConfig);

// ——— Auth with AsyncStorage persistence (Expo-friendly) ———
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// ——— Firestore with long-polling and unlimited cache ———
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// ——— GET user profile from Firestore ———
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

// ——— UPDATE user profile in Firestore ———
export const updateUserProfileInDB = async (uid, updates) => {
  if (!uid) return;
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
};

// ——— helpers for upload ———
const guessExt = (uri) => {
  const lower = (uri || '').toLowerCase();
  if (/\.(png)$/.test(lower)) return 'png';
  if (/\.(jpe?g)$/.test(lower)) return 'jpg';
  if (/\.(webp)$/.test(lower)) return 'webp';
  return 'jpg'; // fallback when iOS crop strips extension
};

const guessContentType = (uri, blobType) => {
  if (blobType && blobType !== 'application/octet-stream') return blobType;
  const ext = guessExt(uri);
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

// --- UPLOAD image to Firebase Storage and return public URL ---
export const uploadImageAsync = async (uri) => {
  if (!auth.currentUser?.uid) {
    throw new Error('Not signed in');
  }
  const uid = auth.currentUser.uid;

  // fetch local file as Blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // path must match Storage rules: avatars/{uid}/{file}
  const ext = guessExt(uri);
  const filename = `${uuidv4()}.${ext}`;
  const path = `avatars/${uid}/${filename}`;

  // resumable upload with explicit contentType
  const storage = getStorage();
  const storageRef = ref(storage, path);
  const contentType = guessContentType(uri, blob.type);

  const task = uploadBytesResumable(storageRef, blob, { contentType });

  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      undefined,
      (err) => {
        console.error('[Storage upload error]', err);
        reject(err);
      },
      () => resolve()
    );
  });

  return await getDownloadURL(storageRef);
};

// ——— Create a minimal profile doc if it's missing ———
export const createUserProfileIfMissing = async (uid, seed = {}) => {
  if (!uid) return null;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

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
    await setDoc(ref, defaults, { merge: true });
    return defaults;
  }
  return snap.data();
};

// ✅ Optional sanity check
console.log('🐻 Firebase initialized for project:', getApp().options.projectId);
