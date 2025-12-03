// navigation/DrawerNavigator.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext';
import { auth } from '../firebase';
import { getAvatarSource, getImageKey } from '../utils/photoUtils';
import M1ALogo from '../components/M1ALogo';

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
  const navigation = props.navigation;

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Get avatar source using utility function for consistency
  const avatarSource = getAvatarSource(user);
  const avatarKey = getImageKey(user, 'drawer-avatar');

  return (
    <View style={[styles.drawerContainer, { backgroundColor: theme.background }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        {/* Brand Header */}
        <View style={[styles.brandHeader, { borderBottomColor: theme.border }]}>
          <M1ALogo size={48} variant="icon" style={styles.brandLogo} />
        </View>

        {/* User Info Section */}
        <View style={[styles.userSection, { borderBottomColor: theme.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.primary + '20' }]}>
            {avatarSource ? (
              <Image
                source={avatarSource}
                style={styles.avatarImage}
                key={avatarKey}
                onError={(error) => {
                  console.warn('Drawer avatar image failed to load:', error.nativeEvent.error);
                }}
                onLoad={() => {
                  console.log('✅ Drawer avatar loaded successfully');
                }}
              />
            ) : (
              <Ionicons name="person" size={32} color={theme.primary} />
            )}
          </View>
          <Text 
            style={[styles.userName, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user?.displayName || user?.username || 'User'}
          </Text>
          <Text 
            style={[styles.userEmail, { color: theme.subtext }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {user?.email || auth.currentUser?.email || ''}
          </Text>
        </View>

        {/* Drawer Items */}
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Logout Button - Fixed at bottom */}
      <View style={[styles.logoutSection, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.cardBackground }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
          <Text style={[styles.logoutText, { color: '#FF3B30' }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
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
          width: 300,
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          marginLeft: 0,
          paddingLeft: 0,
        },
        drawerItemStyle: {
          borderRadius: 10,
          marginHorizontal: 12,
          marginVertical: 4,
          paddingVertical: 4,
          paddingHorizontal: 8,
          minHeight: 48,
        },
        drawerActiveBackgroundColor: theme.primary + '20',
        drawerInactiveBackgroundColor: 'transparent',
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
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="search-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="MessagesDrawer"
        component={MessagesScreen}
        options={{
          drawerLabel: 'Messages',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="chatbubble-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="WalletDrawer"
        component={WalletScreen}
        options={{
          drawerLabel: 'Wallet',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="wallet-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      {/* Profile is handled by AppNavigator's ProfileTab (ProfileStackNavigator) */}
      {/* This drawer item navigates to the ProfileTab which has ProfileEdit access */}
      <Drawer.Screen
        name="ProfileDrawer"
        component={ProfileScreen}
        options={{
          drawerLabel: 'Profile',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
        listeners={({ navigation }) => ({
          drawerItemPress: (e) => {
            // Navigate to ProfileTab in AppNavigator instead of ProfileDrawer
            e.preventDefault();
            navigation.navigate('MainApp', { screen: 'Profile' });
          },
        })}
      />

      {/* Divider Section */}
      <Drawer.Screen
        name="Divider1"
        component={View}
        options={{
          drawerLabel: () => null,
          drawerItemStyle: { 
            height: 1, 
            backgroundColor: theme.border, 
            marginVertical: 12,
            marginHorizontal: 16,
            padding: 0,
            minHeight: 1,
          },
        }}
      />

      {/* Features */}
      <Drawer.Screen
        name="AutoPoster"
        component={AutoPosterScreen}
        options={{
          drawerLabel: 'Auto-Poster',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="share-social-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="EventBooking"
        component={EventBookingScreen}
        options={{
          drawerLabel: 'Book Event',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="calendar-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="ServiceBooking"
        component={ServiceBookingScreen}
        options={{
          drawerLabel: 'Book Service',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="construct-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="BarMenu"
        component={BarMenuScreen}
        options={{
          drawerLabel: 'Bar Menu',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="wine-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="Users"
        component={UsersScreen}
        options={{
          drawerLabel: 'Explore Users',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="people-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          drawerLabel: 'Calendar',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="calendar-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      {/* Divider Section */}
      <Drawer.Screen
        name="Divider2"
        component={View}
        options={{
          drawerLabel: () => null,
          drawerItemStyle: { 
            height: 1, 
            backgroundColor: theme.border, 
            marginVertical: 12,
            marginHorizontal: 16,
            padding: 0,
            minHeight: 1,
          },
        }}
      />

      {/* Settings & Support */}
      <Drawer.Screen
        name="M1ADashboard"
        component={M1ADashboardScreen}
        options={{
          drawerLabel: 'M1A Dashboard',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="grid-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="M1ASettings"
        component={M1ASettingsScreen}
        options={{
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="settings-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{
          drawerLabel: 'Help & Support',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="help-circle-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          drawerLabel: 'Send Feedback',
          drawerIcon: ({ color, size, focused }) => (
            <Ionicons name="chatbox-ellipses-outline" size={size || 24} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
  },
  drawerContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  brandHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  brandLogo: {
    marginBottom: 8,
  },
  userSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    maxWidth: '100%',
  },
  userEmail: {
    fontSize: 13,
    maxWidth: '100%',
  },
  drawerItemsContainer: {
    flex: 1,
    paddingTop: 4,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
});

