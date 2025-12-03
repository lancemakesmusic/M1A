/**
 * Admin Analytics Screen
 * View revenue, user activity, performance metrics
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { db } from '../firebase';

export default function AdminAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalServices: 0,
    totalEvents: 0,
    recentActivity: [],
  });

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      navigation.goBack();
      return;
    }
    loadAnalytics();
  }, [user, canAccess]);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      // Load analytics from various collections
      const [usersSnapshot, ordersSnapshot, servicesSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'orders')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'services')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'events')).catch(() => ({ size: 0, docs: [] })),
      ]);

      const totalUsers = usersSnapshot.size || 0;
      const activeUsers = usersSnapshot.docs.filter(doc => doc.data().accountStatus !== 'inactive').length;
      const totalOrders = ordersSnapshot.size || 0;
      const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
        const order = doc.data();
        return sum + (order.total || order.amount || 0);
      }, 0);
      const totalServices = servicesSnapshot.size || 0;
      const totalEvents = eventsSnapshot.size || 0;

      setAnalytics({
        totalUsers,
        activeUsers,
        totalRevenue,
        totalOrders,
        totalServices,
        totalEvents,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalytics();
  }, [loadAnalytics]);

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: theme.subtext }]}>{subtitle}</Text>}
    </View>
  );

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Analytics & Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Total Users', analytics.totalUsers, 'people', '#007AFF')}
            {renderStatCard('Active Users', analytics.activeUsers, 'person-circle', '#34C759')}
            {renderStatCard('Total Revenue', `$${analytics.totalRevenue.toFixed(2)}`, 'cash', '#FF9500')}
            {renderStatCard('Total Orders', analytics.totalOrders, 'receipt', '#9C27B0')}
            {renderStatCard('Services', analytics.totalServices, 'business', '#00BCD4')}
            {renderStatCard('Events', analytics.totalEvents, 'calendar', '#FF6B6B')}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Revenue Breakdown</Text>
          <View style={[styles.revenueCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.revenueRow}>
              <Text style={[styles.revenueLabel, { color: theme.subtext }]}>Total Revenue</Text>
              <Text style={[styles.revenueValue, { color: theme.text }]}>
                ${analytics.totalRevenue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.revenueRow}>
              <Text style={[styles.revenueLabel, { color: theme.subtext }]}>Average Order Value</Text>
              <Text style={[styles.revenueValue, { color: theme.text }]}>
                ${analytics.totalOrders > 0 ? (analytics.totalRevenue / analytics.totalOrders).toFixed(2) : '0.00'}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>User Activity</Text>
          <View style={[styles.activityCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.activityRow}>
              <Text style={[styles.activityLabel, { color: theme.subtext }]}>Total Users</Text>
              <Text style={[styles.activityValue, { color: theme.text }]}>{analytics.totalUsers}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={[styles.activityLabel, { color: theme.subtext }]}>Active Users</Text>
              <Text style={[styles.activityValue, { color: '#34C759' }]}>{analytics.activeUsers}</Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={[styles.activityLabel, { color: theme.subtext }]}>Inactive Users</Text>
              <Text style={[styles.activityValue, { color: '#FF3B30' }]}>
                {analytics.totalUsers - analytics.activeUsers}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  revenueCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  revenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  revenueLabel: {
    fontSize: 14,
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  activityLabel: {
    fontSize: 14,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});


