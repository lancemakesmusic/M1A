// components/CustomDrawerContent.js
// Enhanced drawer content with categorized sections

import React, { useContext, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useRole } from '../contexts/RoleContext';
import { auth } from '../firebase';
import { getAvatarSource, getImageKey } from '../utils/photoUtils';
import M1ALogo from '../components/M1ALogo';
import DrawerSectionHeader from '../components/DrawerSectionHeader';

export default function CustomDrawerContent(props) {
  const { theme } = useTheme();
  const { user } = useContext(UserContext);
  const { userPersona, getPersonaColor } = useM1APersonalization();
  const { isAdminEmail } = useRole();
  const navigation = props.navigation;
  const isAdmin = auth.currentUser?.email === 'admin@merkabaent.com';

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

  // Define drawer items with categories
  const drawerItems = useMemo(() => {
    const items = {
      main: [
        {
          name: 'ExploreDrawer',
          label: 'Explore',
          icon: 'search-outline',
          screen: 'ExploreDrawer',
        },
        {
          name: 'MessagesDrawer',
          label: 'Messages',
          icon: 'chatbubble-outline',
          screen: 'MessagesDrawer',
        },
        {
          name: 'WalletDrawer',
          label: 'Wallet',
          icon: 'wallet-outline',
          screen: 'WalletDrawer',
        },
        {
          name: 'ProfileDrawer',
          label: 'Profile',
          icon: 'person-outline',
          screen: 'ProfileDrawer',
          specialNav: true, // Navigate to MainApp Profile tab
        },
      ],
      features: [
        {
          name: 'AutoPoster',
          label: 'Auto-Poster',
          icon: 'share-social-outline',
          screen: 'AutoPoster',
        },
        {
          name: 'EventBooking',
          label: 'Book Event',
          icon: 'calendar-outline',
          screen: 'EventBooking',
        },
        {
          name: 'ServiceBooking',
          label: 'Book Service',
          icon: 'construct-outline',
          screen: 'ServiceBooking',
        },
        {
          name: 'BarMenu',
          label: 'Bar Menu',
          icon: 'wine-outline',
          screen: 'BarMenu',
        },
        {
          name: 'Users',
          label: 'Explore Users',
          icon: 'people-outline',
          screen: 'Users',
        },
        {
          name: 'Calendar',
          label: 'Calendar',
          icon: 'calendar-outline',
          screen: 'Calendar',
        },
      ],
      tools: [
        {
          name: 'M1ADashboard',
          label: 'M1A Dashboard',
          icon: 'grid-outline',
          screen: 'M1ADashboard',
        },
      ],
      settings: [
        {
          name: 'M1ASettings',
          label: 'Settings',
          icon: 'settings-outline',
          screen: 'M1ASettings',
        },
        {
          name: 'Help',
          label: 'Help & Support',
          icon: 'help-circle-outline',
          screen: 'Help',
        },
        {
          name: 'Feedback',
          label: 'Send Feedback',
          icon: 'chatbox-ellipses-outline',
          screen: 'Feedback',
        },
      ],
      admin: isAdmin ? [
        {
          name: 'AdminControlCenter',
          label: 'Control Center',
          icon: 'settings-outline',
          screen: 'AdminControlCenter',
        },
        {
          name: 'AdminEventCreation',
          label: 'Create Event',
          icon: 'add-circle-outline',
          screen: 'AdminEventCreation',
        },
        {
          name: 'AdminUserManagement',
          label: 'User Management',
          icon: 'people-outline',
          screen: 'AdminUserManagement',
        },
      ] : [],
    };

    return items;
  }, [isAdmin]);

  const { state } = props;
  const currentRoute = state.routes[state.index]?.name;

  const renderDrawerItem = (item) => {
    const focused = currentRoute === item.screen || currentRoute === item.name;
    
    const handlePress = () => {
      if (item.specialNav) {
        // Special navigation for Profile
        navigation.navigate('MainApp', { screen: 'Profile' });
      } else {
        navigation.navigate(item.screen);
      }
    };

    return (
      <TouchableOpacity
        key={item.name}
        style={[
          styles.drawerItem,
          {
            backgroundColor: focused ? theme.primary + '20' : 'transparent',
            borderRadius: 10,
            marginHorizontal: 12,
            marginVertical: 4,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.drawerItemContent}>
          <View style={[styles.drawerItemIcon, { backgroundColor: focused ? theme.primary + '15' : 'transparent' }]}>
            <Ionicons name={item.icon} size={24} color={focused ? theme.primary : theme.subtext} />
          </View>
          <Text
            style={[
              styles.drawerItemLabel,
              {
                color: focused ? theme.primary : theme.text,
                fontWeight: focused ? '600' : '500',
              }
            ]}
          >
            {item.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
          {userPersona && (
            <View style={[styles.personaBadge, { backgroundColor: getPersonaColor() + '20', borderColor: getPersonaColor() }]}>
              <Ionicons name={userPersona.icon} size={14} color={getPersonaColor()} />
              <Text style={[styles.personaBadgeText, { color: getPersonaColor() }]}>
                {userPersona.title}
              </Text>
            </View>
          )}
        </View>

        {/* Main Navigation Section */}
        {drawerItems.main.length > 0 && (
          <>
            <DrawerSectionHeader 
              title="Main" 
              icon={<Ionicons name="apps-outline" size={14} color={theme.primary} />}
            />
            {drawerItems.main.map((item) => renderDrawerItem(item))}
          </>
        )}

        {/* Features Section */}
        {drawerItems.features.length > 0 && (
          <>
            <DrawerSectionHeader 
              title="Features" 
              icon={<Ionicons name="star-outline" size={14} color={theme.primary} />}
            />
            {drawerItems.features.map((item) => renderDrawerItem(item))}
          </>
        )}

        {/* Tools Section */}
        {drawerItems.tools.length > 0 && (
          <>
            <DrawerSectionHeader 
              title="Tools" 
              icon={<Ionicons name="construct-outline" size={14} color={theme.primary} />}
            />
            {drawerItems.tools.map((item) => renderDrawerItem(item))}
          </>
        )}

        {/* Admin Section */}
        {isAdmin && drawerItems.admin.length > 0 && (
          <>
            <DrawerSectionHeader 
              title="Admin" 
              icon={<Ionicons name="shield-checkmark-outline" size={14} color="#FF3B30" />}
            />
            {drawerItems.admin.map((item) => renderDrawerItem(item))}
          </>
        )}

        {/* Settings & Support Section */}
        {drawerItems.settings.length > 0 && (
          <>
            <DrawerSectionHeader 
              title="Settings & Support" 
              icon={<Ionicons name="settings-outline" size={14} color={theme.primary} />}
            />
            {drawerItems.settings.map((item) => renderDrawerItem(item))}
          </>
        )}
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
    marginBottom: 8,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    gap: 4,
  },
  personaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  drawerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerItemLabel: {
    fontSize: 16,
    flex: 1,
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

