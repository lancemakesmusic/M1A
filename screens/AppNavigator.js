// screens/AppNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from './HomeScreen';
import ExploreScreen from './ExploreScreen';
import MenuScreen from './MenuScreen';
import ProfileScreen from './ProfileScreen';
import ProfileEditScreen from './ProfileEditScreen';
import WalletScreen from './WalletScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tabs (Home, Explore, Profile, Menu)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#121212', borderTopColor: '#222' },
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Home: 'home',
            Explore: 'search',
            Profile: 'person',
            Menu: 'menu',
          };
          return <Ionicons name={icons[route.name]} color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
}

// App Navigator (Stacks)
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#181818' }, headerTintColor: '#FFD700' }}>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileEditScreen" component={ProfileEditScreen} options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="WalletScreen" component={WalletScreen} options={{ title: 'Wallet' }} />
    </Stack.Navigator>
  );
}
