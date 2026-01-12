import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
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
import ErrorRecovery from '../components/ErrorRecovery';
import M1ALogo from '../components/M1ALogo';
import ScrollIndicator from '../components/ScrollIndicator';
import ServiceCardWithAnimation from '../components/ServiceCardWithAnimation';
import TutorialOverlay from '../components/TutorialOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { useWallet } from '../contexts/WalletContext';
import { getPersonaWelcomeMessage, getPersonaQuickActions, getPersonaRecommendedFeatures } from '../utils/personaFilters';
import { searchFeatures, getSearchSuggestions } from '../utils/searchUtils';
import { db, isFirebaseReady } from '../firebase';

export default function HomeScreen({ navigation }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: userProfile } = useContext(UserContext);
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const { balance: walletBalance, refreshBalance } = useWallet();
  const { 
    userPersona, 
    getPersonaColor, 
    getPersonaIcon,
    shouldShowTutorial,
    markTutorialComplete,
    getTutorialSteps
  } = useM1APersonalization();
  
  // SECURITY: Only admin@merkabaent.com can access admin panels
  const isAdmin = authUser?.email === 'admin@merkabaent.com';
  
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [stats, setStats] = useState({
    activeEvents: 0,
    upcomingEvents: 0,
    totalBookings: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Refresh wallet balance when screen is focused (e.g., after admin adjustment)
  useFocusEffect(
    useCallback(() => {
      if (authUser?.uid) {
        // Refresh balance from WalletContext when screen comes into focus
        refreshBalance(authUser.uid);
      }
    }, [authUser?.uid, refreshBalance])
  );

  // Show tutorial on first visit to home screen
  useEffect(() => {
    if (shouldShowTutorial && shouldShowTutorial()) {
      // Small delay to let screen render first
      setTimeout(() => {
        setShowTutorial(true);
      }, 500);
    }
  }, [shouldShowTutorial]);

  // All available features for search
  const allFeatures = useMemo(() => {
    const features = [
      { id: 'event-booking', title: 'Schedule an Event', description: 'Book your next performance or event', icon: 'calendar', color: '#007AFF', screen: 'EventBooking' },
      { id: 'auto-poster', title: 'Auto Poster', description: 'AI-powered social media management', icon: 'rocket', color: '#FF6B6B', screen: 'AutoPoster' },
      { id: 'm1a-dashboard', title: 'M1A Dashboard', description: 'Your personalized analytics & insights', icon: 'sparkles', color: '#9C27B0', screen: 'M1ADashboard' },
      { id: 'explore', title: 'Explore Services', description: 'Find vendors and services', icon: 'search', color: '#34C759', screen: 'Explore' },
      { id: 'bar-menu', title: 'Bar Menu', description: 'Order drinks and food', icon: 'wine', color: '#FF9500', screen: 'BarMenu' },
      { id: 'messages', title: 'Messages', description: 'Communicate with clients', icon: 'chatbubbles', color: '#FF9500', screen: 'Messages' },
      { id: 'wallet', title: 'Wallet', description: 'Manage payments and transactions', icon: 'wallet', color: '#34C759', screen: 'Wallet' },
      { id: 'profile', title: 'Profile', description: 'View and edit your profile', icon: 'person', color: '#9C27B0', screen: 'ProfileTab' },
    ];
    return features;
  }, []);

  // Enhanced search functionality with fuzzy matching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const results = searchFeatures(searchQuery, allFeatures);
      setSearchResults(results);
      
      // Show suggestions for partial queries
      if (searchQuery.trim().length >= 2) {
        const suggestions = getSearchSuggestions(searchQuery, allFeatures);
        setSearchSuggestions(suggestions);
      } else {
        setSearchSuggestions([]);
      }
    } else {
      setSearchResults([]);
      setSearchSuggestions([]);
    }
  }, [searchQuery, allFeatures]);

  // Load personalized stats
  useEffect(() => {
    if (authUser?.uid) {
      loadUserStats();
    }
  }, [authUser?.uid]);

  const loadUserStats = async () => {
    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      return;
    }

    // Check cache first
    const cacheKey = dataCache.generateKey('homeStats', { userId: authUser?.uid });
    const cachedStats = dataCache.get(cacheKey);
    if (cachedStats) {
      console.log('📦 Using cached home stats');
      setStats(cachedStats);
      setLoadingStats(false);
      // Still refresh in background
    }

    setLoadingStats(true);
    try {
      const { collection: firestoreCollection, query: firestoreQuery, where, getCountFromServer, Timestamp } = await import('firebase/firestore');
      const now = Timestamp.now();

      // Get upcoming events count
      try {
        const upcomingEventsQuery = firestoreQuery(
          firestoreCollection(db, 'eventBookings'),
          where('userId', '==', authUser.uid),
          where('eventDate', '>=', now)
        );
        const upcomingSnapshot = await getCountFromServer(upcomingEventsQuery);
        const upcomingEvents = upcomingSnapshot.data().count;

        // Get total bookings
        const totalBookingsQuery = firestoreQuery(
          firestoreCollection(db, 'eventBookings'),
          where('userId', '==', authUser.uid)
        );
        const totalSnapshot = await getCountFromServer(totalBookingsQuery);
        const totalBookings = totalSnapshot.data().count;

        const newStats = {
          activeEvents: upcomingEvents,
          upcomingEvents: upcomingEvents,
          totalBookings: totalBookings,
        };
        setStats(newStats);
        
        // Cache the results
        const cacheKey = dataCache.generateKey('homeStats', { userId: authUser?.uid });
        dataCache.set(cacheKey, newStats, 3 * 60 * 1000); // 3 minutes TTL
      } catch (error) {
        console.warn('Error loading stats:', error);
        // Keep default values on error
      }
    } catch (error) {
      console.warn('Error initializing stats load:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearchSelect = (feature) => {
    setSearchQuery('');
    setShowSearch(false);
    navigation.navigate(feature.screen);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Refresh wallet balance and user data
      if (authUser?.uid) {
        await refreshBalance(authUser.uid);
        await loadUserStats(); // Refresh stats on pull-to-refresh
      }
      // Add any other refresh logic here
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Error refreshing home screen:', err);
      setError('Failed to refresh. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [authUser?.uid, refreshBalance]);

  const handleTutorialNext = () => {
    const tutorialSteps = getTutorialSteps();
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      handleTutorialComplete();
    }
  };

  const handleTutorialPrevious = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const handleTutorialComplete = async () => {
    setShowTutorial(false);
    await markTutorialComplete();
  };

  const handleTutorialSkip = async () => {
    setShowTutorial(false);
    await markTutorialComplete();
  };

  // Get persona-specific services and recommendations
  const primaryServices = useMemo(() => {
    const personaId = userPersona?.id || 'guest';
    
    // Get persona-specific recommended features
    const personaRecommended = getPersonaRecommendedFeatures(personaId);
    
    // Convert to service format
    const recommendedServices = personaRecommended.map((feature, index) => ({
      id: feature.id || `rec-${index}`,
      title: feature.title,
      description: feature.description,
      icon: feature.icon,
      color: feature.color || '#007AFF',
      onPress: () => navigation.navigate(feature.screen),
    }));
    
    // Define base services for each persona
    const personaServices = {
      promoter: [
        {
          id: '1',
          title: 'Schedule an Event',
          description: 'Create and manage your events',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '2',
          title: 'Auto Poster',
          description: 'AI-powered social media management',
          icon: 'rocket',
          color: '#FF6B6B',
          onPress: () => navigation.navigate('AutoPoster'),
        },
        {
          id: '3',
          title: 'M1A Dashboard',
          description: 'Your personalized analytics & insights',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '4',
          title: 'Explore Services',
          description: 'Find vendors and services',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
      ],
      coordinator: [
        {
          id: '1',
          title: 'Schedule an Event',
          description: 'Plan and coordinate events',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '2',
          title: 'M1A Dashboard',
          description: 'Track your events and tasks',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '3',
          title: 'Explore Services',
          description: 'Find vendors and suppliers',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
        {
          id: '4',
          title: 'Messages',
          description: 'Communicate with clients',
          icon: 'chatbubbles',
          color: '#FF9500',
          onPress: () => navigation.navigate('Messages'),
        },
      ],
      planner: [
        {
          id: '1',
          title: 'Schedule an Event',
          description: 'Plan weddings and special events',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '2',
          title: 'Explore Services',
          description: 'Find vendors and suppliers',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
        {
          id: '3',
          title: 'M1A Dashboard',
          description: 'Manage your events and clients',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '4',
          title: 'Messages',
          description: 'Connect with clients',
          icon: 'chatbubbles',
          color: '#FF9500',
          onPress: () => navigation.navigate('Messages'),
        },
      ],
      venue: [
        {
          id: '1',
          title: 'Bar Menu',
          description: 'Manage your bar and menu',
          icon: 'wine',
          color: '#FF9500',
          onPress: () => navigation.navigate('BarMenu'),
        },
        {
          id: '2',
          title: 'Schedule an Event',
          description: 'Book events at your venue',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '3',
          title: 'M1A Dashboard',
          description: 'Track bookings and revenue',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '4',
          title: 'Explore Services',
          description: 'Find service providers',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
      ],
      performer: [
        {
          id: '1',
          title: 'Schedule an Event',
          description: 'Book your performances',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '2',
          title: 'Auto Poster',
          description: 'Promote your shows',
          icon: 'rocket',
          color: '#FF6B6B',
          onPress: () => navigation.navigate('AutoPoster'),
        },
        {
          id: '3',
          title: 'M1A Dashboard',
          description: 'Track your bookings',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '4',
          title: 'Explore Services',
          description: 'Find opportunities',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
      ],
      vendor: [
        {
          id: '1',
          title: 'Explore Services',
          description: 'Manage your service listings',
          icon: 'search',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
        {
          id: '2',
          title: 'M1A Dashboard',
          description: 'Track bookings and clients',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '3',
          title: 'Messages',
          description: 'Connect with clients',
          icon: 'chatbubbles',
          color: '#FF9500',
          onPress: () => navigation.navigate('Messages'),
        },
        {
          id: '4',
          title: 'Schedule an Event',
          description: 'Book service appointments',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
      ],
      guest: [
        {
          id: '1',
          title: 'Schedule an Event',
          description: 'Book your next event',
          icon: 'calendar',
          color: '#007AFF',
          onPress: () => navigation.navigate('EventBooking'),
        },
        {
          id: '2',
          title: 'Bar Menu',
          description: 'Order drinks and food',
          icon: 'wine',
          color: '#FF9500',
          onPress: () => navigation.navigate('BarMenu'),
        },
        {
          id: '3',
          title: 'M1A Assistant',
          description: 'Get help and recommendations',
          icon: 'sparkles',
          color: '#9C27B0',
          onPress: () => navigation.navigate('M1ADashboard'),
        },
        {
          id: '4',
          title: 'Services',
          description: 'Browse available services',
          icon: 'musical-notes',
          color: '#34C759',
          onPress: () => navigation.navigate('Explore'),
        },
      ],
    };

    return personaServices[personaId] || personaServices.guest;
  }, [navigation, userPersona]);

  const menuItems = [
    { title: 'Profile', icon: 'person', onPress: () => navigation.navigate('ProfileTab') },
    { title: 'Messages', icon: 'chatbubbles', onPress: () => navigation.navigate('Messages') },
    { title: 'Wallet', icon: 'wallet', onPress: () => navigation.navigate('Wallet') },
    { title: 'Settings', icon: 'settings', onPress: () => navigation.navigate('M1ASettings') },
    { title: 'Help', icon: 'help-circle', onPress: () => navigation.navigate('Help') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ flex: 1 }}>
        <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={() => {
          setShowScrollIndicator(false);
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        nestedScrollEnabled={true}
        collapsable={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {/* Header with Value Proposition */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTopRow}>
              {userPersona && (
                <View style={[styles.personaBadge, { backgroundColor: getPersonaColor() + '20' }]}>
                  <Ionicons name={getPersonaIcon()} size={16} color={getPersonaColor()} />
                  <Text style={[styles.personaBadgeText, { color: getPersonaColor() }]}>
                    {userPersona.title}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => navigation.openDrawer?.()}
                style={styles.menuButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="menu" size={28} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <M1ALogo size={64} variant="full" style={styles.homeLogo} />
            </View>
            
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  {userPersona ? `Welcome, ${userPersona.title}` : 'Welcome'}
                </Text>
                <Text style={[styles.valueProposition, { color: theme.subtext }]}>
                  {userPersona 
                    ? getPersonaWelcomeMessage(userPersona.id)
                    : 'Your AI-powered assistant for everything Merkaba'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="search" size={20} color={theme.subtext} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search features..."
              placeholderTextColor={theme.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.subtext} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Search Suggestions */}
        {showSearch && searchQuery.length >= 2 && searchSuggestions.length > 0 && searchResults.length === 0 && (
          <View style={[styles.searchSuggestionsContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.suggestionsTitle, { color: theme.subtext }]}>Suggestions</Text>
            {searchSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
                onPress={() => setSearchQuery(suggestion)}
              >
                <Ionicons name="search-outline" size={16} color={theme.subtext} />
                <Text style={[styles.suggestionText, { color: theme.text }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search Results */}
        {showSearch && searchQuery.length > 0 && (
          <View style={[styles.searchResultsContainer, { backgroundColor: theme.background }]}>
            {searchResults.length > 0 ? (
              searchResults.map((feature) => (
                <TouchableOpacity
                  key={feature.id}
                  style={[styles.searchResultItem, { backgroundColor: theme.cardBackground }]}
                  onPress={() => handleSearchSelect(feature)}
                >
                  <View style={[styles.searchResultIcon, { backgroundColor: feature.color + '20' }]}>
                    <Ionicons name={feature.icon} size={20} color={feature.color} />
                  </View>
                  <View style={styles.searchResultContent}>
                    <Text style={[styles.searchResultTitle, { color: theme.text }]}>
                      {feature.title}
                    </Text>
                    <Text style={[styles.searchResultDescription, { color: theme.subtext }]}>
                      {feature.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={32} color={theme.subtext} />
                <Text style={[styles.noResultsText, { color: theme.subtext }]}>
                  No features found matching "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error Recovery */}
        {error && (
          <ErrorRecovery
            error={error}
            onRetry={onRefresh}
            onDismiss={() => setError(null)}
            title="Failed to refresh"
            message={typeof error === 'string' ? error : error.message}
          />
        )}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: theme.subtext }]}>Hello,</Text>
          <Text style={[styles.userName, { color: theme.text }]}>
            {userProfile?.firstName || userProfile?.displayName?.split(' ')[0] || authUser?.displayName?.split(' ')[0] || (authUser?.email?.split('@')[0] || 'Guest')}
          </Text>
        </View>

        {/* Admin Section (Admin Only) */}
        {isAdmin && (
          <View style={[styles.adminSection, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}>
            <View style={styles.adminSectionHeader}>
              <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
              <Text style={[styles.adminSectionTitle, { color: theme.text }]}>Admin Tools</Text>
            </View>
            <View style={styles.adminButtonsContainer}>
              <TouchableOpacity
                style={[styles.adminQuickButton, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AdminEventCreation')}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.adminQuickButtonText}>Create Event</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adminQuickButton, { backgroundColor: theme.cardBackground, borderColor: theme.primary }]}
                onPress={() => navigation.navigate('AdminControlCenter')}
              >
                <Ionicons name="settings" size={24} color={theme.primary} />
                <Text style={[styles.adminQuickButtonText, { color: theme.primary }]}>Control Center</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {userPersona ? `Your ${userPersona.title} Tools` : 'Services'}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
            {userPersona 
              ? `Everything you need to ${userPersona.description?.toLowerCase() || 'succeed'}`
              : "Choose what you'd like to do"}
          </Text>
          
          <View style={styles.servicesContainer}>
            {primaryServices.map((service, index) => (
              <View key={service.id} style={styles.serviceCardWrapper} collapsable={false} removeClippedSubviews={false}>
                <ServiceCardWithAnimation
                  index={index}
                  delay={150}
                  style={[
                    styles.serviceCard, 
                    { 
                      backgroundColor: theme.cardBackground,
                      shadowColor: theme.shadow,
                    }
                  ]}
                  onPress={service.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${service.title}. ${service.description}`}
                  accessibilityHint="Tap to open this service"
                >
                {/* Color accent on the left */}
                <View style={[styles.colorAccent, { backgroundColor: service.color }]} />
                
                <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                  <Ionicons name={service.icon} size={20} color="white" />
                </View>
                <View style={styles.serviceContent}>
                  <Text style={[styles.serviceTitle, { color: theme.text }]}>{service.title}</Text>
                  <Text style={[styles.serviceDescription, { color: theme.subtext }]}>{service.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </ServiceCardWithAnimation>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Stats Section */}
        <View style={styles.quickStatsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Stats</Text>
          <View style={styles.statsContainer}>
            <TouchableOpacity
              style={[
                styles.statCard, 
                { 
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="wallet" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.primary }]}>
                ${typeof walletBalance === 'number' ? walletBalance.toFixed(2) : '0.00'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Wallet Balance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statCard, 
                { 
                  backgroundColor: theme.cardBackground,
                  shadowColor: theme.shadow,
                }
              ]}
              onPress={() => navigation.navigate('Explore', { initialCategory: 'Events' })}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconContainer, { backgroundColor: getPersonaColor() + '20' }]}>
                <Ionicons name="calendar" size={20} color={getPersonaColor()} />
              </View>
              {loadingStats ? (
                <Text style={[styles.statValue, { color: theme.subtext }]}>...</Text>
              ) : (
                <Text style={[styles.statValue, { color: getPersonaColor() }]}>
                  {stats.upcomingEvents}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Upcoming Events</Text>
            </TouchableOpacity>
            {stats.totalBookings > 0 && (
              <TouchableOpacity
                style={[
                  styles.statCard, 
                  { 
                    backgroundColor: theme.cardBackground,
                    shadowColor: theme.shadow,
                  }
                ]}
                onPress={() => navigation.navigate('M1ADashboard')}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconContainer, { backgroundColor: '#9C27B0' + '20' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#9C27B0" />
                </View>
                <Text style={[styles.statValue, { color: '#9C27B0' }]}>
                  {stats.totalBookings}
                </Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Total Bookings</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </ScrollView>
      </View>

      {/* Hamburger Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMenu(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.menuModal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Quick Access</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.menuContent}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    item.onPress();
                    setShowMenu(false);
                  }}
                >
                  <Ionicons name={item.icon} size={24} color={theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.subtext} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        steps={getTutorialSteps()}
        currentStep={tutorialStep}
        onNext={handleTutorialNext}
        onPrevious={handleTutorialPrevious}
        onClose={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        personaType={userPersona?.id || 'promoter'}
      />
      
      {/* Scroll Indicator */}
      {showScrollIndicator && (
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
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 16,
  },
  homeLogo: {
    alignSelf: 'center',
  },
  menuButton: {
    padding: 4,
  },
  personaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  personaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleContainer: {
    flex: 1,
  },
  valueProposition: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  searchResultsContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    maxHeight: 300,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  searchResultDescription: {
    fontSize: 14,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  adminSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  adminSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  adminSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  adminButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  adminQuickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  adminQuickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  servicesSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  servicesContainer: {
    gap: 12,
  },
  serviceCardWrapper: {
    flex: 1,
    minHeight: 80,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  colorAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.3,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceContent: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
  },
  quickStatsSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 100,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  searchSuggestionsContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  menuContent: {
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
});