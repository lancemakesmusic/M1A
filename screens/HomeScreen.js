import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from './contexts/ThemeContext';
import { UserContext } from './contexts/UserContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { user } = useContext(UserContext);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.primary }]}>M1A Home</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>
        {user?.displayName ? `Welcome back, ${user.displayName}!` : 'Welcome to your social, event, and artist platform!'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 320,
  },
});
