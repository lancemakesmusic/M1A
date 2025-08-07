// screens/WalletScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function WalletScreen() {
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      setBalance(docSnap.data()?.balance || 0);
    });

    return () => unsub();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      {balance === null ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.balance}>Balance: ${balance.toFixed(2)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  balance: {
    marginTop: 10,
    fontSize: 20,
    color: '#222',
  },
});
