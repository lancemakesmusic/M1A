import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import { UserProvider } from './screens/contexts/UserContext';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import AuthScreen from './screens/AuthScreen';
import { ThemeProvider } from './screens/contexts/ThemeContext';

// ---- Screens ----
import HomeScreen from './screens/HomeScreen';
import ExploreScreen from './screens/ExploreScreen';
import MessagesScreen from './screens/MessagesScreen';
import WalletScreen from './screens/WalletScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function MainApp() {
  return (
    <UserProvider>
      <NavigationContainer>
        <Tab.Navigator
          initialRouteName="Home"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
              else if (route.name === 'Explore') iconName = focused ? 'search' : 'search-outline';
              else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              else if (route.name === 'Wallet') iconName = focused ? 'wallet' : 'wallet-outline';
              else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Explore" component={ExploreScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Wallet" component={WalletScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </UserProvider>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />
      ) : !user ? (
        <AuthScreen />
      ) : (
        <MainApp />
      )}
    </ThemeProvider>
  );
}
