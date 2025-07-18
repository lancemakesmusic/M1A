import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    try {
      setError('');
      setLoading(true);

      if (!email || !password) {
        setError('Email and password are required.');
        return;
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }

      navigation.replace('Main'); // make sure 'Main' matches Stack.Screen name in App.js
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Check your email', 'A password reset link has been sent.');
    } catch (err) {
      setError(err.message || 'Error sending reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{isLogin ? 'Login' : 'Create Account'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={isLogin ? 'Login' : 'Create Account'}
        onPress={handleAuth}
        disabled={loading}
      />

      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

      {isLogin && (
        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.toggle} onPress={() => setIsLogin(!isLogin)}>
        {isLogin
          ? "Don't have an account? Create one"
          : 'Already have an account? Login'}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
  toggle: { marginTop: 15, color: '#007AFF', textAlign: 'center' },
  forgotBtn: { marginTop: 10, alignItems: 'center' },
  forgotText: { color: '#007AFF', textAlign: 'center', textDecorationLine: 'underline' }
});
