import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeatureRecommendations from '../components/FeatureRecommendations';
import TutorialOverlay from '../components/TutorialOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, isFirebaseReady } from '../firebase';

const { width } = Dimensions.get('window');

export default function M1ADashboardScreen({ navigation }) {
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
  const [refreshing, setRefreshing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    completedTasks: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadDashboardData();
    
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
        if (Platform.OS === 'web') {
          return 'http://localhost:8001';
        }
        return 'http://172.20.10.3:8001';
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
          if (data.success && data.stats) {
            setStats(data.stats);
            return;
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
    await loadDashboardData();
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
          { title: 'View Calendar', icon: 'grid', color: '#8E44AD' },
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
    };

    return personaData[userPersona.id] || personaData.promoter;
  };

  const personaData = getPersonaSpecificData();

  const renderStatCard = (title, value, icon, color) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.subtext }]}>{title}</Text>
    </View>
  );

  const renderQuickAction = ({ item }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: theme.cardBackground }]}
      onPress={() => {
        // Navigate to appropriate screen based on action
        console.log('Quick action:', item.title);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
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

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Total Events', stats.totalEvents, 'calendar', getPersonaColor())}
            {renderStatCard('Upcoming', stats.upcomingEvents, 'time', '#4ECDC4')}
            {renderStatCard('Completed', stats.completedTasks, 'checkmark-circle', '#2ECC71')}
            {renderStatCard('Revenue', `$${stats.revenue.toLocaleString()}`, 'cash', '#F39C12')}
          </View>
        </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
