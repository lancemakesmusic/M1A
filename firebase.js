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

import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

const firebaseConfig = {
  apiKey: 'AIzaSyDOEDqVKGBxpCFpQliBiIdNX5ebhWdmhHQ',
  authDomain: 'm1alive.firebaseapp.com',
  projectId: 'm1alive',
  storageBucket: 'm1alive.appspot.com',
  messagingSenderId: '83002254287',
  appId: '1:83002254287:web:b802e1e040cb51494668ba',
  measurementId: 'G-6H2QZWTQTV',
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

//
// --------------------------- USER SEARCH & PROFILE ---------------------------
//

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

export async function isUsernameAvailable(username, currentUid) {
  if (!username) return false;
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === currentUid);
}

export async function updateProfile(uid, data) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, data);
}

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');
  return { uid: snap.id, ...snap.data() };
}

export async function updateUserProfileInDB(uid, updates) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
}

export async function checkUsernameUniqueInDB(username, currentUid) {
  const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty || (snapshot.docs.length === 1 && snapshot.docs[0].id === currentUid);
}

//
// ---------------------------- MEDIA & STORAGE HELPERS ----------------------------
//

export async function uploadChatMediaAsync(uri, type) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = type && type.includes('video') ? '.mp4' : '.jpg';
  const filename = 'chatMedia/' + Date.now() + ext;
  const refStorage = ref(storage, filename);
  await uploadBytes(refStorage, blob);
  return await getDownloadURL(refStorage);
}

export async function uploadAvatarToStorage(uid, uri) {
  try {
    const response = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const blob = new Blob([Uint8Array.from(atob(response), c => c.charCodeAt(0))], { type: 'image/jpeg' });
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

export async function getUserWallet(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? (snap.data().wallet || 0) : 0;
}

export async function addFundsToWallet(uid, amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const prev = snap.data().wallet || 0;
  await updateDoc(userRef, { wallet: prev + amount });
}

export async function deductFromWallet(uid, amount, meta = {}) {
  if (amount <= 0) throw new Error('Invalid deduction amount');
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const prev = snap.data().wallet || 0;
  if (prev < amount) throw new Error('Insufficient balance');
  await updateDoc(userRef, { wallet: prev - amount });
}

//
// ------------------- MENU, EVENTS, BOOKINGS: PURCHASABLE SERVICES -------------------
//

export async function getMenuItems() {
  const menuRef = collection(db, 'menuItems');
  const snapshot = await getDocs(menuRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getEvents() {
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(eventsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

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

export async function buyEventTicket(uid, eventId, quantity = 1) {
  if (!uid || !eventId || quantity <= 0) throw new Error('Missing ticket info');
  const eventRef = doc(db, 'events', eventId);
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) throw new Error('Event not found');
  const eventData = eventSnap.data();
  if (eventData.ticketsAvailable < quantity) throw new Error('Not enough tickets');
  await deductFromWallet(uid, eventData.price * quantity, { type: 'ticket', eventId });
  await updateDoc(eventRef, { ticketsAvailable: eventData.ticketsAvailable - quantity });
  await addDoc(collection(db, 'tickets'), {
    user: uid,
    eventId,
    quantity,
    timestamp: serverTimestamp(),
  });
}

export async function purchaseMenuItems(uid, cart) {
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
    update[`reactions.${emoji}`] = current.filter(uid => uid !== userId);
  } else {
    update[`reactions.${emoji}`] = [...current, userId];
  }
  await updateDoc(messageRef, update);
}
