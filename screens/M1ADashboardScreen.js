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
import { dataCache } from '../utils/dataCache';
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
  const [detailedInsights, setDetailedInsights] = useState({
    revenueTrend: [],
    eventTrend: [],
    activityBreakdown: {},
    monthlyComparison: {},
    recommendations: [],
    performanceMetrics: {},
  });
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d'); // '7d', '30d', '90d', 'all'
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
      loadDetailedInsights();
    }
    
    // Show tutorial if needed
    if (shouldShowTutorial()) {
      setShowTutorial(true);
    }
  }, [userPersona, selectedTimeRange]);

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

      // Check cache first
      const cacheKey = dataCache.generateKey('dashboard', { userId: user.uid, persona: userPersona?.id });
      const cachedStats = dataCache.get(cacheKey);
      if (cachedStats) {
        console.log('📦 Using cached dashboard stats');
        setStats(cachedStats);
        // Still refresh in background
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
        // Load completed tasks from user's task history
        let completedTasks = 0;
        try {
          const tasksQuery = query(
            collection(db, 'userTasks'),
            where('userId', '==', user?.uid),
            where('completed', '==', true)
          );
          const tasksSnapshot = await getDocs(tasksQuery);
          completedTasks = tasksSnapshot.size;
        } catch (taskError) {
          console.warn('Could not load tasks:', taskError);
          // Default to 0 if tasks collection doesn't exist yet
          completedTasks = 0;
        }

        // Calculate revenue from completed bookings
        const bookingsSnapshot = await getDocs(query(collection(db, 'eventBookings'), where('userId', '==', user.uid)));
        let revenue = 0;
        bookingsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'completed' && data.totalCost) {
            revenue += data.totalCost;
          }
        });

        const newStats = {
          totalEvents,
          upcomingEvents,
          completedTasks,
          revenue,
        };
        setStats(newStats);
        
        // Cache the results
        const cacheKey = dataCache.generateKey('dashboard', { userId: user.uid, persona: userPersona?.id });
        dataCache.set(cacheKey, newStats, 3 * 60 * 1000); // 3 minutes TTL
      } else {
        // Fallback to zero stats if Firebase not ready
        setStats({ totalEvents: 0, upcomingEvents: 0, completedTasks: 0, revenue: 0 });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats({ totalEvents: 0, upcomingEvents: 0, completedTasks: 0, revenue: 0 });
    }
  };

  const loadDetailedInsights = async () => {
    if (userPersona?.id === 'guest' || !user?.uid) {
      return;
    }

    // Check cache first
    const cacheKey = dataCache.generateKey('dashboardInsights', { 
      userId: user.uid, 
      timeRange: selectedTimeRange 
    });
    const cachedInsights = dataCache.get(cacheKey);
    if (cachedInsights) {
      console.log('📦 Using cached dashboard insights');
      setDetailedInsights(cachedInsights);
      setLoadingInsights(false);
      // Still refresh in background
    }

    setLoadingInsights(true);
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const { collection, query, where, getDocs, Timestamp, orderBy, limit } = await import('firebase/firestore');
        const now = Timestamp.now();
        
        // Calculate time range
        const daysAgo = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : selectedTimeRange === '90d' ? 90 : 365;
        const startDate = Timestamp.fromDate(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000));
        
        // Revenue trend (last 30 days)
        const revenueTrend = [];
        const eventTrend = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const dayStart = Timestamp.fromDate(new Date(date.setHours(0, 0, 0, 0)));
          const dayEnd = Timestamp.fromDate(new Date(date.setHours(23, 59, 59, 999)));
          
          // Get revenue for this day
          const dayBookings = await getDocs(
            query(
              collection(db, 'eventBookings'),
              where('userId', '==', user.uid),
              where('createdAt', '>=', dayStart),
              where('createdAt', '<=', dayEnd)
            )
          );
          let dayRevenue = 0;
          dayBookings.docs.forEach(doc => {
            const data = doc.data();
            if (data.totalCost) dayRevenue += data.totalCost;
          });
          
          revenueTrend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: dayRevenue,
          });
          
          // Get events for this day
          const dayEvents = await getDocs(
            query(
              collection(db, 'eventBookings'),
              where('userId', '==', user.uid),
              where('eventDate', '>=', dayStart),
              where('eventDate', '<=', dayEnd)
            )
          );
          eventTrend.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: dayEvents.size,
          });
        }
        
        // Activity breakdown
        const allBookings = await getDocs(
          query(
            collection(db, 'eventBookings'),
            where('userId', '==', user.uid),
            where('createdAt', '>=', startDate)
          )
        );
        
        const activityBreakdown = {
          completed: 0,
          pending: 0,
          cancelled: 0,
        };
        
        allBookings.docs.forEach(doc => {
          const status = doc.data().status || 'pending';
          if (status === 'completed') activityBreakdown.completed++;
          else if (status === 'cancelled') activityBreakdown.cancelled++;
          else activityBreakdown.pending++;
        });
        
        // Monthly comparison
        const currentMonth = new Date();
        const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
        const currentMonthStart = Timestamp.fromDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
        const lastMonthStart = Timestamp.fromDate(lastMonth);
        const lastMonthEnd = Timestamp.fromDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0));
        
        const currentMonthBookings = await getDocs(
          query(
            collection(db, 'eventBookings'),
            where('userId', '==', user.uid),
            where('createdAt', '>=', currentMonthStart)
          )
        );
        
        const lastMonthBookings = await getDocs(
          query(
            collection(db, 'eventBookings'),
            where('userId', '==', user.uid),
            where('createdAt', '>=', lastMonthStart),
            where('createdAt', '<=', lastMonthEnd)
          )
        );
        
        let currentMonthRevenue = 0;
        currentMonthBookings.docs.forEach(doc => {
          const data = doc.data();
          if (data.totalCost) currentMonthRevenue += data.totalCost;
        });
        
        let lastMonthRevenue = 0;
        lastMonthBookings.docs.forEach(doc => {
          const data = doc.data();
          if (data.totalCost) lastMonthRevenue += data.totalCost;
        });
        
        const revenueChange = lastMonthRevenue > 0 
          ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
          : currentMonthRevenue > 0 ? 100 : 0;
        
        const eventChange = lastMonthBookings.size > 0
          ? ((currentMonthBookings.size - lastMonthBookings.size) / lastMonthBookings.size * 100).toFixed(1)
          : currentMonthBookings.size > 0 ? 100 : 0;
        
        // Performance metrics
        const avgRevenuePerEvent = stats.totalEvents > 0 ? stats.revenue / stats.totalEvents : 0;
        const completionRate = stats.totalEvents > 0 
          ? (stats.completedTasks / stats.totalEvents * 100).toFixed(1)
          : 0;
        
        // Generate recommendations
        const recommendations = [];
        if (stats.upcomingEvents === 0) {
          recommendations.push({
            type: 'action',
            title: 'Create Your First Event',
            description: 'Start promoting your events to reach more people',
            icon: 'add-circle',
            color: '#4ECDC4',
          });
        }
        if (revenueChange < 0) {
          recommendations.push({
            type: 'insight',
            title: 'Revenue Down',
            description: `Revenue decreased ${Math.abs(revenueChange)}% compared to last month`,
            icon: 'trending-down',
            color: '#FF6B6B',
          });
        }
        if (completionRate < 50) {
          recommendations.push({
            type: 'insight',
            title: 'Low Completion Rate',
            description: `Only ${completionRate}% of events are completed. Focus on follow-through.`,
            icon: 'alert-circle',
            color: '#FF9500',
          });
        }
        if (stats.upcomingEvents > 5) {
          recommendations.push({
            type: 'success',
            title: 'Great Activity!',
            description: `You have ${stats.upcomingEvents} upcoming events. Keep up the momentum!`,
            icon: 'checkmark-circle',
            color: '#34C759',
          });
        }
        
        const newInsights = {
          revenueTrend,
          eventTrend,
          activityBreakdown,
          monthlyComparison: {
            revenue: { current: currentMonthRevenue, last: lastMonthRevenue, change: parseFloat(revenueChange) },
            events: { current: currentMonthBookings.size, last: lastMonthBookings.size, change: parseFloat(eventChange) },
          },
          recommendations,
          performanceMetrics: {
            avgRevenuePerEvent,
            completionRate: parseFloat(completionRate),
            totalRevenue: stats.revenue,
          },
        };
        setDetailedInsights(newInsights);
        
        // Cache the results
        const cacheKey = dataCache.generateKey('dashboardInsights', { 
          userId: user.uid, 
          timeRange: selectedTimeRange 
        });
        dataCache.set(cacheKey, newInsights, 5 * 60 * 1000); // 5 minutes TTL
      }
    } catch (error) {
      console.error('Error loading detailed insights:', error);
    } finally {
      setLoadingInsights(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userPersona?.id === 'guest') {
      await loadGuestDashboardData();
    } else {
      await loadDashboardData();
      await loadDetailedInsights();
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

  const renderTrendChart = (data, theme, color) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const chartHeight = 150;
    const barWidth = (width - 80) / data.length;
    
    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartBars}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
            return (
              <View key={index} style={styles.chartBarContainer}>
                <View style={styles.chartBarWrapper}>
                  <View 
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(barHeight, 2),
                        backgroundColor: color,
                        width: Math.max(barWidth - 2, 2),
                      }
                    ]}
                  />
                </View>
                {index % 5 === 0 && (
                  <Text style={[styles.chartLabel, { color: theme.subtext }]} numberOfLines={1}>
                    {item.date.split(' ')[0]}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.chartAxis}>
          <Text style={[styles.chartAxisLabel, { color: theme.subtext }]}>$0</Text>
          <Text style={[styles.chartAxisLabel, { color: theme.subtext }]}>${maxValue.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  const renderActivityBreakdown = (breakdown, theme) => {
    const total = breakdown.completed + breakdown.pending + breakdown.cancelled;
    if (total === 0) return null;
    
    const completedPercent = (breakdown.completed / total) * 100;
    const pendingPercent = (breakdown.pending / total) * 100;
    const cancelledPercent = (breakdown.cancelled / total) * 100;
    
    return (
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownBars}>
          <View style={styles.breakdownBarRow}>
            <View style={styles.breakdownBarLabel}>
              <View style={[styles.breakdownColorDot, { backgroundColor: '#2ECC71' }]} />
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Completed</Text>
            </View>
            <View style={styles.breakdownBarWrapper}>
              <View style={[styles.breakdownBar, { width: `${completedPercent}%`, backgroundColor: '#2ECC71' }]} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{breakdown.completed}</Text>
            </View>
          </View>
          <View style={styles.breakdownBarRow}>
            <View style={styles.breakdownBarLabel}>
              <View style={[styles.breakdownColorDot, { backgroundColor: '#FF9500' }]} />
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Pending</Text>
            </View>
            <View style={styles.breakdownBarWrapper}>
              <View style={[styles.breakdownBar, { width: `${pendingPercent}%`, backgroundColor: '#FF9500' }]} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{breakdown.pending}</Text>
            </View>
          </View>
          <View style={styles.breakdownBarRow}>
            <View style={styles.breakdownBarLabel}>
              <View style={[styles.breakdownColorDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.breakdownLabel, { color: theme.text }]}>Cancelled</Text>
            </View>
            <View style={styles.breakdownBarWrapper}>
              <View style={[styles.breakdownBar, { width: `${cancelledPercent}%`, backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.breakdownValue, { color: theme.text }]}>{breakdown.cancelled}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
          <>
            <View style={styles.statsContainer}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
                <View style={styles.timeRangeSelector}>
                  {['7d', '30d', '90d', 'all'].map((range) => (
                    <TouchableOpacity
                      key={range}
                      style={[
                        styles.timeRangeButton,
                        {
                          backgroundColor: selectedTimeRange === range ? theme.primary : theme.cardBackground,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setSelectedTimeRange(range)}
                    >
                      <Text style={[
                        styles.timeRangeText,
                        { color: selectedTimeRange === range ? '#fff' : theme.text }
                      ]}>
                        {range === '7d' ? '7D' : range === '30d' ? '30D' : range === '90d' ? '90D' : 'All'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.statsGrid}>
                {renderStatCard('Total Events', stats.totalEvents, 'calendar', getPersonaColor())}
                {renderStatCard('Upcoming', stats.upcomingEvents, 'time', '#4ECDC4')}
                {renderStatCard('Completed', stats.completedTasks, 'checkmark-circle', '#2ECC71')}
                {renderStatCard('Revenue', `$${stats.revenue.toLocaleString()}`, 'cash', '#F39C12')}
              </View>
            </View>

            {/* Detailed Insights Section */}
            {!loadingInsights && (
              <>
                {/* Monthly Comparison */}
                {detailedInsights.monthlyComparison?.revenue && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Comparison</Text>
                    <View style={[styles.comparisonCard, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.comparisonRow}>
                        <View style={styles.comparisonItem}>
                          <Text style={[styles.comparisonLabel, { color: theme.subtext }]}>Revenue</Text>
                          <Text style={[styles.comparisonValue, { color: theme.text }]}>
                            ${detailedInsights.monthlyComparison.revenue.current.toLocaleString()}
                          </Text>
                          <View style={[
                            styles.comparisonChange,
                            { backgroundColor: detailedInsights.monthlyComparison.revenue.change >= 0 ? '#34C75920' : '#FF3B3020' }
                          ]}>
                            <Ionicons 
                              name={detailedInsights.monthlyComparison.revenue.change >= 0 ? 'trending-up' : 'trending-down'} 
                              size={14} 
                              color={detailedInsights.monthlyComparison.revenue.change >= 0 ? '#34C759' : '#FF3B30'} 
                            />
                            <Text style={[
                              styles.comparisonChangeText,
                              { color: detailedInsights.monthlyComparison.revenue.change >= 0 ? '#34C759' : '#FF3B30' }
                            ]}>
                              {Math.abs(detailedInsights.monthlyComparison.revenue.change)}%
                            </Text>
                          </View>
                        </View>
                        <View style={styles.comparisonItem}>
                          <Text style={[styles.comparisonLabel, { color: theme.subtext }]}>Events</Text>
                          <Text style={[styles.comparisonValue, { color: theme.text }]}>
                            {detailedInsights.monthlyComparison.events.current}
                          </Text>
                          <View style={[
                            styles.comparisonChange,
                            { backgroundColor: detailedInsights.monthlyComparison.events.change >= 0 ? '#34C75920' : '#FF3B3020' }
                          ]}>
                            <Ionicons 
                              name={detailedInsights.monthlyComparison.events.change >= 0 ? 'trending-up' : 'trending-down'} 
                              size={14} 
                              color={detailedInsights.monthlyComparison.events.change >= 0 ? '#34C759' : '#FF3B30'} 
                            />
                            <Text style={[
                              styles.comparisonChangeText,
                              { color: detailedInsights.monthlyComparison.events.change >= 0 ? '#34C759' : '#FF3B30' }
                            ]}>
                              {Math.abs(detailedInsights.monthlyComparison.events.change)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Revenue Trend Chart */}
                {detailedInsights.revenueTrend && detailedInsights.revenueTrend.length > 0 && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Revenue Trend (Last 30 Days)</Text>
                    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.chartContainer}>
                        {renderTrendChart(detailedInsights.revenueTrend, theme, '#F39C12')}
                      </View>
                    </View>
                  </View>
                )}

                {/* Event Trend Chart */}
                {detailedInsights.eventTrend && detailedInsights.eventTrend.length > 0 && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Event Activity (Last 30 Days)</Text>
                    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                      <View style={styles.chartContainer}>
                        {renderTrendChart(detailedInsights.eventTrend, theme, '#4ECDC4')}
                      </View>
                    </View>
                  </View>
                )}

                {/* Activity Breakdown */}
                {detailedInsights.activityBreakdown && Object.keys(detailedInsights.activityBreakdown).length > 0 && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity Breakdown</Text>
                    <View style={[styles.chartCard, { backgroundColor: theme.cardBackground }]}>
                      {renderActivityBreakdown(detailedInsights.activityBreakdown, theme)}
                    </View>
                  </View>
                )}

                {/* Performance Metrics */}
                {detailedInsights.performanceMetrics && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance Metrics</Text>
                    <View style={styles.metricsGrid}>
                      <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                        <Ionicons name="cash-outline" size={24} color="#F39C12" />
                        <Text style={[styles.metricValue, { color: theme.text }]}>
                          ${detailedInsights.performanceMetrics.avgRevenuePerEvent?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={[styles.metricLabel, { color: theme.subtext }]}>Avg Revenue/Event</Text>
                      </View>
                      <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
                        <Ionicons name="checkmark-circle-outline" size={24} color="#2ECC71" />
                        <Text style={[styles.metricValue, { color: theme.text }]}>
                          {detailedInsights.performanceMetrics.completionRate || 0}%
                        </Text>
                        <Text style={[styles.metricLabel, { color: theme.subtext }]}>Completion Rate</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Recommendations */}
                {detailedInsights.recommendations && detailedInsights.recommendations.length > 0 && (
                  <View style={styles.insightsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Insights & Recommendations</Text>
                    {detailedInsights.recommendations.map((rec, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.recommendationCard, { backgroundColor: theme.cardBackground, borderLeftColor: rec.color }]}
                      >
                        <View style={[styles.recIconContainer, { backgroundColor: rec.color + '20' }]}>
                          <Ionicons name={rec.icon} size={20} color={rec.color} />
                        </View>
                        <View style={styles.recContent}>
                          <Text style={[styles.recTitle, { color: theme.text }]}>{rec.title}</Text>
                          <Text style={[styles.recDescription, { color: theme.subtext }]}>{rec.description}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
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
  // Insights Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeRangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  comparisonCard: {
    padding: 16,
    borderRadius: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  comparisonChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  comparisonChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    padding: 16,
    borderRadius: 12,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartWrapper: {
    height: 180,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    marginBottom: 8,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartBarWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 150,
  },
  chartBar: {
    borderRadius: 2,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 9,
    textAlign: 'center',
  },
  chartAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  chartAxisLabel: {
    fontSize: 10,
  },
  breakdownContainer: {
    paddingVertical: 8,
  },
  breakdownBars: {
    gap: 16,
  },
  breakdownBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
    gap: 8,
  },
  breakdownColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownBar: {
    height: 24,
    borderRadius: 12,
    minWidth: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  recIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    lineHeight: 20,
  },
});
