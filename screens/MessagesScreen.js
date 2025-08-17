import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebase';

const CONV_ID = 'test-chat';

export default function MessagesScreen() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const coll = collection(db, 'conversations', CONV_ID, 'messages');
    const qref = query(coll, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(qref, (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMsgs(rows);
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }, (err) => {
      console.warn('Messages sub failed:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const send = async () => {
    const uid = auth.currentUser?.uid;
    const t = text.trim();
    if (!uid || !t) return;
    setText('');
    try {
      await addDoc(collection(db, 'conversations', CONV_ID, 'messages'), {
        text: t,
        senderId: uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Send failed:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <SafeAreaView style={styles.safe}>
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={item.senderId === auth.currentUser?.uid ? styles.bubbleMe : styles.bubbleOther}>
              <Text>{item.text}</Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.send} onPress={send} activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#E6F7FF', padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: '80%' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#E9FBF8', padding: 10, borderRadius: 12, marginVertical: 4, maxWidth: '80%' },
  composer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f3f3f3', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  send: { backgroundColor: '#007aff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
});
