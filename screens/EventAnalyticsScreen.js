/**
 * Event Analytics Screen
 * Comprehensive analytics for event performance, ticket sales, revenue, and attendance
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getCountFromServer, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { db, isFirebaseReady } from '../firebase';

export default function EventAnalyticsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const selectedEvent = route?.params?.event;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'week', 'month', 'year'
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalAttendees: 0,
    averageTicketPrice: 0,
    conversionRate: 0,
    topEvents: [],
    recentBookings: [],
    revenueByCategory: {},
    ticketsByType: {},
  });

  // SECURITY: Only admin@merkabaent.com can access this screen
  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert(
        'Access Denied',
        'Only admin@merkabaent.com can access admin tools for security purposes.'
      );
      navigation.goBack();
      return;
    }
    loadAnalytics();
  }, [user, canAccess, navigation, timeRange, selectedEvent]);

  const loadAnalytics = async () => {
    if (!isFirebaseReady() || !db) return;

    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date(0); // Beginning of time

      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      // Load events
      const eventsQuery = selectedEvent
        ? query(collection(db, 'publicEvents'), where('__name__', '==', selectedEvent.id))
        : query(
            collection(db, 'publicEvents'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc')
          );

      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load event orders
      const ordersQuery = selectedEvent
        ? query(collection(db, 'eventOrders'), where('eventId', '==', selectedEvent.id))
        : query(
            collection(db, 'eventOrders'),
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            orderBy('createdAt', 'desc')
          );

      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load event bookings
      const bookingsQuery = selectedEvent
        ? query(collection(db, 'eventBookings'), where('eventId', '==', selectedEvent.id))
        : query(
            collection(db, 'eventBookings'),
            where('createdAt', '>=', Timestamp.fromDate(startDate))
          );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate analytics
      const totalEvents = events.length;
      let totalRevenue = 0;
      let totalTicketsSold = 0;
      const revenueByCategory = {};
      const ticketsByType = {};

      orders.forEach(order => {
        const amount = parseFloat(order.total || order.amount || 0);
        totalRevenue += amount;
        totalTicketsSold += parseInt(order.quantity || 1);

        // Revenue by category
        const event = events.find(e => e.id === order.eventId);
        if (event) {
          const category = event.category || 'other';
          revenueByCategory[category] = (revenueByCategory[category] || 0) + amount;
        }

        // Tickets by type
        const ticketType = order.ticketType || 'standard';
        ticketsByType[ticketType] = (ticketsByType[ticketType] || 0) + parseInt(order.quantity || 1);
      });

      const totalAttendees = bookings.length;
      const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;

      // Calculate conversion rate (tickets sold / capacity)
      let totalCapacity = 0;
      events.forEach(event => {
        totalCapacity += parseInt(event.capacity || 0);
      });
      const conversionRate = totalCapacity > 0 ? (totalTicketsSold / totalCapacity) * 100 : 0;

      // Top events by revenue
      const eventRevenue = {};
      orders.forEach(order => {
        const eventId = order.eventId;
        if (!eventRevenue[eventId]) {
          eventRevenue[eventId] = 0;
        }
        eventRevenue[eventId] += parseFloat(order.total || order.amount || 0);
      });

      const topEvents = Object.entries(eventRevenue)
        .map(([eventId, revenue]) => {
          const event = events.find(e => e.id === eventId);
          return {
            id: eventId,
            title: event?.title || 'Unknown Event',
            revenue,
            ticketsSold: orders.filter(o => o.eventId === eventId).reduce((sum, o) => sum + parseInt(o.quantity || 1), 0),
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Recent bookings
      const recentBookings = bookings
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return bTime - aTime;
        })
        .slice(0, 10);

      setAnalytics({
        totalEvents,
        totalRevenue,
        totalTicketsSold,
        totalAttendees,
        averageTicketPrice,
        conversionRate,
        topEvents,
        recentBookings,
        revenueByCategory,
        ticketsByType,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      Alert.alert('Error', 'Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {selectedEvent ? `${selectedEvent.title} Analytics` : 'Event Analytics'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {['all', 'week', 'month', 'year'].map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
              timeRange === range && { backgroundColor: theme.primary, borderColor: theme.primary },
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text
              style={[
                styles.timeRangeText,
                { color: timeRange === range ? '#fff' : theme.text },
              ]}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
              <Text style={[styles.metricValue, { color: theme.text }]}>{analytics.totalEvents}</Text>
              <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Events</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="cash-outline" size={24} color="#34C759" />
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {formatCurrency(analytics.totalRevenue)}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Revenue</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="ticket-outline" size={24} color="#FF9500" />
              <Text style={[styles.metricValue, { color: theme.text }]}>{analytics.totalTicketsSold}</Text>
              <Text style={[styles.metricLabel, { color: theme.subtext }]}>Tickets Sold</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: theme.cardBackground }]}>
              <Ionicons name="people-outline" size={24} color="#FF2D92" />
              <Text style={[styles.metricValue, { color: theme.text }]}>{analytics.totalAttendees}</Text>
              <Text style={[styles.metricLabel, { color: theme.subtext }]}>Attendees</Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Performance</Text>
          <View style={styles.performanceGrid}>
            <View style={[styles.performanceCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.performanceValue, { color: theme.text }]}>
                {formatCurrency(analytics.averageTicketPrice)}
              </Text>
              <Text style={[styles.performanceLabel, { color: theme.subtext }]}>Avg Ticket Price</Text>
            </View>
            <View style={[styles.performanceCard, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.performanceValue, { color: theme.text }]}>
                {analytics.conversionRate.toFixed(1)}%
              </Text>
              <Text style={[styles.performanceLabel, { color: theme.subtext }]}>Conversion Rate</Text>
            </View>
          </View>
        </View>

        {/* Top Events */}
        {analytics.topEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Events</Text>
            {analytics.topEvents.map((event, index) => (
              <View key={event.id} style={[styles.topEventCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.topEventRank}>
                  <Text style={[styles.rankNumber, { color: theme.primary }]}>#{index + 1}</Text>
                </View>
                <View style={styles.topEventInfo}>
                  <Text style={[styles.topEventTitle, { color: theme.text }]}>{event.title}</Text>
                  <Text style={[styles.topEventStats, { color: theme.subtext }]}>
                    {event.ticketsSold} tickets • {formatCurrency(event.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Revenue by Category */}
        {Object.keys(analytics.revenueByCategory).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Revenue by Category</Text>
            {Object.entries(analytics.revenueByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, revenue]) => (
                <View key={category} style={[styles.categoryCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.categoryName, { color: theme.text }]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={[styles.categoryRevenue, { color: theme.primary }]}>
                    {formatCurrency(revenue)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Tickets by Type */}
        {Object.keys(analytics.ticketsByType).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tickets by Type</Text>
            {Object.entries(analytics.ticketsByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <View key={type} style={[styles.typeCard, { backgroundColor: theme.cardBackground }]}>
                  <Text style={[styles.typeName, { color: theme.text }]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <Text style={[styles.typeCount, { color: theme.primary }]}>{count}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
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
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  performanceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  performanceLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  topEventCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  topEventRank: {
    width: 40,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  topEventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  topEventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  topEventStats: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  typeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  typeCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

