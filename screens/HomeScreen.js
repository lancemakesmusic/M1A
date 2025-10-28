import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedCard from '../components/AnimatedCard';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function HomeScreen({ navigation }) {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState(null);

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

  const primaryServices = useMemo(() => [
    {
      id: '1',
      title: 'Schedule an Event',
      description: 'Book your next performance or event',
      icon: 'calendar',
      color: '#007AFF',
      onPress: () => navigation.navigate('EventBooking'),
    },
    {
      id: '2',
      title: 'M1A',
      description: 'AI-powered booking agent that can help you with everything Merkaba',
      icon: 'rocket',
      color: '#9C27B0',
      onPress: () => navigation.navigate('M1ADashboard'),
    },
    {
      id: '3',
      title: 'Services',
      description: 'Browse available services and amenities',
      icon: 'musical-notes',
      color: '#34C759',
      onPress: () => navigation.navigate('Explore'),
    },
    {
      id: '4',
      title: 'Bar',
      description: 'Order drinks and food from the bar',
      icon: 'wine',
      color: '#FF9500',
      onPress: () => Alert.alert('Bar Menu', 'Bar services feature coming soon!'),
    },
  ], [navigation]);

  const menuItems = [
    { title: 'Profile', icon: 'person', onPress: () => navigation.navigate('ProfileTab') },
    { title: 'Messages', icon: 'chatbubbles', onPress: () => navigation.navigate('Messages') },
    { title: 'Wallet', icon: 'wallet', onPress: () => navigation.navigate('Wallet') },
    { title: 'Settings', icon: 'settings', onPress: () => Alert.alert('Settings', 'Settings coming soon!') },
    { title: 'Help', icon: 'help-circle', onPress: () => Alert.alert('Help', 'Help center coming soon!') },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Home</Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
            <Ionicons name="alert-circle" size={20} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: theme.subtext }]}>Welcome back,</Text>
          <Text style={[styles.userName, { color: theme.text }]}>
            {user?.email?.split('@')[0] || 'Lance'}
          </Text>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Services</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>Choose what you'd like to do</Text>
          
          <View style={styles.servicesContainer}>
            {primaryServices.map((service) => (
              <AnimatedCard
                key={service.id}
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
              </AnimatedCard>
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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
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
    paddingBottom: 30,
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
    paddingBottom: 30,
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