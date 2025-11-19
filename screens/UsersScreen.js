/**
 * Users Screen - Marketplace for vendors, service professionals, and clients
 * Fiverr-style marketplace connecting service providers with booking clients
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { db, isFirebaseReady } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage, trackSearch } from '../services/AnalyticsService';

const { width } = Dimensions.get('window');
const cardWidth = (width - 60) / 2; // 2 columns with padding

// Mock users with different personas - in production, load from Firestore
const mockUsers = [
  {
    id: 'user1',
    displayName: 'Sarah Martinez',
    username: '@sarah_music',
    bio: 'Professional vocalist and recording artist. Specializing in R&B and soul.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    persona: 'artist',
    personaTitle: 'Artist',
    services: ['Vocal Recording', 'Live Performance'],
    rating: 4.9,
    reviews: 127,
    priceRange: '$50-$200',
    location: 'Fort Worth, TX',
    isOnline: true,
    verified: true,
  },
  {
    id: 'user2',
    displayName: 'Mike Chen',
    username: '@mike_photography',
    bio: 'Event photographer capturing your special moments. 10+ years experience.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    persona: 'vendor',
    personaTitle: 'Vendor',
    services: ['Photography', 'Event Coverage'],
    rating: 4.8,
    reviews: 89,
    priceRange: '$150-$500',
    location: 'Dallas, TX',
    isOnline: false,
    verified: true,
  },
  {
    id: 'user3',
    displayName: 'DJ Alex',
    username: '@dj_alex_pro',
    bio: 'Professional DJ for events, weddings, and parties. Full sound system included.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
    persona: 'vendor',
    personaTitle: 'Vendor',
    services: ['DJ Services', 'Sound System'],
    rating: 4.9,
    reviews: 203,
    priceRange: '$300-$800',
    location: 'Fort Worth, TX',
    isOnline: true,
    verified: true,
  },
  {
    id: 'user4',
    displayName: 'Lisa Thompson',
    username: '@lisa_designs',
    bio: 'Graphic designer and brand specialist. Creating stunning visuals for your business.',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    persona: 'vendor',
    personaTitle: 'Vendor',
    services: ['Graphic Design', 'Branding'],
    rating: 4.7,
    reviews: 56,
    priceRange: '$50-$300',
    location: 'Arlington, TX',
    isOnline: true,
    verified: false,
  },
  {
    id: 'user5',
    displayName: 'James Wilson',
    username: '@james_video',
    bio: 'Videographer specializing in music videos and event coverage. Professional editing included.',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face',
    persona: 'vendor',
    personaTitle: 'Vendor',
    services: ['Videography', 'Video Editing'],
    rating: 4.8,
    reviews: 94,
    priceRange: '$500-$2000',
    location: 'Fort Worth, TX',
    isOnline: false,
    verified: true,
  },
  {
    id: 'user6',
    displayName: 'Emma Rodriguez',
    username: '@emma_web',
    bio: 'Web developer creating beautiful, functional websites. E-commerce and portfolio sites.',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
    persona: 'vendor',
    personaTitle: 'Vendor',
    services: ['Website Development', 'E-commerce'],
    rating: 4.9,
    reviews: 78,
    priceRange: '$250-$1500',
    location: 'Dallas, TX',
    isOnline: true,
    verified: true,
  },
];

const personaFilters = ['All', 'Artist', 'Vendor', 'Promoter', 'Guest'];

export default function UsersScreen({ navigation: navProp }) {
  const navHook = useNavigation();
  const navigation = navProp || navHook;
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const { userPersona: currentPersona } = useM1APersonalization();
  useScreenTracking('UsersScreen');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollThreshold = 50; // Minimum scroll distance to trigger hide/show

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Try to load from Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
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
          
          if (firestoreUsers.length > 0) {
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
            setLoading(false);
            return;
          }
        } catch (error) {
          console.warn('Firestore query failed, using mock data:', error);
        }
      }
      
      // Fallback to mock data
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers(mockUsers);
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
    
    // Persona filter
    if (selectedPersona !== 'All') {
      filtered = filtered.filter(u => u.personaTitle === selectedPersona);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.bio?.toLowerCase().includes(query) ||
        u.services?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [users, selectedPersona, searchQuery, currentUser]);

  const handleUserPress = (user) => {
    trackButtonClick('view_user_profile', 'UsersScreen');
    trackFeatureUsage('user_profile_view', { userId: user.id, persona: user.persona });
    // Navigate via parent navigator to access HomeStack screens
    const nav = navigation.getParent ? navigation.getParent() : navigation;
    nav?.navigate('Home', {
      screen: 'UserProfileView',
      params: { userId: user.id, user },
    });
  };

  const handleMessagePress = (user) => {
    trackButtonClick('message_user', 'UsersScreen');
    const nav = navigation.getParent ? navigation.getParent() : navigation;
    nav?.navigate('Messages', { 
      screen: 'Chat',
      params: { userId: user.id, userName: user.displayName }
    });
  };

  const handleInquiryPress = (user) => {
    trackButtonClick('inquiry_user', 'UsersScreen');
    const nav = navigation.getParent ? navigation.getParent() : navigation;
    nav?.navigate('Home', {
      screen: 'UserProfileView',
      params: { 
        userId: user.id, 
        user,
        showInquiry: true 
      },
    });
  };

  const renderUserCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.userCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border }
      ]}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.8}
    >
      {/* Avatar with online status */}
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face' }}
          style={styles.avatar}
        />
        {item.isOnline && (
          <View style={[styles.onlineBadge, { backgroundColor: '#34C759' }]} />
        )}
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
          </View>
        )}
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
            {item.displayName}
          </Text>
        </View>
        <Text style={[styles.username, { color: theme.subtext }]} numberOfLines={1}>
          {item.username}
        </Text>
        
        {/* Persona Badge */}
        <View style={[styles.personaBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.personaText, { color: theme.primary }]}>
            {item.personaTitle}
          </Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={[styles.rating, { color: theme.text }]}>
            {item.rating} ({item.reviews})
          </Text>
        </View>

        {/* Services */}
        {item.services && item.services.length > 0 && (
          <View style={styles.servicesContainer}>
            {item.services.slice(0, 2).map((service, idx) => (
              <View key={idx} style={[styles.serviceTag, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={[styles.serviceText, { color: theme.subtext }]} numberOfLines={1}>
                  {service}
                </Text>
              </View>
            ))}
            {item.services.length > 2 && (
              <Text style={[styles.moreServices, { color: theme.subtext }]}>
                +{item.services.length - 2} more
              </Text>
            )}
          </View>
        )}

        {/* Price Range */}
        <Text style={[styles.priceRange, { color: theme.primary }]}>
          {item.priceRange}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.messageButton, { backgroundColor: theme.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            handleMessagePress(item);
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.inquiryButton, { borderColor: theme.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            handleInquiryPress(item);
          }}
        >
          <Ionicons name="briefcase-outline" size={16} color={theme.primary} />
          <Text style={[styles.inquiryButtonText, { color: theme.primary }]}>Inquire</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPersonaFilter = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor: selectedPersona === item ? theme.primary : theme.cardBackground,
          borderColor: theme.border,
          marginRight: index < personaFilters.length - 1 ? 8 : 0,
        },
      ]}
      onPress={() => {
        setSelectedPersona(item);
        trackButtonClick('filter_persona', 'UsersScreen', { persona: item });
      }}
    >
      <Text
        style={[
          styles.filterButtonText,
          { color: selectedPersona === item ? '#fff' : theme.text },
        ]}
        numberOfLines={1}
      >
        {item}
      </Text>
    </TouchableOpacity>
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
      {/* Header - Animated */}
      <Animated.View
        style={[
          styles.header,
          {
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [0, -100],
                  extrapolate: 'clamp',
                }),
              },
              {
                scaleY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: scrollY.interpolate({
              inputRange: [0, scrollThreshold],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            overflow: 'hidden',
          },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Users</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Connect with vendors, artists & professionals
          </Text>
        </View>
      </Animated.View>

      {/* Search Bar - Animated */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [0, -100],
                  extrapolate: 'clamp',
                }),
              },
              {
                scaleY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: scrollY.interpolate({
              inputRange: [0, scrollThreshold],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            overflow: 'hidden',
            marginBottom: 16,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search users, services, or skills..."
          placeholderTextColor={theme.subtext}
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (text.trim()) {
              trackSearch(text, filteredUsers.length);
            }
          }}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.subtext} />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Persona Filters - Animated */}
      <Animated.View
        style={[
          styles.filtersWrapper,
          {
            transform: [
              {
                translateY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [0, -100],
                  extrapolate: 'clamp',
                }),
              },
              {
                scaleY: scrollY.interpolate({
                  inputRange: [0, scrollThreshold],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ],
            opacity: scrollY.interpolate({
              inputRange: [0, scrollThreshold],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            overflow: 'hidden',
          },
        ]}
      >
        <FlatList
          data={personaFilters}
          renderItem={renderPersonaFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.filtersContainer}
          style={styles.filtersList}
          bounces={false}
        />
      </Animated.View>

      {/* Users Grid */}
      <Animated.FlatList
        data={filteredUsers}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          styles.gridContainer,
          {
            paddingTop: scrollY.interpolate({
              inputRange: [0, scrollThreshold],
              outputRange: [10, 10],
              extrapolate: 'clamp',
            }),
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (event) => {
              const currentScrollY = event.nativeEvent.contentOffset.y;
              const scrollDelta = currentScrollY - lastScrollY.current;
              
              // Only update if scroll is significant enough
              if (Math.abs(scrollDelta) > 5) {
                if (scrollDelta > 0 && currentScrollY > scrollThreshold) {
                  // Scrolling down - hide search bar
                  if (isSearchBarVisible) {
                    setIsSearchBarVisible(false);
                  }
                } else if (scrollDelta < 0 || currentScrollY < scrollThreshold) {
                  // Scrolling up or near top - show search bar
                  if (!isSearchBarVisible) {
                    setIsSearchBarVisible(true);
                  }
                }
                lastScrollY.current = currentScrollY;
              }
            },
          }
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No users found
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
              {searchQuery ? 'Try a different search term' : 'Check back later for new users'}
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
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  filtersWrapper: {
    width: width,
  },
  filtersList: {
    height: 50,
    width: width,
  },
  filtersContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    height: 36,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  gridContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  userCard: {
    width: cardWidth,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E5E5',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  username: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  personaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  personaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '500',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  serviceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreServices: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  priceRange: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionButtons: {
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inquiryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  inquiryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

