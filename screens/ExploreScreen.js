import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import ScrollIndicator from '../components/ScrollIndicator';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useNotificationPreferences } from '../contexts/NotificationPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage, trackSearch } from '../services/AnalyticsService';
import { sendDiscountNotification } from '../services/NotificationService';
import ReviewService from '../services/ReviewService';
import SharingService from '../services/SharingService';
import UsersScreen from './UsersScreen';

const { width } = Dimensions.get('window');
const itemWidth = (width - 60) / 2; // 2 columns with padding

export default function ExploreScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { userPersona } = useM1APersonalization();
  const { preferences: notificationPrefs } = useNotificationPreferences();
  useScreenTracking('ExploreScreen');
  
  // Check if we can go back (i.e., accessed from drawer)
  const canGoBack = navigation.canGoBack();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Services');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: null,
    maxPrice: null,
    minRating: null,
    location: '',
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [selectedRSVPItem, setSelectedRSVPItem] = useState(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [rsvpData, setRsvpData] = useState({
    name: '',
    email: '',
    phone: '',
    guestCount: 1,
    specialRequests: '',
  });

  const categories = ['Users', 'Events', 'Services'];

  useEffect(() => {
    loadItems();
  }, []); // Empty dependency array - loadItems is stable

  // Send discount notifications when deals are available
  useEffect(() => {
    const checkForDeals = async () => {
      if (!notificationPrefs?.discounts?.enabled || !notificationPrefs?.enabled) {
        return;
      }

      const deals = items.filter(item => item.isDeal);
      if (deals.length > 0 && notificationPrefs?.discounts?.newDeals) {
        // Send notification for the most popular deal
        const topDeal = deals.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
        await sendDiscountNotification({
          id: topDeal.id,
          title: topDeal.name,
          description: topDeal.description,
          discountPercent: topDeal.regularPrice 
            ? `${Math.round(((topDeal.regularPrice - topDeal.dealPrice) / topDeal.regularPrice) * 100)}% off`
            : 'Special deal',
        }, notificationPrefs, 'newDeal');
      }
    };

    if (items.length > 0) {
      checkForDeals();
    }
  }, [items, notificationPrefs]);

  // Only load ratings when user explicitly views reviews (not automatically)
  const loadItemRatings = async (itemId) => {
    try {
      const rating = await ReviewService.getItemRating(itemId);
      setItemRatings(prev => ({
        ...prev,
        [itemId]: rating,
      }));
      return rating;
    } catch (error) {
      console.warn('Error loading rating for item:', itemId, error);
      return null;
    }
  };

  const loadItems = useCallback(async () => {
    try {
      // Check if we have real Firestore (db doesn't have collection method)
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - load from services and events collections
        const { collection: firestoreCollection, query: firestoreQuery, where, getDocs, orderBy: firestoreOrderBy, limit: firestoreLimit, Timestamp } = await import('firebase/firestore');
        const now = Timestamp.now();
        
        // Load services from Firestore
        const servicesQuery = firestoreQuery(
          firestoreCollection(db, 'services'),
          where('available', '==', true),
          firestoreOrderBy('popularity', 'desc'),
          firestoreLimit(50)
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          category: 'Services',
        }));

        // Load events from Firestore (future events only)
        const eventsQuery = firestoreQuery(
          firestoreCollection(db, 'events'),
          where('eventDate', '>=', now),
          firestoreOrderBy('eventDate', 'asc'),
          firestoreLimit(20)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          category: 'Events',
        }));

        // Combine all items
        const allItems = [...servicesData, ...eventsData];
        
        if (allItems.length > 0) {
          setItems(allItems);
          setLoading(false);
          return;
        }
      } else {
        console.warn('Firestore not ready, showing empty list');
        setItems([]);
      }
    } catch (e) {
      console.error('Firebase load failed:', e);
      setItems([]); // Show empty state instead of mock data
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array - loadItems is stable

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  // Advanced filtering with search and filters
  const filteredItems = useMemo(() => {
    let filtered = items;
    
    // Category filter
    if (selectedCategory === 'Users') {
      // Navigate to Users screen when Users is selected
      return [];
    }
    if (selectedCategory === 'Bar') {
      // Don't show Bar items in ExploreScreen - navigate to BarCategoryScreen instead
      return [];
    }
    if (selectedCategory !== 'Users' && selectedCategory !== 'Bar') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.artist?.toLowerCase().includes(query) ||
        item.subcategory?.toLowerCase().includes(query)
      );
    }
    
    // Price filter
    if (filters.minPrice !== null) {
      filtered = filtered.filter(item => item.price >= filters.minPrice);
    }
    if (filters.maxPrice !== null) {
      filtered = filtered.filter(item => item.price <= filters.maxPrice);
    }
    
    // Rating filter
    if (filters.minRating !== null) {
      filtered = filtered.filter(item => item.rating >= filters.minRating);
    }
    
    return filtered;
  }, [items, selectedCategory, searchQuery, filters]);
  
  // Track search
  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        trackSearch(searchQuery, filteredItems.length);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, filteredItems.length]);

  const getCategoryCount = (category) => {
    if (category === 'Users') {
      // Return mock count - in production, get from Users collection
      return 0; // Will be handled by UsersScreen
    }
    return items.filter(item => item.category === category).length;
  };

  const handleItemPress = (item) => {
    trackButtonClick('explore_item', 'ExploreScreen');
    trackFeatureUsage('explore_item_view', { itemId: item.id, category: item.category });
    
    // Special handling for RSVP items that require persona
    if (item.isRSVP && item.requiresPersona) {
      if (!userPersona) {
        Alert.alert(
          'Persona Required',
          'Please select a persona to RSVP for this event. You can set your persona in the M1A settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Set Persona',
              onPress: () => navigation.navigate('M1APersonalization'),
            },
          ]
        );
        return;
      }
      // Open RSVP modal
      setSelectedRSVPItem(item);
      setShowRSVPModal(true);
      return;
    }
    
    // Special handling for AutoPoster
    if (item.isAutoPoster) {
      // Navigate directly to AutoPoster screen in drawer
      navigation.navigate('AutoPoster');
      return;
    }
    
    // Handle Bar items - navigate to BarMenuCategoryScreen
    // Note: BarMenuCategory is in HomeStack, so we need to navigate through MainApp
    if (item.category === 'Bar') {
      navigation.navigate('MainApp', {
        screen: 'Home',
        params: {
          screen: 'BarMenuCategory',
          params: { category: item.subcategory || 'Drinks', categoryName: item.subcategory || 'Drinks' },
        },
      });
      return;
    }
    
    // All Services and Events (non-RSVP) go to ServiceBooking
    // This includes: Services, Events that aren't RSVP
    if (item.category === 'Services' || (item.category === 'Events' && !item.isRSVP)) {
      // Navigate directly to ServiceBooking screen in drawer
      navigation.navigate('ServiceBooking', { item });
      return;
    }
    
    // Fallback: Navigate to service booking for any other item
    navigation.navigate('ServiceBooking', { item });
  };

  const handleRSVPSubmit = async () => {
    if (!rsvpData.name || !rsvpData.email) {
      Alert.alert('Missing Information', 'Please fill in your name and email.');
      return;
    }

    try {
      // Save RSVP to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
        await addDoc(collection(db, 'rsvps'), {
          eventId: selectedRSVPItem.id,
          eventName: selectedRSVPItem.name,
          userId: userPersona?.id || 'anonymous',
          persona: userPersona?.id || null,
          personaName: userPersona?.title || null,
          name: rsvpData.name,
          email: rsvpData.email,
          phone: rsvpData.phone || '',
          guestCount: rsvpData.guestCount,
          specialRequests: rsvpData.specialRequests || '',
          status: 'confirmed',
          createdAt: serverTimestamp(),
        });
      } else {
        throw new Error('Firestore not ready');
      }

      Alert.alert(
        'RSVP Confirmed!',
        `Thank you ${rsvpData.name}! Your RSVP for ${selectedRSVPItem.name} has been confirmed. We'll send you more details via email.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRSVPModal(false);
              setRsvpData({
                name: '',
                email: '',
                phone: '',
                guestCount: 1,
                specialRequests: '',
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      Alert.alert('Error', 'Failed to submit RSVP. Please try again.');
    }
  };
  
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() && !searchHistory.includes(text.trim())) {
      const newHistory = [text.trim(), ...searchHistory.slice(0, 4)]; // Keep last 5
      setSearchHistory(newHistory);
      // Store in AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.setItem('m1a_search_history', JSON.stringify(newHistory));
    }
  };
  
  const loadSearchHistory = async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const history = await AsyncStorage.getItem('m1a_search_history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  };
  
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.instagramCard,
        { backgroundColor: theme.cardBackground },
        index % 2 === 0 ? styles.leftCard : styles.rightCard
      ]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image }}
          style={styles.serviceImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          {item.isRSVP ? (
            <View style={[styles.priceBadge, { backgroundColor: '#FF6B35' }]}>
              <Text style={[styles.priceText, { color: '#fff' }]}>RSVP</Text>
            </View>
          ) : item.isDeal ? (
            <View style={[styles.priceBadge, { backgroundColor: '#34C759' }]}>
              <Ionicons name="pricetag" size={10} color="#fff" style={{ marginRight: 2 }} />
              <Text style={[styles.priceText, { color: '#fff' }]}>${item.dealPrice || item.price}</Text>
            </View>
          ) : (
            <View style={[styles.priceBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.priceText, { color: theme.background }]}>${item.price}</Text>
            </View>
          )}
          <View style={[styles.ratingBadge, { backgroundColor: theme.secondary }]}>
            <Ionicons name="star" size={12} color={theme.background} />
            <Text style={[styles.ratingText, { color: theme.background }]}>
              {item.rating}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.serviceName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.artistName, { color: theme.subtext }]} numberOfLines={1}>
          {item.artist}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={async () => {
              await SharingService.shareContent(item.category, item.id, item);
              trackButtonClick('share_item', 'ExploreScreen');
            }}
          >
            <Ionicons name="share-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.categoryContainer}>
          {item.isDeal && (
            <View style={[styles.categoryTag, { backgroundColor: '#34C759' + '20', marginRight: 6 }]}>
              <Ionicons name="pricetag" size={10} color="#34C759" />
              <Text style={[styles.categoryText, { color: '#34C759' }]}>
                DEAL
              </Text>
            </View>
          )}
          <View style={[styles.categoryTag, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.categoryText, { color: theme.primary }]}>
              {item.subcategory}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Users': return 'people';
      case 'Events': return 'calendar';
      case 'Services': return 'musical-notes';
      case 'Bar': return 'wine';
      default: return 'grid';
    }
  };

  const renderCategoryFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        { 
          backgroundColor: selectedCategory === item ? theme.primary : theme.cardBackground,
          borderColor: selectedCategory === item ? theme.primary : theme.border,
          borderWidth: selectedCategory === item ? 2 : 1
        }
      ]}
      onPress={() => {
        trackButtonClick('select_category', 'ExploreScreen', { category: item });
        // Navigate to BarCategoryScreen immediately when Bar is selected
        if (item === 'Bar') {
          navigation.getParent()?.navigate('Home', {
            screen: 'BarCategory',
          });
          return; // Don't update selectedCategory state - navigate away immediately
        }
        // For other categories, update state normally
        setSelectedCategory(item);
      }}
    >
      <Ionicons 
        name={getCategoryIcon(item)} 
        size={16} 
        color={selectedCategory === item ? '#fff' : theme.text}
        style={styles.categoryIcon}
      />
      <Text
        style={[
          styles.categoryButtonText,
          { color: selectedCategory === item ? '#fff' : theme.text }
        ]}
      >
        {item}
      </Text>
      <View style={[
        styles.countBadge,
        { backgroundColor: selectedCategory === item ? 'rgba(255,255,255,0.3)' : theme.primary + '20' }
      ]}>
        <Text style={[
          styles.countText,
          { color: selectedCategory === item ? '#fff' : theme.primary }
        ]}>
          {getCategoryCount(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header with conditional Back Button */}
      {canGoBack && (
        <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topHeaderTitle, { color: theme.text }]}>Explore</Text>
          <View style={styles.headerRight} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        {!canGoBack && (
          <>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Explore</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Events • Services • Bar
            </Text>
          </>
        )}
        {canGoBack && (
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Events • Services • Bar
          </Text>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search events, services, or bar items..."
            placeholderTextColor={theme.subtext}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                trackButtonClick('clear_search', 'ExploreScreen');
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => {
            setShowFilters(true);
            trackButtonClick('open_filters', 'ExploreScreen');
          }}
        >
          <Ionicons name="options" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Suggestions */}
      {searchQuery.length === 0 && searchHistory.length > 0 && (
        <View style={styles.searchHistoryContainer}>
          <Text style={[styles.searchHistoryTitle, { color: theme.subtext }]}>Recent Searches</Text>
          <View style={styles.searchHistoryRow}>
            {searchHistory.slice(0, 5).map((term, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.searchHistoryChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  setSearchQuery(term);
                  trackButtonClick('search_history_item', 'ExploreScreen');
                }}
              >
                <Ionicons name="time-outline" size={14} color={theme.subtext} />
                <Text style={[styles.searchHistoryText, { color: theme.text }]}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Category Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryFilter}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Show UsersScreen when Users category is selected */}
      {selectedCategory === 'Users' ? (
        <UsersScreen navigation={navigation} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Instagram-style Grid for Events, Services */}
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              setShowScrollIndicator(false);
            }}
            scrollEventThrottle={16}
            removeClippedSubviews={false}
            collapsable={false}
            ListEmptyComponent={
              <EmptyState
                icon={getCategoryIcon(selectedCategory)}
                title={`No ${selectedCategory.toLowerCase()} found`}
                message={searchQuery 
                  ? `No ${selectedCategory.toLowerCase()} match your search "${searchQuery}". Try a different search term.`
                  : `There are no ${selectedCategory.toLowerCase()} available at this time. Check back later or try a different category.`}
                actionLabel={searchQuery ? "Clear Search" : "Refresh"}
                onAction={searchQuery ? () => setSearchQuery('') : onRefresh}
              />
            }
          />
        </View>
      )}

      {/* RSVP Modal */}
      <Modal
        visible={showRSVPModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRSVPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedRSVPItem?.name || 'RSVP'}
              </Text>
              <TouchableOpacity onPress={() => setShowRSVPModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {userPersona && (
                <View style={[styles.personaBadge, { backgroundColor: userPersona.color + '20', borderColor: userPersona.color }]}>
                  <Ionicons name={userPersona.icon} size={20} color={userPersona.color} />
                  <Text style={[styles.personaBadgeText, { color: userPersona.color }]}>
                    {userPersona.title} Persona
                  </Text>
                </View>
              )}
              
              <Text style={[styles.modalDescription, { color: theme.subtext }]}>
                {selectedRSVPItem?.description}
              </Text>
              
              {selectedRSVPItem?.dressCode && (
                <View style={[styles.dressCodeBadge, { backgroundColor: '#FF6B35' + '20', borderColor: '#FF6B35' }]}>
                  <Ionicons name="shirt-outline" size={18} color="#FF6B35" />
                  <Text style={[styles.dressCodeText, { color: '#FF6B35' }]}>
                    {selectedRSVPItem.dressCode}
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="Your full name"
                  placeholderTextColor={theme.subtext}
                  value={rsvpData.name}
                  onChangeText={(text) => setRsvpData({ ...rsvpData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Email *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="your@email.com"
                  placeholderTextColor={theme.subtext}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={rsvpData.email}
                  onChangeText={(text) => setRsvpData({ ...rsvpData, email: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Phone</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={theme.subtext}
                  keyboardType="phone-pad"
                  value={rsvpData.phone}
                  onChangeText={(text) => setRsvpData({ ...rsvpData, phone: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Number of Guests</Text>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => setRsvpData({ ...rsvpData, guestCount: Math.max(1, rsvpData.guestCount - 1) })}
                  >
                    <Ionicons name="remove" size={20} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={[styles.quantityText, { color: theme.text }]}>{rsvpData.guestCount}</Text>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => setRsvpData({ ...rsvpData, guestCount: rsvpData.guestCount + 1 })}
                  >
                    <Ionicons name="add" size={20} color={theme.text} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>Special Requests</Text>
                <TextInput
                  style={[styles.formTextArea, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="Any special requests or dietary restrictions..."
                  placeholderTextColor={theme.subtext}
                  multiline
                  numberOfLines={4}
                  value={rsvpData.specialRequests}
                  onChangeText={(text) => setRsvpData({ ...rsvpData, specialRequests: text })}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primary }]}
                onPress={handleRSVPSubmit}
              >
                <Text style={styles.submitButtonText}>Confirm RSVP</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Scroll Indicator */}
      {showScrollIndicator && selectedCategory !== 'Users' && (
        <ScrollIndicator
          visible={showScrollIndicator}
          onScrollStart={() => setShowScrollIndicator(false)}
        />
      )}
    </SafeAreaView>
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
    marginTop: 10,
    fontSize: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
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
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 15,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  instagramCard: {
    width: itemWidth,
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
  },
  leftCard: {
    marginRight: 10,
  },
  rightCard: {
    marginLeft: 10,
  },
  imageContainer: {
    position: 'relative',
    height: itemWidth,
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'space-between',
    padding: 10,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 10,
    marginLeft: 2,
  },
  cardContent: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 12,
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
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
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  personaBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  dressCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  dressCodeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});