import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserContext } from './contexts/UserContext'; // Adjust if needed

export default function WalletScreen() {
  const { user } = useContext(UserContext); // Adjust if your context is different
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setErr('User not logged in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((docSnap) => {
        if (docSnap.exists()) {
          setWallet(docSnap.data().wallet ?? 0);
        } else {
          setErr('No wallet found for this user.');
        }
      })
      .catch((e) => setErr('Failed to load wallet.'))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  if (loading) return <ActivityIndicator style={{ marginTop: 64 }} />;
  if (err) return <Text style={{ color: 'red', marginTop: 64 }}>{err}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.balanceLabel}>Your M1A Balance:</Text>
      <Text style={styles.balanceAmount}>{wallet}</Text>
      {/* Add more wallet UI/actions here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  balanceLabel: { fontSize: 18, marginBottom: 8 },
  balanceAmount: { fontSize: 40, fontWeight: 'bold' },
});
