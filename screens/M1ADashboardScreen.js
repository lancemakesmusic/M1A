import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatureRecommendations from '../components/FeatureRecommendations';
import ScrollIndicator from '../components/ScrollIndicator';
import TutorialOverlay from '../components/TutorialOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';
import GoogleCalendarService from '../services/GoogleCalendarService';

const { width } = Dimensions.get('window');

export default function M1ADashboardScreen({ navigation: navProp }) {
  const navHook = useNavigation();
  const navigation = navProp || navHook;
  const { theme } = useTheme();
  const { user } = useAuth();
  const { 
    userPersona, 
    getPersonalizedFeatures, 
    getPrimaryActions, 
    getPersonaColor,
    shouldShowTutorial,
    markTutorialComplete,
    getTutorialSteps
  } = useM1APersonalization();
  
  // Check if we can go back (i.e., not the first screen in stack - accessed from drawer)
  const canGoBack = navigation.canGoBack();
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    completedTasks: 0,
    revenue: 0,
  });
  const [guestData, setGuestData] = useState({
    featuredDrinks: [],
    todaysSpecials: [],
    deals: [],
    recommendations: [],
  });
  const [showItemModal, setShowItemModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [modalTitle, setModalTitle] = useState('');

  useEffect(() => {
    if (userPersona?.id === 'guest') {
      loadGuestDashboardData();
    } else {
      loadDashboardData();
    }
    
    // Show tutorial if needed
    if (shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, [userPersona]);

  useEffect(() => {
    // Show tutorial when component mounts if needed
    if (shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, []);

  const loadGuestDashboardData = async () => {
    try {
      // Load guest-specific data: specials, deals, recommendations
      const featuredDrinks = [
        { id: '1', name: 'Merkaba Mule', price: 14, description: 'Premium vodka, ginger beer, lime', popular: true },
        { id: '2', name: 'Cosmic Old Fashioned', price: 16, description: 'Bourbon, bitters, orange', popular: true },
        { id: '3', name: 'Stellar Mojito', price: 13, description: 'White rum, mint, lime, soda', popular: false },
      ];

      const todaysSpecials = [
        { 
          id: '1', 
          title: 'Happy Hour', 
          description: '20% off all cocktails', 
          time: '5PM - 7PM', 
          icon: 'time',
          items: [
            { id: 'hh-1', name: 'Happy Hour Margarita', price: 9.60, originalPrice: 12, description: 'Classic margarita with 20% off', category: 'Mixed Drinks', available: true, isSpecial: true },
            { id: 'hh-2', name: 'Happy Hour Old Fashioned', price: 12.80, originalPrice: 16, description: 'Premium bourbon cocktail with 20% off', category: 'Mixed Drinks', available: true, isSpecial: true },
            { id: 'hh-3', name: 'Happy Hour Mojito', price: 10.40, originalPrice: 13, description: 'Refreshing mojito with 20% off', category: 'Mixed Drinks', available: true, isSpecial: true },
          ]
        },
        { 
          id: '2', 
          title: 'Wine Wednesday', 
          description: 'Half-price wine by the glass', 
          time: 'All Day', 
          icon: 'wine',
          items: [
            { id: 'ww-1', name: 'House Red Wine', price: 5, originalPrice: 10, description: 'Half-price house red wine', category: 'Wine', available: true, isSpecial: true },
            { id: 'ww-2', name: 'House White Wine', price: 5, originalPrice: 10, description: 'Half-price house white wine', category: 'Wine', available: true, isSpecial: true },
            { id: 'ww-3', name: 'Premium Wine Selection', price: 9, originalPrice: 18, description: 'Half-price premium wines', category: 'Wine', available: true, isSpecial: true },
          ]
        },
        { 
          id: '3', 
          title: 'Weekend Special', 
          description: 'Buy 2 get 1 free on select beers', 
          time: 'Fri-Sun', 
          icon: 'beer',
          items: [
            { id: 'ws-1', name: 'Beer Bucket', price: 24, description: '6-pack of your choice (Buy 2 get 1 free)', category: 'Beer', available: true, isSpecial: true, isPackage: true },
            { id: 'ws-2', name: 'Dos Equis (3-pack)', price: 12, description: 'Buy 2 get 1 free', category: 'Beer', available: true, isSpecial: true },
            { id: 'ws-3', name: 'Modelo (3-pack)', price: 14, description: 'Buy 2 get 1 free', category: 'Beer', available: true, isSpecial: true },
          ]
        },
      ];

      const deals = [
        { 
          id: '1', 
          title: 'Bar Package Deal', 
          description: '3 drinks + appetizer for $35', 
          discount: 'Save $10', 
          icon: 'gift',
          items: [
            { id: 'deal-1', name: 'Bar Package Deal', price: 35, description: '3 drinks + appetizer combo', category: 'Package', available: true, isPackage: true, includes: ['Any 3 drinks', 'Appetizer of choice'] },
          ]
        },
        { 
          id: '2', 
          title: 'Group Discount', 
          description: '10% off for parties of 6+', 
          discount: 'Valid Today', 
          icon: 'people',
          items: [
            { id: 'group-1', name: 'Group Package (6+)', price: 0, description: '10% off entire order for groups of 6 or more', category: 'Package', available: true, isPackage: true, discountPercent: 10 },
          ]
        },
        { 
          id: '3', 
          title: 'Loyalty Reward', 
          description: 'Earn points with every purchase', 
          discount: 'Join Now', 
          icon: 'star',
          items: []
        },
      ];

      const recommendations = [
        { id: '1', title: 'Upcoming Event', description: 'Live Music Night - This Friday', action: 'View Details', icon: 'musical-notes' },
        { id: '2', title: 'Try Our Signature', description: 'Merkaba Mule - Our most popular cocktail', action: 'Order Now', icon: 'wine' },
        { id: '3', title: 'New Arrival', description: 'Premium whiskey selection just added', action: 'Explore Menu', icon: 'flask' },
      ];

      setGuestData({
        featuredDrinks,
        todaysSpecials,
        deals,
        recommendations,
      });
    } catch (error) {
      console.error('Error loading guest dashboard data:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      if (!user?.uid) {
        setStats({ totalEvents: 0, upcomingEvents: 0, completedTasks: 0, revenue: 0 });
        return;
      }

      // Use network IP for physical devices, localhost for web/simulator
      const getApiBaseUrl = () => {
        if (process.env.EXPO_PUBLIC_API_BASE_URL) {
          return process.env.EXPO_PUBLIC_API_BASE_URL;
        }
        // Fallback for development (use environment variable in production)
        return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8001';
      };
      const API_BASE_URL = getApiBaseUrl();

      // Try to load from backend API first
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats?userId=${user.uid}&persona=${userPersona?.id || 'promoter'}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          // If backend explicitly marks response as placeholder, fall back to Firestore
          if (data.success && data.stats && !data.placeholder) {
            setStats(data.stats);
            return;
          } else {
            console.log('Backend dashboard stats placeholder or unavailable, falling back to Firestore', data.error || 'placeholder');
          }
        }
      } catch (apiError) {
        console.log('Backend API not available, using Firestore aggregations:', apiError.message);
      }

      // Fallback to Firestore aggregations
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const { collection, query, where, getDocs, getCountFromServer, Timestamp } = await import('firebase/firestore');
        const now = Timestamp.now();
        
        // Get total events
        const totalEventsQuery = query(collection(db, 'eventBookings'), where('userId', '==', user.uid));
        const totalEventsSnapshot = await getCountFromServer(totalEventsQuery);
        const totalEvents = totalEventsSnapshot.data().count;

        // Get upcoming events (eventDate >= today)
        const upcomingEventsQuery = query(
          collection(db, 'eventBookings'),
          where('userId', '==', user.uid),
          where('eventDate', '>=', now)
        );
        const upcomingEventsSnapshot = await getCountFromServer(upcomingEventsQuery);
        const upcomingEvents = upcomingEventsSnapshot.data().count;

        // Get completed tasks (from tasks collection if it exists)
        const completedTasks = 0; // TODO: Implement tasks collection

        // Calculate revenue from completed bookings
        const bookingsSnapshot = await getDocs(query(collection(db, 'eventBookings'), where('userId', '==', user.uid)));
        let revenue = 0;
        bookingsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'completed' && data.totalCost) {
            revenue += data.totalCost;
          }
        });

        setStats({
          totalEvents,
          upcomingEvents,
          completedTasks,
          revenue,
        });
      } else {
        // Fallback to zero stats if Firebase not ready
        setStats({ totalEvents: 0, upcomingEvents: 0, completedTasks: 0, revenue: 0 });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats({ totalEvents: 0, upcomingEvents: 0, completedTasks: 0, revenue: 0 });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userPersona?.id === 'guest') {
      await loadGuestDashboardData();
    } else {
      await loadDashboardData();
    }
    setRefreshing(false);
  };

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
    await markTutorialComplete();
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const getPersonaSpecificData = () => {
    if (!userPersona) return { title: 'M1A Dashboard', subtitle: 'Your personalized workspace' };

    const personaData = {
      promoter: {
        title: 'Event Promotion Hub',
        subtitle: 'Maximize your event reach and ticket sales',
        quickActions: [
          { title: 'Create Event', icon: 'add-circle', color: '#FF6B6B' },
          { title: 'Social Media', icon: 'share-social', color: '#4ECDC4' },
          { title: 'Analytics', icon: 'analytics', color: '#45B7D1' },
          { title: 'Tickets', icon: 'ticket', color: '#96CEB4' },
        ],
        recentActivity: [
          { title: 'Music Festival 2024', status: 'Live', time: '2 hours ago' },
          { title: 'Club Night Promotion', status: 'Scheduled', time: '1 day ago' },
          { title: 'Concert Analytics', status: 'Completed', time: '3 days ago' },
        ],
      },
      coordinator: {
        title: 'Event Coordination Center',
        subtitle: 'Plan and execute flawless events',
        quickActions: [
          { title: 'Plan Event', icon: 'calendar', color: '#4ECDC4' },
          { title: 'Manage Vendors', icon: 'business', color: '#FFB6C1' },
          { title: 'Timeline', icon: 'time', color: '#9B59B6' },
          { title: 'Budget', icon: 'card', color: '#F39C12' },
        ],
        recentActivity: [
          { title: 'Corporate Gala Setup', status: 'In Progress', time: '1 hour ago' },
          { title: 'Vendor Coordination', status: 'Pending', time: '4 hours ago' },
          { title: 'Event Timeline', status: 'Updated', time: '1 day ago' },
        ],
      },
      wedding_planner: {
        title: 'Wedding Planning Studio',
        subtitle: 'Create magical moments for couples',
        quickActions: [
          { title: 'Plan Wedding', icon: 'heart', color: '#FFB6C1' },
          { title: 'Vendor Portfolio', icon: 'images', color: '#E8B4B8' },
          { title: 'Timeline Builder', icon: 'list', color: '#D4A5A5' },
          { title: 'Design Board', icon: 'color-palette', color: '#C9ADA7' },
        ],
        recentActivity: [
          { title: 'Sarah & John Wedding', status: 'Planning', time: '30 min ago' },
          { title: 'Vendor Selection', status: 'In Progress', time: '2 hours ago' },
          { title: 'Design Consultation', status: 'Completed', time: '1 day ago' },
        ],
      },
      venue_owner: {
        title: 'Venue Management Hub',
        subtitle: 'Maximize your space potential',
        quickActions: [
          { title: 'Manage Bookings', icon: 'calendar', color: '#9B59B6' },
          { title: 'View Calendar', icon: 'grid', color: '#8E44AD', action: 'open-google-calendar' },
          { title: 'Track Revenue', icon: 'trending-up', color: '#27AE60' },
          { title: 'Client Portal', icon: 'people', color: '#3498DB' },
        ],
        recentActivity: [
          { title: 'New Booking Request', status: 'Pending', time: '15 min ago' },
          { title: 'Venue Setup Complete', status: 'Done', time: '2 hours ago' },
          { title: 'Revenue Report', status: 'Generated', time: '1 day ago' },
        ],
      },
      performer: {
        title: 'Performance Dashboard',
        subtitle: 'Manage your entertainment business',
        quickActions: [
          { title: 'Manage Bookings', icon: 'calendar', color: '#F39C12' },
          { title: 'Update Portfolio', icon: 'camera', color: '#E67E22' },
          { title: 'Track Earnings', icon: 'cash', color: '#D35400' },
          { title: 'Marketing', icon: 'megaphone', color: '#E74C3C' },
        ],
        recentActivity: [
          { title: 'Club Performance', status: 'Confirmed', time: '1 hour ago' },
          { title: 'Portfolio Updated', status: 'Live', time: '3 hours ago' },
          { title: 'Payment Received', status: 'Completed', time: '2 days ago' },
        ],
      },
      vendor: {
        title: 'Service Management',
        subtitle: 'Connect with clients and grow your business',
        quickActions: [
          { title: 'Manage Services', icon: 'construct', color: '#2ECC71' },
          { title: 'View Bookings', icon: 'list', color: '#27AE60' },
          { title: 'Generate Quotes', icon: 'document-text', color: '#16A085' },
          { title: 'Client Portal', icon: 'people', color: '#1ABC9C' },
        ],
        recentActivity: [
          { title: 'New Quote Request', status: 'Pending', time: '20 min ago' },
          { title: 'Catering Setup', status: 'In Progress', time: '1 hour ago' },
          { title: 'Client Review', status: '5 Stars', time: '1 day ago' },
        ],
      },
      guest: {
        title: 'Merkaba Experience',
        subtitle: 'Discover drinks, specials, and events',
        quickActions: [
          { title: 'View Menu', icon: 'wine', color: '#FF9500', screen: 'BarMenu' },
          { title: 'Today\'s Specials', icon: 'gift', color: '#FF6B6B', screen: 'BarMenu' },
          { title: 'Upcoming Events', icon: 'calendar', color: '#4ECDC4', screen: 'Explore' },
          { title: 'Request Service', icon: 'help-circle', color: '#3498DB', action: 'service-request' },
        ],
        recentActivity: [
          { title: 'Happy Hour Active', status: 'Now', time: 'Until 7PM' },
          { title: 'New Drink Added', status: 'Available', time: '2 hours ago' },
          { title: 'Weekend Special', status: 'Active', time: 'All Weekend' },
        ],
      },
    };

    return personaData[userPersona.id] || personaData.promoter;
  };

  const personaData = getPersonaSpecificData();

  const handleStatCardPress = (title, type) => {
    let items = [];
    let modalTitle = title;
    
    switch (type) {
      case 'featured':
        items = guestData.featuredDrinks.map(drink => ({
          id: drink.id,
          name: drink.name,
          price: drink.price,
          description: drink.description,
          category: 'Mixed Drinks',
          available: true,
        }));
        break;
      case 'specials':
        // Flatten all special items
        items = guestData.todaysSpecials.flatMap(special => special.items || []);
        break;
      case 'deals':
        // Flatten all deal items
        items = guestData.deals.flatMap(deal => deal.items || []);
        break;
      case 'recommendations':
        // Convert recommendations to actionable items
        items = guestData.recommendations.map(rec => ({
          id: rec.id,
          name: rec.title,
          description: rec.description,
          action: rec.action,
          category: 'Recommendation',
          available: true,
        }));
        break;
    }
    
    if (items.length > 0) {
      setModalItems(items);
      setModalTitle(modalTitle);
      setShowItemModal(true);
    }
  };

  const handleAddToCart = (item) => {
    // Navigate to BarMenu with the item to add
    setShowItemModal(false);
    navigation.navigate('BarMenu', { 
      addItemToCart: {
        id: item.id,
        name: item.name,
        price: item.price,
        description: item.description,
        category: item.category || 'Mixed Drinks',
        available: item.available !== false,
        quantity: 1,
      }
    });
  };

  const renderStatCard = (title, value, icon, color, type) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => handleStatCardPress(title, type)}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.subtext }]}>{title}</Text>
      <View style={styles.tapIndicator}>
        <Ionicons name="chevron-forward" size={16} color={theme.subtext} style={{ opacity: 0.5 }} />
      </View>
    </TouchableOpacity>
  );

  const handleOpenGoogleCalendar = async () => {
    try {
      // Get calendar ID from environment or default
      const calendarId = process.env.EXPO_PUBLIC_GOOGLE_BUSINESS_CALENDAR_ID || 
                        'merkaba.venue.calendar@gmail.com';
      
      // Check if Google Calendar is connected
      const isConnected = await GoogleCalendarService.isConnected();
      
      if (!isConnected) {
        // If not connected, try to connect first
        Alert.alert(
          'Connect Google Calendar',
          'You need to connect your Google Calendar to view and edit events. Would you like to connect now?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Connect',
              onPress: async () => {
                try {
                  const oauthUrl = GoogleCalendarService.getOAuthUrl();
                  await Linking.openURL(oauthUrl);
                } catch (error) {
                  Alert.alert('Error', 'Failed to open Google Calendar connection. Please check your configuration.');
                }
              },
            },
          ]
        );
        return;
      }
      
      // Encode calendar ID for URL (handle email format)
      const encodedCalendarId = encodeURIComponent(calendarId);
      
      // Open Google Calendar in browser/app
      // Format: https://calendar.google.com/calendar/u/0/r?cid={calendarId}
      const calendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodedCalendarId}`;
      
      const canOpen = await Linking.canOpenURL(calendarUrl);
      if (canOpen) {
        await Linking.openURL(calendarUrl);
      } else {
        // Fallback: try opening general Google Calendar
        const generalCalendarUrl = 'https://calendar.google.com/calendar/u/0/r';
        await Linking.openURL(generalCalendarUrl);
      }
    } catch (error) {
      console.error('Error opening Google Calendar:', error);
      Alert.alert(
        'Error',
        'Failed to open Google Calendar. Please make sure Google Calendar is installed or try opening it manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        if (item.screen) {
          navigation.navigate(item.screen);
        } else if (item.action === 'service-request') {
          // Open service request in chat
          navigation.navigate('Home');
        } else if (item.action === 'open-google-calendar') {
          handleOpenGoogleCalendar();
        } else {
          console.log('Quick action:', item.title);
        }
      }}
    >
      <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={[styles.actionTitle, { color: theme.text }]}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = ({ item }) => (
    <View style={[styles.activityItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.activityTime, { color: theme.subtext }]}>{item.time}</Text>
      </View>
      <View style={[styles.activityStatus, { backgroundColor: getPersonaColor() + '20' }]}>
        <Text style={[styles.statusText, { color: getPersonaColor() }]}>{item.status}</Text>
      </View>
    </View>
  );

  if (!userPersona) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="rocket" size={64} color={theme.subtext} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Welcome to M1A</Text>
          <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
            Complete your personalization setup to access your customized dashboard
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('M1APersonalization')}
          >
            <Text style={styles.setupButtonText}>Get Started</Text>
          </TouchableOpacity>
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
          <Text style={[styles.topHeaderTitle, { color: theme.text }]}>M1A Dashboard</Text>
          <View style={styles.headerRight} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => {
          setShowScrollIndicator(false);
        }}
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        collapsable={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{personaData.title}</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>{personaData.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: theme.cardBackground }]}
            onPress={() => navigation.navigate('M1ASettings')}
          >
            <Ionicons name="settings" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Stats Cards - Different for guests */}
        {userPersona?.id === 'guest' ? (
          <View style={styles.statsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Today at Merkaba</Text>
            <View style={styles.statsGrid}>
              {renderStatCard('Featured Drinks', guestData.featuredDrinks.length, 'wine', getPersonaColor(), 'featured')}
              {renderStatCard('Active Specials', guestData.todaysSpecials.length, 'gift', '#FF6B6B', 'specials')}
              {renderStatCard('Available Deals', guestData.deals.length, 'pricetag', '#4ECDC4', 'deals')}
              {renderStatCard('Recommendations', guestData.recommendations.length, 'star', '#F39C12', 'recommendations')}
            </View>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
            <View style={styles.statsGrid}>
              {renderStatCard('Total Events', stats.totalEvents, 'calendar', getPersonaColor())}
              {renderStatCard('Upcoming', stats.upcomingEvents, 'time', '#4ECDC4')}
              {renderStatCard('Completed', stats.completedTasks, 'checkmark-circle', '#2ECC71')}
              {renderStatCard('Revenue', `$${stats.revenue.toLocaleString()}`, 'cash', '#F39C12')}
            </View>
          </View>
        )}

        {/* Guest-Specific Content */}
        {userPersona?.id === 'guest' && (
          <>
            {/* Featured Drinks */}
            {guestData.featuredDrinks.length > 0 && (
              <View style={styles.guestSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured Drinks</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {guestData.featuredDrinks.map((drink) => (
                    <TouchableOpacity
                      key={drink.id}
                      style={[styles.drinkCard, { backgroundColor: theme.cardBackground }]}
                      onPress={() => navigation.navigate('BarMenu')}
                    >
                      <View style={[styles.drinkIcon, { backgroundColor: getPersonaColor() + '20' }]}>
                        <Ionicons name="wine" size={32} color={getPersonaColor()} />
                      </View>
                      <Text style={[styles.drinkName, { color: theme.text }]}>{drink.name}</Text>
                      <Text style={[styles.drinkDescription, { color: theme.subtext }]}>{drink.description}</Text>
                      <Text style={[styles.drinkPrice, { color: getPersonaColor() }]}>${drink.price}</Text>
                      {drink.popular && (
                        <View style={[styles.popularBadge, { backgroundColor: '#FF6B6B' }]}>
                          <Text style={styles.popularText}>Popular</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Today's Specials */}
            {guestData.todaysSpecials.length > 0 && (
              <View style={styles.guestSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Specials</Text>
                {guestData.todaysSpecials.map((special) => (
                  <TouchableOpacity
                    key={special.id}
                    style={[styles.specialCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => navigation.navigate('BarMenu')}
                  >
                    <View style={[styles.specialIcon, { backgroundColor: '#FF6B6B' + '20' }]}>
                      <Ionicons name={special.icon} size={24} color="#FF6B6B" />
                    </View>
                    <View style={styles.specialContent}>
                      <Text style={[styles.specialTitle, { color: theme.text }]}>{special.title}</Text>
                      <Text style={[styles.specialDescription, { color: theme.subtext }]}>{special.description}</Text>
                      <Text style={[styles.specialTime, { color: '#FF6B6B' }]}>{special.time}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Deals */}
            {guestData.deals.length > 0 && (
              <View style={styles.guestSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Exclusive Deals</Text>
                {guestData.deals.map((deal) => (
                  <TouchableOpacity
                    key={deal.id}
                    style={[styles.dealCard, { backgroundColor: theme.cardBackground, borderColor: '#4ECDC4' }]}
                    onPress={() => navigation.navigate('BarMenu')}
                  >
                    <View style={[styles.dealIcon, { backgroundColor: '#4ECDC4' + '20' }]}>
                      <Ionicons name={deal.icon} size={24} color="#4ECDC4" />
                    </View>
                    <View style={styles.dealContent}>
                      <Text style={[styles.dealTitle, { color: theme.text }]}>{deal.title}</Text>
                      <Text style={[styles.dealDescription, { color: theme.subtext }]}>{deal.description}</Text>
                    </View>
                    <View style={[styles.dealDiscount, { backgroundColor: '#4ECDC4' }]}>
                      <Text style={styles.dealDiscountText}>{deal.discount}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {guestData.recommendations.length > 0 && (
              <View style={styles.guestSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>For You</Text>
                {guestData.recommendations.map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    style={[styles.recommendationCard, { backgroundColor: theme.cardBackground }]}
                    onPress={() => {
                      if (rec.action === 'View Details') {
                        navigation.navigate('Explore');
                      } else if (rec.action === 'Order Now' || rec.action === 'Explore Menu') {
                        navigation.navigate('BarMenu');
                      }
                    }}
                  >
                    <View style={[styles.recIcon, { backgroundColor: '#F39C12' + '20' }]}>
                      <Ionicons name={rec.icon} size={24} color="#F39C12" />
                    </View>
                    <View style={styles.recContent}>
                      <Text style={[styles.recTitle, { color: theme.text }]}>{rec.title}</Text>
                      <Text style={[styles.recDescription, { color: theme.subtext }]}>{rec.description}</Text>
                    </View>
                    <Text style={[styles.recAction, { color: '#F39C12' }]}>{rec.action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <FlatList
            data={personaData.quickActions}
            renderItem={renderQuickAction}
            keyExtractor={(item) => item.title}
            numColumns={2}
            columnWrapperStyle={styles.quickActionsRow}
            scrollEnabled={false}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <View style={styles.activityHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={personaData.recentActivity}
            renderItem={renderActivityItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* AI Feature Recommendations */}
        <FeatureRecommendations
          userPersona={userPersona}
          userBehavior={{
            frequentFeatures: ['analytics', 'automation'],
            underutilizedFeatures: ['insights', 'templates']
          }}
          onFeaturePress={(feature) => {
            console.log('Feature pressed:', feature.title);
            // Navigate to feature or show more details
          }}
        />

        {/* Personalized Features */}
        <View style={styles.featuresContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Features</Text>
          <View style={styles.featuresGrid}>
            {getPersonalizedFeatures().slice(0, 4).map((feature, index) => (
              <View key={index} style={[styles.featureChip, { backgroundColor: getPersonaColor() + '20' }]}>
                <Text style={[styles.featureText, { color: getPersonaColor() }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
        </ScrollView>
      </View>

      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onClose={handleTutorialComplete}
        steps={getTutorialSteps()}
        currentStep={tutorialStep}
        onNext={handleTutorialNext}
        onPrevious={handleTutorialPrevious}
        onSkip={handleTutorialSkip}
        personaType={userPersona?.id}
      />
      
      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <ScrollIndicator
          visible={showScrollIndicator}
          onScrollStart={() => setShowScrollIndicator(false)}
        />
      )}

      {/* Items Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{modalTitle}</Text>
              <TouchableOpacity
                onPress={() => setShowItemModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <FlatList
              data={modalItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => {
                    if (item.action) {
                      // Handle recommendation actions
                      if (item.action === 'View Details') {
                        navigation.navigate('Explore');
                      } else if (item.action === 'Order Now' || item.action === 'Explore Menu') {
                        navigation.navigate('BarMenu');
                      }
                      setShowItemModal(false);
                    } else if (item.price !== undefined) {
                      // Add to cart
                      handleAddToCart(item);
                    }
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <View style={styles.modalItemHeader}>
                      <Text style={[styles.modalItemName, { color: theme.text }]}>{item.name}</Text>
                      {item.price !== undefined && item.price > 0 && (
                        <Text style={[styles.modalItemPrice, { color: theme.primary }]}>
                          ${item.price.toFixed(2)}
                          {item.originalPrice && item.originalPrice > item.price && (
                            <Text style={[styles.originalPrice, { color: theme.subtext }]}>
                              {' '}${item.originalPrice.toFixed(2)}
                            </Text>
                          )}
                        </Text>
                      )}
                    </View>
                    {item.description && (
                      <Text style={[styles.modalItemDescription, { color: theme.subtext }]}>
                        {item.description}
                      </Text>
                    )}
                    {item.includes && (
                      <View style={styles.includesContainer}>
                        <Text style={[styles.includesLabel, { color: theme.subtext }]}>Includes:</Text>
                        {item.includes.map((include, idx) => (
                          <Text key={idx} style={[styles.includesItem, { color: theme.text }]}>
                            • {include}
                          </Text>
                        ))}
                      </View>
                    )}
                    {item.isPackage && (
                      <View style={[styles.packageBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Text style={[styles.packageBadgeText, { color: theme.primary }]}>Package Deal</Text>
                      </View>
                    )}
                    {item.isSpecial && (
                      <View style={[styles.specialBadge, { backgroundColor: '#FF6B6B' + '20' }]}>
                        <Text style={[styles.specialBadgeText, { color: '#FF6B6B' }]}>Special</Text>
                      </View>
                    )}
                  </View>
                  {item.price !== undefined && item.price > 0 && (
                    <TouchableOpacity
                      style={[styles.addToCartButton, { backgroundColor: theme.primary }]}
                      onPress={() => handleAddToCart(item)}
                    >
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.addToCartText}>Add to Cart</Text>
                    </TouchableOpacity>
                  )}
                  {item.action && (
                    <View style={[styles.actionButton, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.actionButtonText, { color: theme.primary }]}>{item.action}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalContent}
              ListEmptyComponent={
                <View style={styles.emptyModalState}>
                  <Ionicons name="information-circle-outline" size={48} color={theme.subtext} />
                  <Text style={[styles.emptyModalText, { color: theme.subtext }]}>
                    No items available at this time
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionsRow: {
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
  },
  activityStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  guestSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  drinkCard: {
    width: 160,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    position: 'relative',
  },
  drinkIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  drinkName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  drinkDescription: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  drinkPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  specialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  specialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  specialContent: {
    flex: 1,
  },
  specialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  specialDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  specialTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  dealIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dealContent: {
    flex: 1,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dealDescription: {
    fontSize: 14,
  },
  dealDiscount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  dealDiscountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  recIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recContent: {
    flex: 1,
  },
  recTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recDescription: {
    fontSize: 14,
  },
  recAction: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  tapIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalItemCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  modalItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  modalItemDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  includesContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  includesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  includesItem: {
    fontSize: 12,
    marginLeft: 8,
  },
  packageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  packageBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  specialBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyModalState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});
