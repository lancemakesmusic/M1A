/**
 * Admin Control Center
 * Full-featured control center for admin@merkabaent.com
 * Complete control over all app functions
 */

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import M1ALogo from '../components/M1ALogo';

export default function AdminControlCenterScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    employees: 0,
    totalServices: 0,
    activeEvents: 0,
    pendingOrders: 0,
  });

  // SECURITY: Only admin@merkabaent.com can access
  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert(
        'Access Denied',
        'Only admin@merkabaent.com can access the Admin Control Center.'
      );
      navigation.goBack();
      return;
    }
    loadStats();
  }, [user, canAccess]);

  const loadStats = useCallback(async () => {
    // TODO: Load actual stats from Firestore
    setStats({
      totalUsers: 0,
      activeUsers: 0,
      employees: 0,
      totalServices: 0,
      activeEvents: 0,
      pendingOrders: 0,
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats().finally(() => setRefreshing(false));
  }, [loadStats]);

  const adminSections = [
    {
      id: 'users',
      title: 'User Management',
      icon: 'people',
      color: '#007AFF',
      description: 'Manage all users, deactivate accounts, view activity',
      onPress: () => navigation.navigate('AdminUserManagement'),
    },
    {
      id: 'services',
      title: 'Service Management',
      icon: 'business',
      color: '#34C759',
      description: 'Add, edit, delete services. Manage prices and deals',
      onPress: () => navigation.navigate('AdminServiceManagement'),
    },
    {
      id: 'calendar',
      title: 'Calendar Management',
      icon: 'calendar',
      color: '#FF9500',
      description: 'Edit events, manage bookings, control availability',
      onPress: () => navigation.navigate('AdminCalendarManagement'),
    },
    {
      id: 'messages',
      title: 'User Messaging',
      icon: 'chatbubbles',
      color: '#9C27B0',
      description: 'Message any user, send announcements, manage communications',
      onPress: () => navigation.navigate('AdminMessaging'),
    },
    {
      id: 'employees',
      title: 'Employee Management',
      icon: 'briefcase',
      color: '#FF6B6B',
      description: 'Manage employees, assign roles, track performance',
      onPress: () => navigation.navigate('AdminEmployeeManagement'),
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: 'restaurant',
      color: '#00BCD4',
      description: 'Edit bar menu, update prices, manage items',
      onPress: () => navigation.navigate('AdminMenuManagement'),
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: 'receipt',
      color: '#FFC107',
      description: 'View all orders, process refunds, manage transactions',
      onPress: () => navigation.navigate('AdminOrderManagement'),
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: 'stats-chart',
      color: '#E91E63',
      description: 'View revenue, user activity, performance metrics',
      onPress: () => navigation.navigate('AdminAnalytics'),
    },
    {
      id: 'settings',
      title: 'System Settings',
      icon: 'settings',
      color: '#607D8B',
      description: 'Configure app settings, integrations, system preferences',
      onPress: () => navigation.navigate('AdminSystemSettings'),
    },
  ];

  const renderStatCard = (label, value, icon, color) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.subtext }]}>{label}</Text>
    </View>
  );

  const renderAdminSection = ({ item }) => (
    <TouchableOpacity
      style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.sectionIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={32} color={item.color} />
      </View>
      <View style={styles.sectionContent}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.sectionDescription, { color: theme.subtext }]}>{item.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.subtext} />
    </TouchableOpacity>
  );

  if (!canAccess) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <M1ALogo size={32} variant="icon" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Control Center</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
          <View style={styles.welcomeContent}>
            <Ionicons name="shield-checkmark" size={48} color={theme.primary} />
            <View style={styles.welcomeText}>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>Admin Control Center</Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.subtext }]}>
                Complete control over all app functions and operations
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Total Users', stats.totalUsers, 'people', '#007AFF')}
            {renderStatCard('Active Users', stats.activeUsers, 'person-circle', '#34C759')}
            {renderStatCard('Employees', stats.employees, 'briefcase', '#FF9500')}
            {renderStatCard('Services', stats.totalServices, 'business', '#9C27B0')}
            {renderStatCard('Events', stats.activeEvents, 'calendar', '#FF6B6B')}
            {renderStatCard('Orders', stats.pendingOrders, 'receipt', '#00BCD4')}
          </View>
        </View>

        {/* Admin Sections */}
        <View style={styles.sectionsContainer}>
          <Text style={[styles.sectionHeader, { color: theme.text }]}>Control Center</Text>
          <FlatList
            data={adminSections}
            renderItem={renderAdminSection}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionsContainer: {
    marginBottom: 24,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

