// firebase/firestore.js
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase'; // adjust if your firebase.js path differs

/**
 * Subscribe to messages within a specific conversation.
 * - cid: conversation ID (string)
 * - setMessages: React state setter (array of docs)
 */
export function subscribeToMessages(cid, setMessages) {
  if (!cid) throw new Error('subscribeToMessages: missing cid');

  const path = `conversations/${cid}/messages`;
  console.log('[DEBUG] subscribe path:', path);

  const q = query(collection(db, path), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(messages);
    },
    (err) => console.error('[DEBUG] subscribe error:', err?.message || err)
  );
}

/**
 * Send a text or media message.
 * Rules require: { senderId == auth.uid, text|mediaUrl present, createdAt timestamp }
 */
export async function sendMessage(cid, { text, mediaUrl } = {}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  if (!cid) throw new Error('sendMessage: missing cid');
  if (!text && !mediaUrl) throw new Error('Provide text or mediaUrl');

  const payload = {
    senderId: uid,                // <-- rules expect senderId, not uid
    ...(text ? { text } : {}),
    ...(mediaUrl ? { mediaUrl } : {}),
    createdAt: serverTimestamp(), // <-- rules expect timestamp
  };

  const path = `conversations/${cid}/messages`;
  console.log('[DEBUG] writing to:', path, 'payload:', payload);

  return addDoc(collection(db, path), payload);
}

/* If you still need these helpers, keep them pointing to their own collections.
   They are unrelated to chat permissions, but leaving as-is is fine.
*/
// Example:
// export async function getMenuItems() { ... }
// export async function getEvents() { ... }
