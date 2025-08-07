// M1A/screens/MenuScreen.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen() {
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          auth.signOut().then(() => {
            navigation.replace('authscreen'); // Ensure lowercase matches App.js route
          });
        },
      },
    ]);
  };

  const menuItems = [
    { label: 'My Profile', icon: 'person-outline', action: () => navigation.navigate('ProfileScreen') },
    { label: 'Edit Profile', icon: 'create-outline', action: () => navigation.navigate('ProfileEditScreen') },
    { label: 'Wallet', icon: 'wallet-outline', action: () => navigation.navigate('WalletScreen') },
    { label: 'Settings', icon: 'settings-outline', action: () => navigation.navigate('SettingsScreen') },
    { label: 'Log Out', icon: 'log-out-outline', action: handleLogout },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu</Text>
      {menuItems.map((item, index) => (
        <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action}>
          <Ionicons name={item.icon} size={22} color="#FFD700" style={styles.icon} />
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 30,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232323',
    padding: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderColor: '#FFD700',
    borderWidth: 1,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});
