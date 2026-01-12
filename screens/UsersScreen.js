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
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import { usersCache } from '../utils/dataCache';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage, trackSearch } from '../services/AnalyticsService';
import { getAvatarUrl, hasAvatar, getAvatarSource } from '../utils/photoUtils';
import M1ALogo from '../components/M1ALogo';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [filters, setFilters] = useState({
    minRating: null,
    location: '',
    persona: null,
    verified: null, // null = all, true = verified only, false = unverified only
    online: null, // null = all, true = online only
    minServices: null, // minimum number of services
  });
  const [sortBy, setSortBy] = useState('name'); // 'name', 'rating', 'reviews', 'recent'

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = useCallback(async () => {
    // Check cache first
    const cacheKey = usersCache.generateKey('usersList');
    const cachedUsers = usersCache.get(cacheKey);
    if (cachedUsers) {
      console.log('📦 Using cached users list');
      setUsers(cachedUsers);
      setLoading(false);
      // Still refresh in background
    }

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
          rating: u.rating || 5.0, // Default to 5 stars for new users
          reviews: u.reviews || 0,
          priceRange: u.priceRange || '$50-$500',
          isOnline: u.isOnline || false,
          verified: u.verified || false,
        }));
        setUsers(enrichedUsers);
        
        // Cache the results
        const cacheKey = usersCache.generateKey('usersList');
        usersCache.set(cacheKey, enrichedUsers, 5 * 60 * 1000); // 5 minutes TTL
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

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(u => u.id !== currentUser?.uid); // Exclude current user
    
    // Persona filter (from parent ExploreScreen)
    if (selectedPersonaFilter !== 'All') {
      filtered = filtered.filter(u => u.personaTitle === selectedPersonaFilter);
    }
    
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => {
        const searchFields = [
          u.displayName,
          u.username,
          u.bio,
          u.location,
          u.personaTitle,
          ...(u.services || []),
        ].filter(Boolean).map(f => String(f).toLowerCase());
        return searchFields.some(field => field.includes(query));
      });
    }
    
    // Rating filter
    if (filters.minRating !== null) {
      filtered = filtered.filter(u => (u.rating || 5.0) >= filters.minRating);
    }
    
    // Location filter
    if (filters.location && filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase();
      filtered = filtered.filter(u => 
        u.location?.toLowerCase().includes(locationQuery)
      );
    }
    
    // Persona filter (from filters modal)
    if (filters.persona) {
      filtered = filtered.filter(u => u.personaTitle === filters.persona);
    }
    
    // Verified filter
    if (filters.verified !== null) {
      filtered = filtered.filter(u => (u.verified || false) === filters.verified);
    }
    
    // Online filter
    if (filters.online !== null) {
      filtered = filtered.filter(u => (u.isOnline || false) === filters.online);
    }
    
    // Minimum services filter
    if (filters.minServices !== null) {
      filtered = filtered.filter(u => (u.services?.length || 0) >= filters.minServices);
    }
    
    // Sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating || 5.0) - (a.rating || 5.0));
        break;
      case 'reviews':
        sorted.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case 'recent':
        // Sort by createdAt if available, otherwise by displayName
        sorted.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt ? new Date(a.createdAt) : null);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : null);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB - dateA; // Most recent first
        });
        break;
      case 'name':
      default:
        sorted.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        break;
    }
    
    return sorted;
  }, [users, selectedPersonaFilter, currentUser, searchQuery, filters, sortBy]);

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
        userName: user.displayName || user.name || user.username || 'User',
        avatar: getAvatarUrl(user) || null,
        isOnline: user.isOnline || false,
      };

      // Try multiple navigation paths to ensure we reach Messages screen
      let navigated = false;
      
      // Try direct navigation first
      try {
        navigation.navigate('Messages', params);
        navigated = true;
      } catch (e) {
        // Try nested navigation
        try {
          navigation.navigate('MainApp', {
            screen: 'Messages',
            params: params
          });
          navigated = true;
        } catch (e2) {
          // Try drawer navigation
          try {
            navigation.navigate('MessagesDrawer', params);
            navigated = true;
          } catch (e3) {
            // Last resort: try common navigation patterns
            const navChain = getNavigatorChain();
            for (const navInstance of navChain) {
              try {
                if (canNavigate(navInstance, 'Messages')) {
                  navInstance.navigate('Messages', params);
                  navigated = true;
                  break;
                }
              } catch (err) {
                // Continue trying
              }
            }
          }
        }
      }

      if (!navigated) {
        console.warn('Unable to navigate to Messages screen');
        Alert.alert('Navigation Error', 'Unable to open messages. Please try navigating to Messages manually.');
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
          {hasAvatar(item) ? (
            <Image
              source={getAvatarSource(item)}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
              <M1ALogo size={styles.avatar.width || 50} variant="icon" color={theme.primary} />
            </View>
          )}
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
                {item.rating?.toFixed(1) || '5.0'}
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
          {/* Additional User Info */}
          <View style={styles.additionalInfo}>
            {item.location && (
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color={theme.subtext} />
                <Text style={[styles.infoText, { color: theme.subtext }]} numberOfLines={1}>
                  {item.location}
                </Text>
              </View>
            )}
            {item.services && item.services.length > 0 && (
              <View style={styles.infoItem}>
                <Ionicons name="briefcase-outline" size={14} color={theme.subtext} />
                <Text style={[styles.infoText, { color: theme.subtext }]}>
                  {item.services.length} {item.services.length === 1 ? 'service' : 'services'}
                </Text>
              </View>
            )}
            {item.createdAt && (
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.subtext} />
                <Text style={[styles.infoText, { color: theme.subtext }]}>
                  Joined {item.createdAt?.toDate ? 
                    new Date(item.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) :
                    new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  }
                </Text>
              </View>
            )}
          </View>

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
      {/* Search and Filter Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.subtext} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowSortOptions(true)}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={18} color={theme.primary} />
            {(filters.minRating !== null || filters.location || filters.persona || 
              filters.verified !== null || filters.online !== null || filters.minServices !== null) && (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.filterBadgeText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Users List */}
      <FlatList
        data={filteredAndSortedUsers}
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
              {searchQuery || Object.values(filters).some(v => v !== null && v !== '')
                ? 'Try adjusting your search or filters'
                : selectedPersonaFilter !== 'All'
                ? 'Try a different filter'
                : 'Check back later for new users'}
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {/* Rating Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Minimum Rating</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                      key={rating}
                      style={[
                        styles.ratingButton,
                        {
                          backgroundColor: filters.minRating === rating ? theme.primary : theme.cardBackground,
                          borderColor: filters.minRating === rating ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, minRating: filters.minRating === rating ? null : rating })}
                    >
                      <Ionicons name="star" size={20} color={filters.minRating === rating ? '#fff' : theme.primary} />
                      <Text style={[styles.ratingText, { color: filters.minRating === rating ? '#fff' : theme.text }]}>
                        {rating}+
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Location</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="Search by location..."
                  placeholderTextColor={theme.subtext}
                  value={filters.location}
                  onChangeText={(text) => setFilters({ ...filters, location: text })}
                />
              </View>

              {/* Persona Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Persona</Text>
                <View style={styles.categoryFilterContainer}>
                  {['All', 'Artist', 'Vendor', 'Promoter', 'Guest', 'Wedding Planner', 'Venue Owner', 'Performer'].map((persona) => (
                    <TouchableOpacity
                      key={persona}
                      style={[
                        styles.categoryFilterButton,
                        {
                          backgroundColor: filters.persona === persona ? theme.primary : theme.cardBackground,
                          borderColor: filters.persona === persona ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, persona: filters.persona === persona ? null : persona })}
                    >
                      <Text
                        style={[
                          styles.categoryFilterText,
                          { color: filters.persona === persona ? '#fff' : theme.text },
                        ]}
                      >
                        {persona}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Verified & Online Filters */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Status</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFilters({ ...filters, verified: filters.verified === true ? null : true })}
                >
                  <View style={styles.switchLabel}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                    <Text style={[styles.switchText, { color: theme.text }]}>Verified Only</Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: filters.verified === true ? theme.primary : theme.border }]}>
                    <View
                      style={[
                        styles.switchThumb,
                        { transform: [{ translateX: filters.verified === true ? 20 : 0 }] },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFilters({ ...filters, online: filters.online === true ? null : true })}
                >
                  <View style={styles.switchLabel}>
                    <Ionicons name="radio-button-on" size={20} color={theme.primary} />
                    <Text style={[styles.switchText, { color: theme.text }]}>Online Now</Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: filters.online === true ? theme.primary : theme.border }]}>
                    <View
                      style={[
                        styles.switchThumb,
                        { transform: [{ translateX: filters.online === true ? 20 : 0 }] },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Minimum Services Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Minimum Services</Text>
                <View style={styles.servicesFilterContainer}>
                  {[0, 1, 3, 5, 10].map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.servicesFilterButton,
                        {
                          backgroundColor: filters.minServices === count ? theme.primary : theme.cardBackground,
                          borderColor: filters.minServices === count ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setFilters({ ...filters, minServices: filters.minServices === count ? null : count })}
                    >
                      <Text
                        style={[
                          styles.servicesFilterText,
                          { color: filters.minServices === count ? '#fff' : theme.text },
                        ]}
                      >
                        {count}+
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Clear Filters Button */}
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  setFilters({
                    minRating: null,
                    location: '',
                    persona: null,
                    verified: null,
                    online: null,
                    minServices: null,
                  });
                }}
              >
                <Ionicons name="refresh" size={18} color={theme.primary} />
                <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sort Options Modal */}
      <Modal
        visible={showSortOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSortOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortOptions(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {[
                { value: 'name', label: 'Name: A to Z', icon: 'text' },
                { value: 'rating', label: 'Highest Rated', icon: 'star' },
                { value: 'reviews', label: 'Most Reviews', icon: 'chatbubbles' },
                { value: 'recent', label: 'Recently Joined', icon: 'calendar' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    {
                      backgroundColor: sortBy === option.value ? theme.primary + '20' : theme.cardBackground,
                      borderColor: sortBy === option.value ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortOptions(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={sortBy === option.value ? theme.primary : theme.text}
                  />
                  <Text
                    style={[
                      styles.sortOptionText,
                      {
                        color: sortBy === option.value ? theme.primary : theme.text,
                        fontWeight: sortBy === option.value ? '600' : '400',
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  // Search and Filter Bar
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Additional User Info
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScrollView: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchText: {
    fontSize: 16,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  servicesFilterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  servicesFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  servicesFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Sort Modal Styles
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
  },
});
