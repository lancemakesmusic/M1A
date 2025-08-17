import {
    addDoc,
    collection,
    doc, getDoc,
    getDocs, limit,
    orderBy,
    query,
    serverTimestamp
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { auth, db } from '../firebase';

export default function DebugPermissionsScreen() {
  const [log, setLog] = useState([]);
  const cid = 'test-chat'; // change if needed

  function push(msg) {
    console.log('[DEBUGPERM]', msg);
    setLog((x) => [...x, String(msg)]);
  }

  async function run() {
    try {
      setLog([]);
      const uid = auth.currentUser?.uid;
      push(`uid=${uid} cid=${cid}`);

      // 1) Read parent conversation doc + show members
      const cref = doc(db, 'conversations', cid);
      const csnap = await getDoc(cref);
      if (!csnap.exists()) {
        push('conversation doc does NOT exist');
      } else {
        const data = csnap.data();
        push(`conversation exists. members=${JSON.stringify(data.members)}`);
      }

      // 2) Try reading a few messages
      const mcol = collection(db, `conversations/${cid}/messages`);
      const q = query(mcol, orderBy('createdAt', 'desc'), limit(5));
      const msnap = await getDocs(q);
      push(`read messages ok. count=${msnap.size}`);

      // 3) Try a test write (will fail/pass based on rules)
      const payload = {
        senderId: uid,
        text: '[diag] hello',
        createdAt: serverTimestamp(),
      };
      await addDoc(mcol, payload);
      push('write OK: created test message');
    } catch (e) {
      push(`ERROR: ${e?.message || e}`);
    }
  }

  useEffect(() => { run(); }, []);

  return (
    <ScrollView style={{ flex:1, padding:16 }}>
      <Text style={{ fontWeight:'bold', marginBottom:12 }}>Debug Permissions</Text>
      {log.map((l, i) => (<Text key={i} style={{ marginBottom:6 }}>{l}</Text>))}
      <View style={{ height:12 }} />
      <Button title="Run again" onPress={run} />
    </ScrollView>
  );
}
