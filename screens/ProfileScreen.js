// screens/ProfileScreen.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user.displayName || 'Unnamed User'}</Text>
      <Text style={styles.username}>@{user.username || 'username'}</Text>

      <TouchableOpacity onPress={() => navigation.navigate('ProfileEditScreen')}>
        <Text style={styles.link}>Edit Profile</Text>
      </TouchableOpacity>
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
  username: {
    fontSize: 16,
    color: '#777',
    marginBottom: 10,
  },
  link: {
    color: '#007bff',
    fontSize: 16,
  },
});
