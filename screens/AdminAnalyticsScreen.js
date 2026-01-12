/**
 * Admin Analytics Screen
 * View revenue, user activity, performance metrics
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 150;

export default function AdminAnalyticsScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState(null); // 'start' or 'end'
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    totalServices: 0,
    totalEvents: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    revenueByType: {},
    ordersByType: {},
    revenueByDate: [],
    ordersByDate: [],
    usersByDate: [],
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
      
      // Build date filter if date range is set
      const dateFilter = dateRange.startDate || dateRange.endDate;
      const startDate = dateRange.startDate ? (() => {
        const d = new Date(dateRange.startDate);
        d.setHours(0, 0, 0, 0);
        return d;
      })() : null;
      const endDate = dateRange.endDate ? (() => {
        const d = new Date(dateRange.endDate);
        d.setHours(23, 59, 59, 999);
        return d;
      })() : null;

      // Load analytics from various collections
      const collections = [
        'users',
        'orders',
        'serviceOrders',
        'eventOrders',
        'barOrders',
        'services',
        'events',
        'publicEvents',
      ];

      const snapshots = await Promise.all(
        collections.map(collectionName => 
          getDocs(collection(db, collectionName)).catch(() => ({ size: 0, docs: [] }))
        )
      );

      const [usersSnapshot, ordersSnapshot, serviceOrdersSnapshot, eventOrdersSnapshot, barOrdersSnapshot, servicesSnapshot, eventsSnapshot, publicEventsSnapshot] = snapshots;

      // Filter by date range if set
      const filterByDate = (docs) => {
        if (!dateFilter) return docs;
        return docs.filter(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
          if (!createdAt) return false;
          if (startDate && createdAt < startDate) return false;
          if (endDate && createdAt > endDate) return false;
          return true;
        });
      };

      const allUsers = filterByDate(usersSnapshot.docs || []);
      const allOrders = [
        ...filterByDate(ordersSnapshot.docs || []),
        ...filterByDate(serviceOrdersSnapshot.docs || []),
        ...filterByDate(eventOrdersSnapshot.docs || []),
        ...filterByDate(barOrdersSnapshot.docs || []),
      ];

      const totalUsers = allUsers.length;
      const activeUsers = allUsers.filter(doc => doc.data().accountStatus !== 'inactive').length;
      const totalOrders = allOrders.length;
      
      const totalRevenue = allOrders.reduce((sum, doc) => {
        const order = doc.data();
        return sum + (parseFloat(order.total || order.amount || 0));
      }, 0);

      const totalServices = servicesSnapshot.size || 0;
      const totalEvents = (eventsSnapshot.size || 0) + (publicEventsSnapshot.size || 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      // Calculate conversion rate (orders / users)
      const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;

      // Revenue and orders by type
      const revenueByType = {};
      const ordersByType = {};
      allOrders.forEach(doc => {
        const order = doc.data();
        const type = order.collection?.replace('Orders', '').replace('s', '') || order.orderType || 'order';
        const amount = parseFloat(order.total || order.amount || 0);
        revenueByType[type] = (revenueByType[type] || 0) + amount;
        ordersByType[type] = (ordersByType[type] || 0) + 1;
      });

      // Group by date for trends (last 30 days)
      const revenueByDate = {};
      const ordersByDate = {};
      const usersByDate = {};
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allOrders.forEach(doc => {
        const order = doc.data();
        const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt) : null);
        if (createdAt && createdAt >= thirtyDaysAgo) {
          const dateKey = createdAt.toISOString().split('T')[0];
          const amount = parseFloat(order.total || order.amount || 0);
          revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + amount;
          ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
        }
      });

      allUsers.forEach(doc => {
        const user = doc.data();
        const createdAt = user.createdAt?.toDate ? user.createdAt.toDate() : (user.createdAt ? new Date(user.createdAt) : null);
        if (createdAt && createdAt >= thirtyDaysAgo) {
          const dateKey = createdAt.toISOString().split('T')[0];
          usersByDate[dateKey] = (usersByDate[dateKey] || 0) + 1;
        }
      });

      // Convert to arrays sorted by date
      const revenueByDateArray = Object.entries(revenueByDate)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30); // Last 30 days

      const ordersByDateArray = Object.entries(ordersByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30);

      const usersByDateArray = Object.entries(usersByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-30);

      setAnalytics({
        totalUsers,
        activeUsers,
        totalRevenue,
        totalOrders,
        totalServices,
        totalEvents,
        averageOrderValue,
        conversionRate,
        revenueByType,
        ordersByType,
        revenueByDate: revenueByDateArray,
        ordersByDate: ordersByDateArray,
        usersByDate: usersByDateArray,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

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
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.dateFilterButton}
        >
          <Ionicons name="calendar-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      {(dateRange.startDate || dateRange.endDate) && (
        <View style={[styles.dateFilterBar, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <Text style={[styles.dateFilterText, { color: theme.text }]}>
            {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : 'Start'} - {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : 'End'}
          </Text>
          <TouchableOpacity
            onPress={() => setDateRange({ startDate: null, endDate: null })}
            style={styles.clearDateButton}
          >
            <Ionicons name="close-circle" size={20} color={theme.subtext} />
          </TouchableOpacity>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <Modal visible={showDatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Date Range</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => {
                    setDatePickerMode('start');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    Start: {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : 'Select'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => {
                    setDatePickerMode('end');
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    End: {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : 'Select'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showDatePicker && datePickerMode && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (dateRange.startDate || new Date()) : (dateRange.endDate || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (datePickerMode === 'start') {
                setDateRange({ ...dateRange, startDate: selectedDate });
              } else {
                setDateRange({ ...dateRange, endDate: selectedDate });
              }
            }
            setDatePickerMode(null);
          }}
        />
      )}

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
            {renderStatCard('Avg Order', `$${analytics.averageOrderValue.toFixed(2)}`, 'trending-up', '#00BCD4')}
            {renderStatCard('Conversion', `${analytics.conversionRate.toFixed(1)}%`, 'stats-chart', '#FF6B6B')}
          </View>

          {/* Revenue Trends Chart */}
          {analytics.revenueByDate.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Revenue Trends (Last 30 Days)</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {renderBarChart(analytics.revenueByDate, 'date', 'revenue', '#34C759', Math.max(...analytics.revenueByDate.map(d => d.revenue || 0)))}
              </View>
            </>
          )}

          {/* Orders Trends Chart */}
          {analytics.ordersByDate.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Order Trends (Last 30 Days)</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {renderBarChart(analytics.ordersByDate, 'date', 'count', '#007AFF', Math.max(...analytics.ordersByDate.map(d => d.count || 0)))}
              </View>
            </>
          )}

          {/* User Growth Chart */}
          {analytics.usersByDate.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>User Growth (Last 30 Days)</Text>
              <View style={[styles.chartCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {renderBarChart(analytics.usersByDate, 'date', 'count', '#FF9500', Math.max(...analytics.usersByDate.map(d => d.count || 0)))}
              </View>
            </>
          )}

          {/* Revenue Breakdown */}
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
                ${analytics.averageOrderValue.toFixed(2)}
              </Text>
            </View>
            <View style={styles.revenueRow}>
              <Text style={[styles.revenueLabel, { color: theme.subtext }]}>Conversion Rate</Text>
              <Text style={[styles.revenueValue, { color: theme.text }]}>
                {analytics.conversionRate.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Revenue by Type */}
          {Object.keys(analytics.revenueByType).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Revenue by Type</Text>
              <View style={[styles.revenueCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                {Object.entries(analytics.revenueByType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, revenue]) => (
                    <View key={type} style={styles.revenueRow}>
                      <Text style={[styles.revenueLabel, { color: theme.subtext }]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                      <Text style={[styles.revenueValue, { color: theme.text }]}>
                        ${revenue.toFixed(2)} ({analytics.ordersByType[type] || 0} orders)
                      </Text>
                    </View>
                  ))}
              </View>
            </>
          )}

          {/* User Activity */}
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
            <View style={styles.activityRow}>
              <Text style={[styles.activityLabel, { color: theme.subtext }]}>Active Rate</Text>
              <Text style={[styles.activityValue, { color: theme.text }]}>
                {analytics.totalUsers > 0 ? ((analytics.activeUsers / analytics.totalUsers) * 100).toFixed(1) : '0'}%
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














