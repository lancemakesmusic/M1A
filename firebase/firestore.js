import { addDoc, collection, getDocs, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Send a message
export async function sendMessage({ text }) {
  return await addDoc(collection(db, 'messages'), {
    text,
    uid: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  });
}

// Listen to messages (pass a callback function)
export function subscribeToMessages(callback) {
  const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, snapshot => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  });
}

// Get all menu items
export async function getMenuItems() {
  const snapshot = await getDocs(collection(db, 'menuItems'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get all events
export async function getEvents() {
  const snapshot = await getDocs(collection(db, 'events'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
