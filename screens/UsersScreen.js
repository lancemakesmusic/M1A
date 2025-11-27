/**
 * Users Screen - Modern, user-friendly marketplace design
 * Inspired by top apps like LinkedIn, Instagram, and professional networking platforms
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage, trackSearch } from '../services/AnalyticsService';
import { getAvatarUrl } from '../utils/photoUtils';

const { width } = Dimensions.get('window');


export default function UsersScreen({ navigation: navProp, selectedPersonaFilter = 'All' }) {
  const navHook = useNavigation();
  const navigation = navProp || navHook;
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { userPersona: currentPersona } = useM1APersonalization();
  useScreenTracking('UsersScreen');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load from Firestore - REQUIRED, no mock fallback
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('private', '==', false),
          orderBy('displayName'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const firestoreUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Enrich with persona data
        const enrichedUsers = firestoreUsers.map(u => ({
          ...u,
          persona: u.persona || 'vendor',
          personaTitle: u.personaTitle || 'Vendor',
          services: u.services || [],
          rating: u.rating || 4.5,
          reviews: u.reviews || 0,
          priceRange: u.priceRange || '$50-$500',
          isOnline: u.isOnline || false,
          verified: u.verified || false,
        }));
        setUsers(enrichedUsers);
      } else {
        console.warn('Firestore not ready, showing empty list');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    let filtered = users.filter(u => u.id !== currentUser?.uid); // Exclude current user
    
    // Persona filter (from parent ExploreScreen)
    if (selectedPersonaFilter !== 'All') {
      filtered = filtered.filter(u => u.personaTitle === selectedPersonaFilter);
    }
    
    return filtered;
  }, [users, selectedPersonaFilter, currentUser]);

  const ensureConversationExists = useCallback(
    async (targetUser) => {
      if (!currentUser?.uid || !targetUser?.id) {
        return null;
      }

      const participantIds = [currentUser.uid, targetUser.id].sort();
      const conversationId = participantIds.join('_');

      try {
        if (isFirebaseReady() && db && typeof db.collection !== 'function') {
          const {
            doc: firestoreDoc,
            getDoc: firestoreGetDoc,
            setDoc: firestoreSetDoc,
            serverTimestamp,
          } = await import('firebase/firestore');

          const conversationRef = firestoreDoc(db, 'conversations', conversationId);
          const conversationSnap = await firestoreGetDoc(conversationRef);

          if (!conversationSnap.exists()) {
            await firestoreSetDoc(conversationRef, {
              participants: participantIds,
              participantProfiles: {
                [currentUser.uid]: {
                  name:
                    currentUser.displayName ||
                    currentUser.username ||
                    currentUser.email ||
                    'You',
                  avatar: getAvatarUrl(currentUser) || null,
                },
                [targetUser.id]: {
                  name:
                    targetUser.displayName ||
                    targetUser.username ||
                    targetUser.name ||
                    'User',
                  avatar: getAvatarUrl(targetUser) || null,
                },
              },
              createdAt: serverTimestamp(),
              lastMessage: '',
              lastMessageAt: serverTimestamp(),
              unreadCount: {
                [currentUser.uid]: 0,
                [targetUser.id]: 0,
              },
            });
          }
        }
      } catch (error) {
        console.error('ensureConversationExists error:', error);
        throw error;
      }

      return conversationId;
    },
    [currentUser]
  );

  const getNavigatorChain = useCallback(() => {
    const chain = [];
    let currentNav = navigation;
    while (currentNav && !chain.includes(currentNav)) {
      chain.push(currentNav);
      currentNav = currentNav.getParent?.();
    }
    return chain;
  }, [navigation]);

  const canNavigate = useCallback((navInstance, routeName) => {
    if (!navInstance?.getState) return false;
    const state = navInstance.getState();
    const routeNames =
      state?.routeNames || state?.routes?.map((route) => route.name) || [];
    return routeNames.includes(routeName);
  }, []);

  const tryNavigate = useCallback(
    (routeName, params) => {
      const chain = getNavigatorChain();
      for (const navInstance of chain) {
        if (canNavigate(navInstance, routeName)) {
          navInstance.navigate(routeName, params);
          return true;
        }
      }
      return false;
    },
    [canNavigate, getNavigatorChain]
  );

  const handleUserPress = (user) => {
    trackButtonClick('view_user_profile', 'UsersScreen');
    trackFeatureUsage('user_profile_view', { userId: user.id, persona: user.persona });

    const screenConfig = {
      screen: 'UserProfileView',
      params: { userId: user.id, user },
    };

    const navigated =
      tryNavigate('Home', screenConfig) ||
      tryNavigate('MainApp', { screen: 'Home', params: screenConfig }) ||
      tryNavigate('HomeDrawer', screenConfig);

    if (!navigated) {
      console.warn('Unable to navigate to user profile screen');
    }
  };

  const handleMessagePress = async (user) => {
    if (!currentUser?.uid) {
      Alert.alert('Sign In Required', 'Please sign in to send messages.');
      return;
    }

    trackButtonClick('message_user', 'UsersScreen');

    try {
      const conversationId = await ensureConversationExists(user);
      const params = {
        conversationId,
        userId: user.id,
        userName: user.displayName || user.name || 'User',
        avatar: getAvatarUrl(user),
        isOnline: user.isOnline || false,
      };

      const navigated =
        tryNavigate('Messages', params) ||
        tryNavigate('MainApp', { screen: 'Messages', params }) ||
        tryNavigate('MessagesDrawer', params);

      if (!navigated) {
        console.warn('Unable to navigate to Messages screen');
      }
    } catch (error) {
      console.error('handleMessagePress error:', error);
      Alert.alert('Unable to open chat', 'Please try again in a moment.');
    }
  };

  const handleInquiryPress = (user, e) => {
    e?.stopPropagation();
    trackButtonClick('inquiry_user', 'UsersScreen');
    const screenConfig = {
      screen: 'UserProfileView',
      params: {
        userId: user.id,
        user,
        showInquiry: true,
      },
    };

    const navigated =
      tryNavigate('Home', screenConfig) ||
      tryNavigate('MainApp', { screen: 'Home', params: screenConfig });

    if (!navigated) {
      console.warn('Unable to navigate to inquiry view');
    }
  };

  const renderUserCard = ({ item }) => (
    <View
      style={[styles.userCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
    >
      {/* Profile Header */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => handleUserPress(item)}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.8}
        >
          <Image
            source={{ uri: getAvatarUrl(item) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face' }}
            style={styles.avatar}
          />
          {item.isOnline && (
            <View style={[styles.onlineIndicator, { backgroundColor: '#34C759' }]} />
          )}
          {item.verified && (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.userHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.displayName || 'No Name'}
            </Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={18} color={theme.primary} style={styles.verifiedIcon} />
            )}
          </View>
          <Text style={[styles.username, { color: theme.subtext }]} numberOfLines={1}>
            @{item.username || 'username'}
          </Text>
          <View style={styles.personaRow}>
            <View style={[styles.personaBadge, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.personaText, { color: theme.primary }]}>
                {item.personaTitle}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.rating, { color: theme.text }]}>
                {item.rating?.toFixed(1) || '4.5'}
              </Text>
              <Text style={[styles.reviewCount, { color: theme.subtext }]}>
                ({item.reviews || 0})
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Bio */}
      {item.bio && (
        <Text style={[styles.bio, { color: theme.text }]} numberOfLines={2}>
          {item.bio}
        </Text>
      )}

      {/* Services Tags */}
      {item.services && item.services.length > 0 && (
        <View style={styles.servicesContainer}>
          {item.services.slice(0, 3).map((service, idx) => (
            <View key={idx} style={[styles.serviceTag, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
              <Text style={[styles.serviceText, { color: theme.primary }]} numberOfLines={1}>
                {service}
              </Text>
            </View>
          ))}
          {item.services.length > 3 && (
            <Text style={[styles.moreServices, { color: theme.subtext }]}>
              +{item.services.length - 3} more
            </Text>
          )}
        </View>
      )}

      {/* Price Range */}
      {item.priceRange && (
        <View style={styles.priceContainer}>
          <Ionicons name="cash-outline" size={16} color={theme.primary} />
          <Text style={[styles.priceRange, { color: theme.text }]}>
            {item.priceRange}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.messageButton, { backgroundColor: theme.primary }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            handleMessagePress(item);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewButton, { borderColor: theme.border }]}
          onPress={(e) => {
            e?.stopPropagation?.();
            handleUserPress(item);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="person-outline" size={18} color={theme.text} />
          <Text style={[styles.viewButtonText, { color: theme.text }]}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading users...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Users List - No header, starts immediately */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color={theme.subtext} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No users found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
              {selectedPersonaFilter !== 'All'
                ? 'Try a different filter'
                : 'Check back later for new users'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  userCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'visible',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E5E5E5',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  username: {
    fontSize: 14,
    marginBottom: 8,
  },
  personaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  personaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  personaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  serviceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreServices: {
    fontSize: 12,
    fontStyle: 'italic',
    alignSelf: 'center',
    paddingVertical: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  priceRange: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    zIndex: 10,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    minHeight: 48,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minHeight: 48,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
