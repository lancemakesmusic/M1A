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
import { eventsCache, servicesCache } from '../utils/dataCache';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackFeatureUsage, trackSearch } from '../services/AnalyticsService';
import { sendDiscountNotification } from '../services/NotificationService';
import ReviewService from '../services/ReviewService';
import SharingService from '../services/SharingService';
import SMSService from '../services/SMSService';
import { filterItemsByPersona, getPersonaServiceCategories } from '../utils/personaFilters';
import { searchFeatures } from '../utils/searchUtils';
import UsersScreen from './UsersScreen';

const { width } = Dimensions.get('window');
const itemWidth = (width - 36) / 2; // 2 columns with tighter padding

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
  const [userCount, setUserCount] = useState(0);
  const [barItemCount, setBarItemCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPersonaFilter, setSelectedPersonaFilter] = useState('All');
  const [showPersonaFilters, setShowPersonaFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: null,
    maxPrice: null,
    minRating: null,
    location: '',
    eventCategory: null, // 'performance', 'party', 'corporate', 'wedding', etc.
    dealsOnly: false,
    dateRange: null, // { start: Date, end: Date }
    hasDiscount: false,
  });
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'price_low', 'price_high', 'rating', 'date', 'popularity', 'name'
  const [showSortOptions, setShowSortOptions] = useState(false);
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

  const categories = ['Users', 'Events', 'Services', 'Bar'];

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
    // Check cache first
    const cacheKey = eventsCache.generateKey('explore', { userId: user?.uid || 'guest' });
    const cachedData = eventsCache.get(cacheKey);
    if (cachedData) {
      console.log('📦 Using cached explore data');
      setItems(cachedData.items || []);
      setBarItemCount(cachedData.barItemCount || 0);
      setUserCount(cachedData.userCount || 0);
      setLoading(false);
      // Still refresh in background
    }

    try {
      // Check if we have real Firestore (db doesn't have collection method)
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - load from services and events collections
        const { collection: firestoreCollection, query: firestoreQuery, where, getDocs, orderBy: firestoreOrderBy, limit: firestoreLimit, Timestamp } = await import('firebase/firestore');
        const now = Timestamp.now();
        
        // Load services from Firestore
        let servicesData = [];
        try {
          const servicesQuery = firestoreQuery(
            firestoreCollection(db, 'services'),
            where('available', '==', true),
            firestoreOrderBy('popularity', 'desc'),
            firestoreLimit(50)
          );
          const servicesSnapshot = await getDocs(servicesQuery);
          servicesData = servicesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            category: 'Services',
          }));
        } catch (serviceError) {
          console.warn('Services query failed, trying simple query:', serviceError);
          // Fallback: try without orderBy if index not ready
          try {
            const simpleServicesQuery = firestoreQuery(
              firestoreCollection(db, 'services'),
              where('available', '==', true),
              firestoreLimit(50)
            );
            const simpleServicesSnapshot = await getDocs(simpleServicesQuery);
            servicesData = simpleServicesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              category: 'Services',
            }));
          } catch (simpleError) {
            console.error('Services query failed completely:', simpleError);
            servicesData = [];
          }
        }

        // Load events from Firestore (future events only)
        // Load from both 'events' and 'publicEvents' collections
        let eventsData = [];
        
        // Load from 'events' collection
        try {
          let eventsQuery;
          try {
            eventsQuery = firestoreQuery(
              firestoreCollection(db, 'events'),
              where('eventDate', '>=', now),
              firestoreOrderBy('eventDate', 'asc'),
              firestoreLimit(20)
            );
          } catch (indexError) {
            // If index not ready, use simple query without orderBy
            console.warn('Events index not ready, using simple query:', indexError);
            eventsQuery = firestoreQuery(
              firestoreCollection(db, 'events'),
              where('eventDate', '>=', now),
              firestoreLimit(20)
            );
          }
          const eventsSnapshot = await getDocs(eventsQuery);
          const eventsFromCollection = eventsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure eventDate exists and is valid
            if (!data.eventDate) {
              console.warn(`Event ${doc.id} missing eventDate, skipping`);
              return null;
            }
            return {
              id: doc.id,
              ...data,
              // Normalize image field - use image if exists, otherwise photoUrl or photo
              image: data.image || data.photoUrl || data.photo || null,
              category: 'Events',
            };
          }).filter(item => item !== null);
          eventsData = [...eventsData, ...eventsFromCollection];
        } catch (eventsError) {
          console.error('Events query failed:', eventsError);
        }
        
        // Load from 'publicEvents' collection (admin-created events)
        // Load ALL public events (no limit) - filter for isPublic: true and isAdminCreated: true
        try {
          // First try: Load all publicEvents and filter client-side
          // This ensures we get all admin-created public events regardless of date/index issues
          const allPublicEventsSnapshot = await getDocs(firestoreCollection(db, 'publicEvents'));
          const allPublicEvents = allPublicEventsSnapshot.docs.map(doc => {
            const data = doc.data();
            
            // Include ALL events from publicEvents collection
            // All events in publicEvents are admin-created, so show them all
            // Only filter by isPublic if explicitly set to false
            if (data.isPublic === false) {
              return null; // Skip events explicitly marked as not public
            }
            
            // Convert publicEvents format to match events format
            const startDate = data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || new Date());
            const eventDate = startDate;
            
            // Filter for future events only (show events today or in the future)
            const nowDate = now.toDate ? now.toDate() : new Date(now.seconds * 1000);
            // Reset time to start of day for fair comparison
            const startOfToday = new Date(nowDate);
            startOfToday.setHours(0, 0, 0, 0);
            const startOfEventDate = new Date(startDate);
            startOfEventDate.setHours(0, 0, 0, 0);
            
            // Only show future events (skip past events, but include today)
            if (startOfEventDate < startOfToday) {
              console.log(`⏭️ Skipping past event: ${data.title || doc.id} (${startDate.toLocaleDateString()})`);
              return null;
            }
            
            // Debug logging for each event
            console.log(`✅ Including event: ${data.title || doc.id}, isPublic: ${data.isPublic}, isAdminCreated: ${data.isAdminCreated}, startDate: ${startDate.toLocaleDateString()}`);
            
            return {
              id: doc.id,
              name: data.title,
              description: data.description,
              image: data.photoUrl || data.photo || null, // Use image field for consistency
              photo: data.photoUrl, // Keep photo for backward compatibility
              eventDate: eventDate,
              location: data.location,
              price: data.ticketPrice || 0,
              ticketPrice: data.ticketPrice,
              earlyBirdPrice: data.earlyBirdPrice,
              vipPrice: data.vipPrice,
              capacity: data.capacity,
              isPublic: data.isPublic,
              ticketsEnabled: data.ticketsEnabled,
              discountEnabled: data.discountEnabled,
              discountPercent: data.discountPercent,
              discountCode: data.discountCode,
              eventCategory: data.category || 'performance',
              isAdminCreated: data.isAdminCreated,
              category: 'Events',
            };
          }).filter(item => item !== null);
          
          // Sort by startDate ascending (earliest first)
          allPublicEvents.sort((a, b) => {
            const dateA = a.eventDate instanceof Date ? a.eventDate : new Date(a.eventDate);
            const dateB = b.eventDate instanceof Date ? b.eventDate : new Date(b.eventDate);
            return dateA - dateB;
          });
          
          eventsData = [...eventsData, ...allPublicEvents];
          console.log(`✅ Loaded ${allPublicEvents.length} public events from publicEvents collection`);
        } catch (publicEventsError) {
          console.error('PublicEvents query failed:', publicEventsError);
          // If loading all fails, try with date filter as fallback
          try {
            let publicEventsQuery;
            try {
              publicEventsQuery = firestoreQuery(
                firestoreCollection(db, 'publicEvents'),
                where('isPublic', '==', true),
                where('startDate', '>=', now),
                firestoreOrderBy('startDate', 'asc'),
                firestoreLimit(100) // Increased limit
              );
            } catch (indexError) {
              console.warn('PublicEvents index not ready, using simple query:', indexError);
              publicEventsQuery = firestoreQuery(
                firestoreCollection(db, 'publicEvents'),
                where('isPublic', '==', true),
                firestoreLimit(100) // Increased limit
              );
            }
            const publicEventsSnapshot = await getDocs(publicEventsQuery);
            const publicEventsFromCollection = publicEventsSnapshot.docs.map(doc => {
              const data = doc.data();
              const startDate = data.startDate?.toDate ? data.startDate.toDate() : (data.startDate || new Date());
              const eventDate = startDate;
              
              return {
                id: doc.id,
                name: data.title,
                description: data.description,
                image: data.photoUrl || data.photo || null,
                photo: data.photoUrl,
                eventDate: eventDate,
                location: data.location,
                price: data.ticketPrice || 0,
                ticketPrice: data.ticketPrice,
                earlyBirdPrice: data.earlyBirdPrice,
                vipPrice: data.vipPrice,
                capacity: data.capacity,
                isPublic: data.isPublic,
                ticketsEnabled: data.ticketsEnabled,
                discountEnabled: data.discountEnabled,
                discountPercent: data.discountPercent,
                discountCode: data.discountCode,
                eventCategory: data.category || 'performance',
                isAdminCreated: data.isAdminCreated,
                category: 'Events',
              };
            });
            eventsData = [...eventsData, ...publicEventsFromCollection];
            console.log(`✅ Loaded ${publicEventsFromCollection.length} public events (with filters)`);
          } catch (fallbackError) {
            console.error('PublicEvents fallback query failed:', fallbackError);
          }
        }

        // Load user count for Users category
        try {
          const usersRef = firestoreCollection(db, 'users');
          const usersQuery = firestoreQuery(
            usersRef,
            where('private', '==', false)
          );
          const usersSnapshot = await getDocs(usersQuery);
          setUserCount(usersSnapshot.size);
          console.log(`✅ Loaded ${usersSnapshot.size} public users`);
        } catch (userCountError) {
          console.warn('Failed to load user count:', userCountError);
          // Try simple query without where clause
          try {
            const allUsersSnapshot = await getDocs(firestoreCollection(db, 'users'));
            setUserCount(allUsersSnapshot.size);
            console.log(`✅ Loaded ${allUsersSnapshot.size} total users (fallback)`);
          } catch (fallbackError) {
            console.error('Failed to load user count (fallback):', fallbackError);
            setUserCount(0);
          }
        }

        // Load bar menu items count for Bar category
        try {
          const barMenuRef = firestoreCollection(db, 'barMenuItems');
          const barMenuSnapshot = await getDocs(barMenuRef);
          setBarItemCount(barMenuSnapshot.size);
          console.log(`✅ Loaded ${barMenuSnapshot.size} bar menu items`);
        } catch (barCountError) {
          console.warn('Failed to load bar menu items count:', barCountError);
          setBarItemCount(0);
        }

        // Combine all items
        const allItems = [...servicesData, ...eventsData];
        
        if (allItems.length > 0) {
          setItems(allItems);
          setLoading(false);
          
          // Cache the results
          const cacheKey = eventsCache.generateKey('explore', { userId: user?.uid || 'guest' });
          eventsCache.set(cacheKey, {
            items: allItems,
            barItemCount,
            userCount,
          }, 10 * 60 * 1000); // 10 minutes TTL
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
    
    // Enhanced search query filter with fuzzy matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Use enhanced search utility for better matching
      const searchableItems = filtered.map(item => ({
        title: item.name,
        description: item.description || '',
        icon: item.subcategory || '',
        screen: item.category || '',
        ...item
      }));
      
      const searchResults = searchFeatures(query, searchableItems);
      const resultIds = new Set(searchResults.map(r => r.id));
      
      // Also include basic text matching for items not caught by enhanced search
      filtered = filtered.filter(item => {
        if (resultIds.has(item.id)) return true;
        
        // Fallback: basic text matching
        const searchFields = [
          item.name,
          item.description,
          item.artist,
          item.subcategory,
          item.location,
          item.eventCategory,
          item.category,
        ].filter(Boolean).map(f => f.toLowerCase());
        
        return searchFields.some(field => field.includes(query));
      });
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
      filtered = filtered.filter(item => (item.rating || 0) >= filters.minRating);
    }
    
    // Location filter
    if (filters.location && filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase();
      filtered = filtered.filter(item => 
        item.location?.toLowerCase().includes(locationQuery) ||
        item.address?.toLowerCase().includes(locationQuery)
      );
    }
    
    // Event category filter
    if (filters.eventCategory && selectedCategory === 'Events') {
      filtered = filtered.filter(item => 
        item.eventCategory === filters.eventCategory ||
        item.category === filters.eventCategory
      );
    }
    
    // Deals only filter
    if (filters.dealsOnly) {
      filtered = filtered.filter(item => item.isDeal === true);
    }
    
    // Has discount filter
    if (filters.hasDiscount) {
      filtered = filtered.filter(item => 
        item.discountEnabled === true ||
        item.discountPercent > 0 ||
        item.isDeal === true
      );
    }
    
    // Date range filter (for events)
    if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
      filtered = filtered.filter(item => {
        if (!item.eventDate && !item.startDate) return false;
        const itemDate = item.eventDate || item.startDate;
        const date = itemDate instanceof Date ? itemDate : (itemDate?.toDate ? itemDate.toDate() : new Date(itemDate));
        return date >= filters.dateRange.start && date <= filters.dateRange.end;
      });
    }
    
    // Persona-based filtering (applies intelligent filtering based on user's persona)
    if (userPersona?.id && selectedCategory !== 'Users' && selectedCategory !== 'Bar') {
      filtered = filterItemsByPersona(filtered, userPersona.id, selectedCategory);
    }
    
    // Sorting
    const sorted = [...filtered];
    switch (sortBy) {
      case 'price_low':
        sorted.sort((a, b) => {
          const priceA = a.dealPrice || a.price || a.ticketPrice || 0;
          const priceB = b.dealPrice || b.price || b.ticketPrice || 0;
          return priceA - priceB;
        });
        break;
      case 'price_high':
        sorted.sort((a, b) => {
          const priceA = a.dealPrice || a.price || a.ticketPrice || 0;
          const priceB = b.dealPrice || b.price || b.ticketPrice || 0;
          return priceB - priceA;
        });
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.eventDate || a.startDate || a.serviceDate;
          const dateB = b.eventDate || b.startDate || b.serviceDate;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          const dA = dateA instanceof Date ? dateA : (dateA?.toDate ? dateA.toDate() : new Date(dateA));
          const dB = dateB instanceof Date ? dateB : (dateB?.toDate ? dateB.toDate() : new Date(dateB));
          return dA - dB;
        });
        break;
      case 'popularity':
        sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'relevance':
      default:
        // Keep search score order if available, otherwise maintain original order
        if (searchQuery.trim()) {
          sorted.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
        }
        break;
    }
    
    return sorted;
  }, [items, selectedCategory, searchQuery, filters, userPersona, sortBy]);
  
  // Track search
  useEffect(() => {
    if (searchQuery.trim()) {
      const debounceTimer = setTimeout(() => {
        trackSearch(searchQuery, filteredItems.length);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchQuery, filteredItems]);

  const getCategoryCount = (category) => {
    if (category === 'Users') {
      // Return actual user count from Firestore
      return userCount;
    }
    if (category === 'Bar') {
      // Return actual bar menu items count from Firestore
      return barItemCount;
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
    
    // Serialize item for navigation (convert Date objects to ISO strings)
    const serializedItem = { ...item };
    if (serializedItem.eventDate) {
      // Convert Date or Firestore Timestamp to ISO string
      if (serializedItem.eventDate.toDate) {
        serializedItem.eventDate = serializedItem.eventDate.toDate().toISOString();
      } else if (serializedItem.eventDate instanceof Date) {
        serializedItem.eventDate = serializedItem.eventDate.toISOString();
      }
    }
    if (serializedItem.startDate) {
      // Convert Date or Firestore Timestamp to ISO string
      if (serializedItem.startDate.toDate) {
        serializedItem.startDate = serializedItem.startDate.toDate().toISOString();
      } else if (serializedItem.startDate instanceof Date) {
        serializedItem.startDate = serializedItem.startDate.toISOString();
      }
    }
    
    // All Services and Events (non-RSVP) go to ServiceBooking
    // This includes: Services, Events that aren't RSVP
    if (item.category === 'Services' || (item.category === 'Events' && !item.isRSVP)) {
      // Navigate directly to ServiceBooking screen in drawer
      navigation.navigate('ServiceBooking', { item: serializedItem });
      return;
    }
    
    // Fallback: Navigate to service booking for any other item
    navigation.navigate('ServiceBooking', { item: serializedItem });
  };

  const handleRSVPSubmit = async () => {
    const isPhoneOnlyRSVP = selectedRSVPItem?.phoneOnlyRSVP || 
                            selectedRSVPItem?.name?.includes('New Year');

    // Validation based on event type
    if (isPhoneOnlyRSVP) {
      if (!rsvpData.phone || rsvpData.phone.trim().length < 10) {
        Alert.alert('Missing Information', 'Please enter a valid phone number.');
        return;
      }
    } else {
      if (!rsvpData.name || !rsvpData.email) {
        Alert.alert('Missing Information', 'Please fill in your name and email.');
        return;
      }
    }

    try {
      // Generate ticket ID and QR code data
      const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const qrCodeData = JSON.stringify({
        ticketId,
        eventId: selectedRSVPItem.id,
        eventName: selectedRSVPItem.name,
        phone: rsvpData.phone,
        date: selectedRSVPItem.eventDate?.toDate?.()?.toISOString() || new Date('2025-12-31T20:00:00').toISOString(),
      });

      // Save RSVP to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
        const rsvpDoc = await addDoc(collection(db, 'rsvps'), {
          eventId: selectedRSVPItem.id,
          eventName: selectedRSVPItem.name,
          userId: userPersona?.id || 'anonymous',
          persona: userPersona?.id || null,
          personaName: userPersona?.title || null,
          name: isPhoneOnlyRSVP ? '' : rsvpData.name,
          email: isPhoneOnlyRSVP ? '' : rsvpData.email,
          phone: rsvpData.phone,
          guestCount: rsvpData.guestCount,
          specialRequests: rsvpData.specialRequests || '',
          status: 'confirmed',
          ticketId,
          qrCodeData,
          createdAt: serverTimestamp(),
        });

        // Send SMS with QR code for phone-only RSVP events
        if (isPhoneOnlyRSVP && rsvpData.phone) {
          // Format phone number (ensure E.164 format)
          let formattedPhone = rsvpData.phone.replace(/\D/g, ''); // Remove non-digits
          if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
            formattedPhone = '1' + formattedPhone; // Add US country code
          }
          if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }

          // Generate QR code image URL (we'll create this on backend)
          const qrCodeUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/api/qr-code/${ticketId}`;

          // Send SMS
          const smsResult = await SMSService.sendRSVPConfirmation(
            formattedPhone,
            selectedRSVPItem.name,
            ticketId,
            qrCodeUrl
          );

          if (smsResult.success) {
            Alert.alert(
              'RSVP Confirmed!',
              `Your RSVP for ${selectedRSVPItem.name} has been confirmed! A confirmation text with your ticket QR code has been sent to ${rsvpData.phone}.`,
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
          } else {
            // RSVP saved but SMS failed
            Alert.alert(
              'RSVP Confirmed!',
              `Your RSVP has been confirmed, but we couldn't send the confirmation text. Please save your ticket ID: ${ticketId}`,
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
          }
        } else {
          // Regular RSVP confirmation
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
        }
      } else {
        throw new Error('Firestore not ready');
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      Alert.alert('Error', 'Failed to submit RSVP. Please try again.');
    }
  };
  
  const handleSearch = (text) => {
    setSearchQuery(text);
  };

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
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.serviceImage, { backgroundColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={40} color={theme.subtext} />
          </View>
        )}
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
          borderWidth: 1
        }
      ]}
      onPress={() => {
        trackButtonClick('select_category', 'ExploreScreen', { category: item });
        // Navigate to BarMenuScreen immediately when Bar is selected
        if (item === 'Bar') {
          navigation.navigate('BarMenu');
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

      {/* Compact Header - only show if not accessed from drawer */}
      {!canGoBack && (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Explore</Text>
        </View>
      )}

      {/* Compact Search and Category Filters */}
      <View style={styles.searchAndFiltersContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.subtext} style={styles.searchIcon} />
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
              <Ionicons name="close-circle" size={18} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>
        {selectedCategory === 'Users' ? (
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => {
              setShowPersonaFilters(true);
              trackButtonClick('open_persona_filters', 'ExploreScreen');
            }}
          >
            <Ionicons name="people" size={18} color={theme.primary} />
            {selectedPersonaFilter !== 'All' && (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.filterBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginRight: 8 }]}
              onPress={() => {
                setShowSortOptions(true);
                trackButtonClick('open_sort', 'ExploreScreen');
              }}
            >
              <Ionicons name="swap-vertical" size={18} color={theme.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
              onPress={() => {
                setShowFilters(true);
                trackButtonClick('open_filters', 'ExploreScreen');
              }}
            >
              <Ionicons name="options" size={18} color={theme.primary} />
              {(filters.minPrice !== null || filters.maxPrice !== null || filters.minRating !== null || 
                filters.location || filters.eventCategory || filters.dealsOnly || filters.hasDiscount || filters.dateRange) && (
                <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.filterBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

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
        <UsersScreen navigation={navigation} selectedPersonaFilter={selectedPersonaFilter} />
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

              {(!selectedRSVPItem?.phoneOnlyRSVP && !selectedRSVPItem?.name?.includes('New Year')) && (
                <>
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
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.text }]}>
                  Phone {(selectedRSVPItem?.phoneOnlyRSVP || selectedRSVPItem?.name?.includes('New Year')) ? '*' : ''}
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={theme.subtext}
                  keyboardType="phone-pad"
                  value={rsvpData.phone}
                  onChangeText={(text) => setRsvpData({ ...rsvpData, phone: text })}
                />
                {(selectedRSVPItem?.phoneOnlyRSVP || selectedRSVPItem?.name?.includes('New Year')) && (
                  <Text style={[styles.helperText, { color: theme.subtext }]}>
                    You'll receive a confirmation text with your ticket QR code
                  </Text>
                )}
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
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Price Range</Text>
                <View style={styles.priceInputContainer}>
                  <View style={styles.priceInputWrapper}>
                    <Text style={[styles.priceLabel, { color: theme.subtext }]}>Min</Text>
                    <TextInput
                      style={[styles.priceInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                      placeholder="$0"
                      placeholderTextColor={theme.subtext}
                      keyboardType="numeric"
                      value={filters.minPrice !== null ? String(filters.minPrice) : ''}
                      onChangeText={(text) => setFilters({ ...filters, minPrice: text ? parseFloat(text) : null })}
                    />
                  </View>
                  <Text style={[styles.priceSeparator, { color: theme.subtext }]}>-</Text>
                  <View style={styles.priceInputWrapper}>
                    <Text style={[styles.priceLabel, { color: theme.subtext }]}>Max</Text>
                    <TextInput
                      style={[styles.priceInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                      placeholder="$1000"
                      placeholderTextColor={theme.subtext}
                      keyboardType="numeric"
                      value={filters.maxPrice !== null ? String(filters.maxPrice) : ''}
                      onChangeText={(text) => setFilters({ ...filters, maxPrice: text ? parseFloat(text) : null })}
                    />
                  </View>
                </View>
              </View>

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

              {/* Event Category Filter (only for Events) */}
              {selectedCategory === 'Events' && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Event Category</Text>
                  <View style={styles.categoryFilterContainer}>
                    {['performance', 'party', 'corporate', 'wedding', 'networking', 'workshop'].map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryFilterButton,
                          {
                            backgroundColor: filters.eventCategory === category ? theme.primary : theme.cardBackground,
                            borderColor: filters.eventCategory === category ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => setFilters({ ...filters, eventCategory: filters.eventCategory === category ? null : category })}
                      >
                        <Text
                          style={[
                            styles.categoryFilterText,
                            { color: filters.eventCategory === category ? '#fff' : theme.text },
                          ]}
                        >
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Deals & Discounts */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Deals & Discounts</Text>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFilters({ ...filters, dealsOnly: !filters.dealsOnly })}
                >
                  <View style={styles.switchLabel}>
                    <Ionicons name="pricetag" size={20} color={theme.primary} />
                    <Text style={[styles.switchText, { color: theme.text }]}>Deals Only</Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: filters.dealsOnly ? theme.primary : theme.border }]}>
                    <View
                      style={[
                        styles.switchThumb,
                        { transform: [{ translateX: filters.dealsOnly ? 20 : 0 }] },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchRow}
                  onPress={() => setFilters({ ...filters, hasDiscount: !filters.hasDiscount })}
                >
                  <View style={styles.switchLabel}>
                    <Ionicons name="ticket" size={20} color={theme.primary} />
                    <Text style={[styles.switchText, { color: theme.text }]}>Has Discount</Text>
                  </View>
                  <View style={[styles.switch, { backgroundColor: filters.hasDiscount ? theme.primary : theme.border }]}>
                    <View
                      style={[
                        styles.switchThumb,
                        { transform: [{ translateX: filters.hasDiscount ? 20 : 0 }] },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Clear Filters Button */}
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  setFilters({
                    minPrice: null,
                    maxPrice: null,
                    minRating: null,
                    location: '',
                    eventCategory: null,
                    dealsOnly: false,
                    dateRange: null,
                    hasDiscount: false,
                  });
                  trackButtonClick('clear_filters', 'ExploreScreen');
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
                { value: 'relevance', label: 'Relevance', icon: 'search' },
                { value: 'price_low', label: 'Price: Low to High', icon: 'arrow-up' },
                { value: 'price_high', label: 'Price: High to Low', icon: 'arrow-down' },
                { value: 'rating', label: 'Highest Rated', icon: 'star' },
                { value: 'date', label: 'Date: Soonest First', icon: 'calendar' },
                { value: 'popularity', label: 'Most Popular', icon: 'flame' },
                { value: 'name', label: 'Name: A to Z', icon: 'text' },
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
                    trackButtonClick('select_sort', 'ExploreScreen', { sortBy: option.value });
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

      {/* Persona Filter Modal (for Users category) */}
      <Modal
        visible={showPersonaFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPersonaFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter by Persona</Text>
              <TouchableOpacity onPress={() => setShowPersonaFilters(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {['All', 'Artist', 'Vendor', 'Promoter', 'Guest'].map((persona) => (
                <TouchableOpacity
                  key={persona}
                  style={[
                    styles.personaFilterOption,
                    {
                      backgroundColor: selectedPersonaFilter === persona ? theme.primary + '20' : theme.cardBackground,
                      borderColor: selectedPersonaFilter === persona ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPersonaFilter(persona);
                    trackButtonClick('select_persona_filter', 'ExploreScreen', { persona });
                    setShowPersonaFilters(false);
                  }}
                >
                  <Text
                    style={[
                      styles.personaFilterText,
                      {
                        color: selectedPersonaFilter === persona ? theme.primary : theme.text,
                        fontWeight: selectedPersonaFilter === persona ? '600' : '400',
                      },
                    ]}
                  >
                    {persona}
                  </Text>
                  {selectedPersonaFilter === persona && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchAndFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
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
  personaFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  personaFilterText: {
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 0,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginRight: 8,
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
    paddingHorizontal: 12,
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
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  shareButton: {
    padding: 4,
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
  // Filter Modal Styles
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  priceSeparator: {
    fontSize: 18,
    marginTop: 20,
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