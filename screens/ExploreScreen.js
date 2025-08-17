import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { db } from '../firebase';

export default function ExploreScreen() {
  const [items, setItems] = useState([]);
  const [qText, setQText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const qref = query(collection(db, 'menuItems'), orderBy('name'));
        const snap = await getDocs(qref);
        if (!mounted) return;
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.warn('Explore load failed:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return items;
    return items.filter(x =>
      String(x.name || '').toLowerCase().includes(t) ||
      String(x.description || '').toLowerCase().includes(t)
    );
  }, [items, qText]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TextInput
        style={styles.input}
        placeholder="Search artists, services, packages…"
        value={qText}
        onChangeText={setQText}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.85}>
            <Text style={styles.title}>{item.name || 'Untitled'}</Text>
            {item.price ? <Text style={styles.sub}>${item.price}</Text> : null}
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No results.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  input: { margin: 16, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10 },
  card: { backgroundColor: '#E9FBF8', borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sub: { color: '#555', marginBottom: 6 },
  desc: { color: '#666' },
  empty: { textAlign: 'center', color: '#777', marginTop: 32 },
});
