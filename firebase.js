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

// Persistent Auth for React Native (Expo)
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

// Firebase Config
const firebaseConfig = {
  apiKey: 'AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ',
  authDomain: 'm1alive.firebaseapp.com',
  projectId: 'm1alive',
  storageBucket: 'm1alive.appspot.com',
  messagingSenderId: '83002254287',
  appId: '1:83002254287:web:b802e1e040cb51494668ba',
  measurementId: 'G-6H2QZWTQTV',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Persistent Auth across sessions
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

//
// --------------------------- USER SEARCH & PROFILE ---------------------------
//

// Search users by username (case-insensitive, partial)
export async function searchUsersByUsername(username) {
  if (!username) return [];
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('username', '>=', username.toLowerCase()),
    where('username', '<=', username.toLowerCase() + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Check username availability (live check)
export async function isUsernameAvailable(username, currentUid) {
  if (!username) return false;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  // True if no match, or only matches current user
  return snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === currentUid);
}

// Update profile fields (partial update)
export async function updateProfile(uid, data) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  } catch (err) {
    console.log('Profile update error:', err);
    throw err;
  }
}

//
// ---------------------------- MEDIA & STORAGE HELPERS ----------------------------
//

// Upload chat images/videos, return public URL
export async function uploadChatMediaAsync(uri, type) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = type && type.includes('video') ? '.mp4' : '.jpg';
  const filename = 'chatMedia/' + Date.now() + ext;
  const refStorage = ref(storage, filename);
  await uploadBytes(refStorage, blob);
  return await getDownloadURL(refStorage);
}

// Upload avatar, return public URL
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

//
// ---------------------------- WALLET HELPERS (MVP) ----------------------------
//

// Get user's wallet balance (returns 0 if missing)
export async function getUserWallet(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data().wallet || 0) : 0;
}

// Add funds to wallet (simulate "reloading" money)
export async function addFundsToWallet(uid, amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const prev = snap.data().wallet || 0;
  await updateDoc(userRef, { wallet: prev + amount });
  // Optionally add transaction log here
}

// Deduct from wallet (for purchases, bookings, etc.)
export async function deductFromWallet(uid, amount, meta = {}) {
  if (amount <= 0) throw new Error('Invalid deduction amount');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const prev = snap.data().wallet || 0;
  if (prev < amount) throw new Error('Insufficient balance');
  await updateDoc(userRef, { wallet: prev - amount });
  // Optionally add transaction log here, meta = { type, orderId, etc }
}

//
// ------------------- MENU, EVENTS, BOOKINGS: PURCHASABLE SERVICES -------------------
//

// Get all menu items (for drinks/snacks)
export async function getMenuItems() {
  const menuRef = collection(db, 'menuItems');
  const snapshot = await getDocs(menuRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get all events (for ticket purchases)
export async function getEvents() {
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(eventsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Book a service (studio/podcast/photo/video)
export async function bookService(uid, type, startTime, endTime, price) {
  if (!uid || !type || !startTime || !endTime || !price) throw new Error('Missing booking info');
  await deductFromWallet(uid, price, { type: 'booking', service: type });
  await addDoc(collection(db, 'bookings'), {
    user: uid,
    type,
    startTime,
    endTime,
    price,
    status: 'confirmed',
    timestamp: serverTimestamp()
  });
}

// Buy event ticket(s)
export async function buyEventTicket(uid, eventId, quantity = 1) {
  if (!uid || !eventId || quantity <= 0) throw new Error('Missing ticket info');
  // Get event price and available tickets
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) throw new Error('Event not found');
  const eventData = eventSnap.data();
  if (eventData.ticketsAvailable < quantity) throw new Error('Not enough tickets');
  // Deduct from wallet
  await deductFromWallet(uid, eventData.price * quantity, { type: 'ticket', eventId });
  // Update ticketsAvailable
  await updateDoc(eventRef, { ticketsAvailable: eventData.ticketsAvailable - quantity });
  // Optionally add ticket record for user
  await addDoc(collection(db, 'tickets'), {
    user: uid,
    eventId,
    quantity,
    timestamp: serverTimestamp(),
  });
}

// Order menu item(s)
export async function purchaseMenuItems(uid, cart) {
  // cart = [{ id, name, price, qty }, ...]
  if (!uid || !Array.isArray(cart) || cart.length === 0) throw new Error('Cart empty');
  const total = cart.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  await deductFromWallet(uid, total, { type: 'menu', cart });
  await addDoc(collection(db, 'orders'), {
    user: uid,
    items: cart,
    total,
    timestamp: serverTimestamp(),
  });
}

// Get a user's transaction/order history
export async function getUserOrders(uid) {
  const q = query(collection(db, 'orders'), where('user', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getUserBookings(uid) {
  const q = query(collection(db, 'bookings'), where('user', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getUserTickets(uid) {
  const q = query(collection(db, 'tickets'), where('user', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

//
// ------------------- EMOJI REACTIONS -------------------
//

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
