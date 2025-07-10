// M1A/firebase.js

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

// --- PERSISTENT AUTH IMPORTS ---
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

// 1. Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ',
  authDomain: 'm1alive.firebaseapp.com',
  projectId: 'm1alive',
  storageBucket: 'm1alive.appspot.com',
  messagingSenderId: '83002254287',
  appId: '1:83002254287:web:b802e1e040cb51494668ba',
  measurementId: 'G-6H2QZWTQTV'
};

// Only call initializeApp ONCE in your entire app!
const app = initializeApp(firebaseConfig);

// --- AUTH: Make session persistent across app restarts ---
// IMPORTANT: Use only 'initializeAuth', never 'getAuth', and only export 'auth' from here.
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

// --- USER SEARCH (case-insensitive, real-time compatible) ---
export async function searchUsersByUsername(username) {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('username', '>=', username.toLowerCase()),
    where('username', '<=', username.toLowerCase() + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// --- LIVE USERNAME AVAILABILITY CHECK ---
export async function isUsernameAvailable(username, currentUid) {
  if (!username) return false;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  // Username is available if not found or only matches current user
  return snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === currentUid);
}

// --- CHAT MEDIA UPLOAD (images/videos for chat) ---
export async function uploadChatMediaAsync(uri, type) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = type && type.includes('video') ? '.mp4' : '.jpg';
  const filename = 'chatMedia/' + Date.now() + ext;
  const refStorage = ref(storage, filename);
  await uploadBytes(refStorage, blob);
  return await getDownloadURL(refStorage);
}

// --- AVATAR UPLOAD (Expo/React Native, returns public URL) ---
export async function uploadAvatarToStorage(uid, uri) {
  try {
    const response = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const blob = new Blob([
      Uint8Array.from(atob(response), c => c.charCodeAt(0))
    ], { type: 'image/jpeg' });
    const avatarRef = ref(storage, `avatars/${uid}/avatar.jpg`);
    await uploadBytes(avatarRef, blob);
    return await getDownloadURL(avatarRef);
  } catch (err) {
    console.log('Avatar upload error:', err);
    throw err;
  }
}

// --- PROFILE UPDATE (Firestore, partial merge) ---
export async function updateProfile(uid, data) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  } catch (err) {
    console.log('Profile update error:', err);
    throw err;
  }
}

// --- EMOJI REACTIONS (add/remove for a message) ---
export async function toggleMessageReaction(messageId, emoji, userId) {
  const messageRef = doc(db, 'messages', messageId);
  const snap = await getDoc(messageRef);
  const data = snap.data();
  const current = (data.reactions && data.reactions[emoji]) || [];
  let update = {};
  if (current.includes(userId)) {
    update[`reactions.${emoji}`] = current.filter((uid) => uid !== userId);
  } else {
    update[`reactions.${emoji}`] = [...current, userId];
  }
  await updateDoc(messageRef, update);
}

// --- WALLET: Send M1A Coin from one user to another by username ---
export async function sendM1ACoin(fromUid, toUsername, amount) {
  if (amount <= 0) throw new Error('Enter a valid amount');
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', toUsername.toLowerCase()));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('Recipient not found');
  const toUserDoc = snapshot.docs[0];
  const toUid = toUserDoc.id;

  const fromRef = doc(db, 'users', fromUid);
  const toRef = doc(db, 'users', toUid);
  const fromSnap = await getDoc(fromRef);
  const toSnap = await getDoc(toRef);
  const fromBalance = fromSnap.data().wallet || 0;
  const toBalance = toSnap.data().wallet || 0;
  if (fromBalance < amount) throw new Error('Insufficient M1A Coin');

  // Not atomic, but fine for MVP
  await setDoc(fromRef, { wallet: fromBalance - amount }, { merge: true });
  await setDoc(toRef, { wallet: toBalance + amount }, { merge: true });

  await addDoc(collection(db, 'transactions'), {
    from: fromUid,
    to: toUid,
    amount,
    timestamp: serverTimestamp(),
    type: 'tip', // or 'payment'
  });
}

// --- Get recent transactions for a user ---
export async function getUserTransactions(uid) {
  const q = query(
    collection(db, 'transactions'),
    where('from', '==', uid)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
