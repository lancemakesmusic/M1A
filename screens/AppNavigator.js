// M1A/screens/AppNavigator.js
import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './screens/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './screens/AppNavigator';

export default function App() {
  const [initialTheme, setInitialTheme] = useState('gold');
  useEffect(() => {
    AsyncStorage.getItem('m1a_theme').then(val => {
      if (val) setInitialTheme(val);
    });
  }, []);
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AppNavigator />
    </ThemeProvider>
  );
}

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Adjust the import paths if needed—assuming all screens are in /screens/
import ProfileScreen from './ProfileScreen';
import ProfileEditScreen from './ProfileEditScreen';
import WalletScreen from './WalletScreen';
// import other screens as you build them

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="ProfileScreen">
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="ProfileEditScreen"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="WalletScreen"
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      {/* Add more screens here */}
    </Stack.Navigator>
  );
}
