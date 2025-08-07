// screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to M1A 👋</Text>
      <Text style={styles.subText}>Feed coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subText: {
    marginTop: 10,
    fontSize: 16,
    color: '#777',
  },
});
