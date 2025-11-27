import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
    Alert,
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
import ScrollIndicator from '../components/ScrollIndicator';
import ServiceCardWithAnimation from '../components/ServiceCardWithAnimation';
import TutorialOverlay from '../components/TutorialOverlay';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';

export default function HomeScreen({ navigation }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user: userProfile } = useContext(UserContext);
  const { theme } = useTheme();
  const { 
    userPersona, 
    getPersonaColor, 
    getPersonaIcon,
    shouldShowTutorial,
    markTutorialComplete,
    getTutorialSteps
  } = useM1APersonalization();
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

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

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const results = allFeatures.filter(feature => 
        feature.title.toLowerCase().includes(query) ||
        feature.description.toLowerCase().includes(query)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, allFeatures]);

  const handleSearchSelect = (feature) => {
    setSearchQuery('');
    setShowSearch(false);
    navigation.navigate(feature.screen);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Simulate refresh with potential error
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulate occasional error for testing
      if (Math.random() < 0.1) {
        throw new Error('Failed to refresh data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

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

  // Get persona-specific services based on user's persona
  const primaryServices = useMemo(() => {
    const personaId = userPersona?.id || 'guest';
    
    // Define services for each persona
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
            <View style={styles.headerTitleRow}>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  {userPersona ? `Welcome, ${userPersona.title}` : 'Welcome'}
                </Text>
                <Text style={[styles.valueProposition, { color: theme.subtext }]}>
                  {userPersona 
                    ? `Your AI-powered assistant for ${userPersona.subtitle || 'entertainment professionals'}`
                    : 'Your AI-powered assistant for everything Merkaba'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: theme.cardBackground }]}
                onPress={() => setShowSearch(!showSearch)}
              >
                <Ionicons name="search" size={20} color={theme.text} />
              </TouchableOpacity>
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
            {userProfile?.displayName ? userProfile.displayName.split(' ')[0] : (authUser?.email?.split('@')[0] || 'Guest')}
          </Text>
        </View>

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
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.cardBackground,
                shadowColor: theme.shadow,
              }
            ]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>$0</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Wallet Balance</Text>
            </View>
            <View style={[
              styles.statCard, 
              { 
                backgroundColor: theme.cardBackground,
                shadowColor: theme.shadow,
              }
            ]}>
              <Text style={[styles.statValue, { color: theme.primary }]}>0</Text>
              <Text style={[styles.statLabel, { color: theme.subtext }]}>Active Events</Text>
            </View>
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