import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { functions, db, auth } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function WalletScreen() {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const userDoc = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDoc, (docSnap) => {
      if (docSnap.exists()) setBalance(docSnap.data().balance || 0);
    });
    return unsubscribe;
  }, []);

  const logTransaction = async (type, amount) => {
    const txRef = collection(db, 'users', user.uid, 'transactions');
    await addDoc(txRef, {
      type,
      amount,
      timestamp: serverTimestamp(),
    });
  };

  const parseAmount = () => {
    const cleaned = amount.replace(/[^0-9.]/g, '');
    const floatVal = parseFloat(cleaned);
    return isNaN(floatVal) ? 0 : Math.floor(floatVal * 100);
  };

  const handleAddFunds = async () => {
    const intAmount = parseAmount();
    if (!intAmount || intAmount < 50) {
      Alert.alert("Error", "Enter at least $0.50");
      return;
    }

    setLoading(true);
    try {
      const createIntent = httpsCallable(functions, 'createStripePaymentIntent');
      const result = await createIntent({ amount: intAmount });
      const { clientSecret } = result.data;

      const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret });
      if (initError) {
        Alert.alert("Init Error", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        Alert.alert("Payment Failed", presentError.message);
        return;
      }

      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, { balance: increment(intAmount) });
      await logTransaction("add", intAmount);
      Alert.alert("Success", `$${intAmount / 100} added to wallet.`);
      setAmount('');
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSpendFunds = async () => {
    const intAmount = parseAmount();
    if (intAmount > balance) {
      Alert.alert("Insufficient Funds");
      return;
    }

    setLoading(true);
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, { balance: increment(-intAmount) });
      await logTransaction("spend", intAmount);
      Alert.alert("Purchase Complete", `$${intAmount / 100} deducted`);
      setAmount('');
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not complete transaction.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading user...</Text>
      </View>
    );
  }

  return (
    <StripeProvider publishableKey="pk_test_51RlfuGIHhqOsi2Fx2QrqIaiT9wvuUb4rApZulITAgwXHtDdqoRkKZLL14PThK5q1KxOHf1MrIbjfBCJsLIQVYFtZ00myJxiRb3">
      <View style={styles.container}>
        <Text style={styles.title}>Wallet Balance</Text>
        <Text style={styles.balance}>${(balance / 100).toFixed(2)}</Text>

        <TextInput
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />

        <Button title="Add Funds" onPress={handleAddFunds} disabled={loading} />
        <View style={{ marginVertical: 10 }} />
        <Button title="Spend Funds" onPress={handleSpendFunds} disabled={loading} />
        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
      </View>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  balance: { fontSize: 36, textAlign: 'center', marginVertical: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 10, borderRadius: 6 },
});
