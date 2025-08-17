import { doc, onSnapshot } from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { auth, db } from '../firebase';

export default function WalletScreen() {
  const { user } = useContext(UserContext);
  const [balance, setBalance] = useState(user?.wallet ?? null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(ref, (snap) => {
      setBalance(snap.data()?.wallet ?? 0);
    });
    return () => unsub();
  }, []);

  if (balance === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.label}>Wallet Balance</Text>
        <Text style={styles.amount}>${Number(balance).toFixed(2)}</Text>
      </View>

      <TouchableOpacity style={styles.btn} disabled>
        <Text style={styles.btnText}>Add Funds (coming soon)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, { backgroundColor: '#eee' }]} disabled>
        <Text style={[styles.btnText, { color: '#666' }]}>Withdraw (coming soon)</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff', padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  card: { backgroundColor: '#0a84ff10', borderRadius: 14, padding: 20, marginBottom: 16 },
  label: { color: '#666', marginBottom: 6 },
  amount: { fontSize: 28, fontWeight: '800' },
  btn: { backgroundColor: '#007aff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
