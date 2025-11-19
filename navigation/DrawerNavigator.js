// navigation/DrawerNavigator.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { auth } from '../firebase';

// Import the main Tab Navigator
import AppNavigator from './AppNavigator';

// Import all screens for drawer navigation
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import MessagesScreen from '../screens/MessagesScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AutoPosterScreen from '../screens/AutoPosterScreen';
import EventBookingScreen from '../screens/EventBookingScreen';
import ServiceBookingScreen from '../screens/ServiceBookingScreen';
import BarMenuScreen from '../screens/BarMenuScreen';
import M1ADashboardScreen from '../screens/M1ADashboardScreen';
import M1ASettingsScreen from '../screens/M1ASettingsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HelpScreen from '../screens/HelpScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import UsersScreen from '../screens/UsersScreen';

const Drawer = createDrawerNavigator();

// Custom Drawer Content with user info and logout
function CustomDrawerContent(props) {
  const { theme } = useTheme();
  const { user } = useContext(UserContext);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[styles.drawerContent, { backgroundColor: theme.background }]}
    >
      {/* User Info Section */}
      <View style={[styles.userSection, { borderBottomColor: theme.border }]}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="person" size={32} color={theme.primary} />
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>
          {user?.displayName || 'User'}
        </Text>
        <Text style={[styles.userEmail, { color: theme.subtext }]}>
          {user?.email || auth.currentUser?.email || ''}
        </Text>
      </View>

      {/* Drawer Items */}
      <DrawerItemList {...props} />

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.cardBackground }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={[styles.logoutText, { color: '#FF3B30' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: theme.primary,
        drawerInactiveTintColor: theme.subtext,
        drawerStyle: {
          backgroundColor: theme.background,
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: -20,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 8,
          marginVertical: 2,
        },
        drawerActiveBackgroundColor: theme.primary + '15',
      }}
    >
      {/* Main App (Tab Navigator) */}
      <Drawer.Screen
        name="MainApp"
        component={AppNavigator}
        options={{
          drawerLabel: 'Home',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      {/* Quick Access Screens */}
      <Drawer.Screen
        name="ExploreDrawer"
        component={ExploreScreen}
        options={{
          drawerLabel: 'Explore',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="MessagesDrawer"
        component={MessagesScreen}
        options={{
          drawerLabel: 'Messages',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="WalletDrawer"
        component={WalletScreen}
        options={{
          drawerLabel: 'Wallet',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="ProfileDrawer"
        component={ProfileScreen}
        options={{
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />

      {/* Divider Section */}
      <Drawer.Screen
        name="Divider1"
        component={View}
        options={{
          drawerLabel: () => null,
          drawerItemStyle: { height: 1, backgroundColor: theme.border, marginVertical: 8 },
        }}
      />

      {/* Features */}
      <Drawer.Screen
        name="AutoPoster"
        component={AutoPosterScreen}
        options={{
          drawerLabel: 'Auto-Poster',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="share-social-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="EventBooking"
        component={EventBookingScreen}
        options={{
          drawerLabel: 'Book Event',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="ServiceBooking"
        component={ServiceBookingScreen}
        options={{
          drawerLabel: 'Book Service',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="BarMenu"
        component={BarMenuScreen}
        options={{
          drawerLabel: 'Bar Menu',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="wine-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          drawerLabel: 'Explore Users',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          drawerLabel: 'Calendar',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Divider Section */}
      <Drawer.Screen
        name="Divider2"
        component={View}
        options={{
          drawerLabel: () => null,
          drawerItemStyle: { height: 1, backgroundColor: theme.border, marginVertical: 8 },
        }}
      />

      {/* Settings & Support */}
      <Drawer.Screen
        name="M1ADashboard"
        component={M1ADashboardScreen}
        options={{
          drawerLabel: 'M1A Dashboard',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="M1ASettings"
        component={M1ASettingsScreen}
        options={{
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{
          drawerLabel: 'Help & Support',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          drawerLabel: 'Send Feedback',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbox-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  userSection: {
    padding: 20,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  logoutSection: {
    marginTop: 'auto',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

