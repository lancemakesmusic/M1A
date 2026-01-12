/**
 * Admin Order Management Screen
 * View all orders, process refunds, manage transactions
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, updateDoc, doc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebase';
import EmptyState from '../components/EmptyState';

export default function AdminOrderManagementScreen({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isAdminEmail } = useRole();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, completed, cancelled
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    orderType: 'all', // all, serviceOrders, eventOrders, barOrders
    paymentMethod: 'all', // all, stripe, wallet, cash, free
    minAmount: '',
    maxAmount: '',
    customerSearch: '',
    startDate: null,
    endDate: null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState(null); // 'start' or 'end'
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    ordersByStatus: {},
    ordersByType: {},
    revenueByType: {},
    ordersByDate: [],
  });

  const canAccess = isAdminEmail && user?.email === 'admin@merkabaent.com';

  useEffect(() => {
    if (!canAccess) {
      Alert.alert('Access Denied', 'Only admin@merkabaent.com can access this screen');
      navigation.goBack();
      return;
    }
    loadOrders();
  }, [user, canAccess]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Try multiple possible collections
      const collections = ['orders', 'serviceOrders', 'eventOrders', 'barOrders', 'cartOrders', 'transactions'];
      let allOrders = [];

      for (const collectionName of collections) {
        try {
          const ordersQuery = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
          const ordersSnapshot = await getDocs(ordersQuery);
          const ordersData = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName,
            orderType: collectionName.replace('Orders', '').replace('s', '') || 'order',
            ...doc.data(),
          }));
          allOrders = [...allOrders, ...ordersData];
        } catch (error) {
          // Collection might not exist, continue
          console.log(`Collection ${collectionName} not found or error:`, error);
        }
      }

      setOrders(allOrders);
      calculateAnalytics(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateAnalytics]);

  const calculateAnalytics = useCallback((ordersData) => {
    let totalRevenue = 0;
    let totalOrders = ordersData.length;
    const ordersByStatus = {};
    const ordersByType = {};
    const revenueByType = {};
    const ordersByDate = {};

    ordersData.forEach(order => {
      const amount = parseFloat(order.total || order.amount || 0);
      totalRevenue += amount;

      // Orders by status
      const status = order.status || 'pending';
      ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;

      // Orders by type
      const type = order.orderType || 'order';
      ordersByType[type] = (ordersByType[type] || 0) + 1;
      revenueByType[type] = (revenueByType[type] || 0) + amount;

      // Orders by date
      if (order.createdAt) {
        const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        const dateKey = date.toISOString().split('T')[0];
        ordersByDate[dateKey] = (ordersByDate[dateKey] || 0) + 1;
      }
    });

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setAnalytics({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      ordersByStatus,
      ordersByType,
      revenueByType,
      ordersByDate: Object.entries(ordersByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 30), // Last 30 days
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      await updateDoc(doc(db, order.collection || 'orders', order.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      Alert.alert('Success', `Order status updated to ${newStatus}`);
      setShowOrderModal(false);
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleProcessRefund = async (order) => {
    if (!order.paymentIntentId && !order.stripePaymentIntentId) {
      Alert.alert(
        'Refund Not Available',
        'This order does not have a payment intent ID. Refunds can only be processed for Stripe payments.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Process Refund',
      `Are you sure you want to process a refund for order ${order.id}?\n\nAmount: $${order.total?.toFixed(2) || '0.00'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process Refund',
          style: 'destructive',
          onPress: async () => {
            try {
              // Import StripeService dynamically (it's exported as a singleton)
              const stripeService = (await import('../services/StripeService')).default;
              
              const paymentIntentId = order.paymentIntentId || order.stripePaymentIntentId;
              const refundAmount = order.total || order.amount || 0;
              
              // Process refund through Stripe
              const refundResult = await stripeService.refundPayment(paymentIntentId, refundAmount);
              
              // Update order status in Firestore
              await updateDoc(doc(db, order.collection || 'orders', order.id), {
                status: 'refunded',
                refundedAt: serverTimestamp(),
                refundedBy: user.uid,
                refundId: refundResult.refundId,
                refundAmount: refundAmount,
              });
              
              Alert.alert('Success', `Refund of $${refundAmount.toFixed(2)} processed successfully`);
              setShowOrderModal(false);
              loadOrders();
            } catch (error) {
              console.error('Error processing refund:', error);
              Alert.alert('Error', error.message || 'Failed to process refund. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExportOrders = async () => {
    try {
      if (filteredOrders.length === 0) {
        Alert.alert('No Orders', 'There are no orders to export.');
        return;
      }

      // Create CSV content
      const headers = ['Order ID', 'Date', 'User Email', 'Type', 'Status', 'Payment Method', 'Amount', 'Items'];
      const rows = filteredOrders.map(order => {
        const date = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)) : new Date();
        const items = order.items ? order.items.map(i => `${i.name} (x${i.quantity || 1})`).join('; ') : 'N/A';
        return [
          order.id,
          date.toISOString(),
          order.userEmail || 'N/A',
          order.orderType || 'order',
          order.status || 'pending',
          order.paymentMethod || 'stripe',
          (order.total || order.amount || 0).toFixed(2),
          items,
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Save to file
      const fileName = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Export Complete', `File saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('Error exporting orders:', error);
      Alert.alert('Error', 'Failed to export orders. Please try again.');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'No date';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#FF9500';
      case 'completed':
      case 'confirmed':
        return '#34C759';
      case 'cancelled':
      case 'refunded':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (filters.status !== 'all' && order.status?.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }

      // Order type filter
      if (filters.orderType !== 'all') {
        const orderType = order.orderType || order.collection?.replace('Orders', '').replace('s', '') || 'order';
        if (orderType.toLowerCase() !== filters.orderType.toLowerCase()) {
          return false;
        }
      }

      // Payment method filter
      if (filters.paymentMethod !== 'all') {
        const paymentMethod = order.paymentMethod || (order.paymentStatus === 'free' ? 'free' : 'stripe');
        if (paymentMethod.toLowerCase() !== filters.paymentMethod.toLowerCase()) {
          return false;
        }
      }

      // Amount range filter
      const amount = parseFloat(order.total || order.amount || 0);
      if (filters.minAmount && amount < parseFloat(filters.minAmount)) {
        return false;
      }
      if (filters.maxAmount && amount > parseFloat(filters.maxAmount)) {
        return false;
      }

      // Customer search filter
      if (filters.customerSearch) {
        const searchLower = filters.customerSearch.toLowerCase();
        const userEmail = (order.userEmail || '').toLowerCase();
        const userName = (order.userName || order.userDisplayName || '').toLowerCase();
        const userId = (order.userId || '').toLowerCase();
        if (!userEmail.includes(searchLower) && !userName.includes(searchLower) && !userId.includes(searchLower)) {
          return false;
        }
      }

      // Date range filter
      if (filters.startDate || filters.endDate) {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
        if (filters.startDate && orderDate < filters.startDate) {
          return false;
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (orderDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [orders, filters]);

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => handleViewOrder(item)}
    >
      <View style={styles.orderInfo}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderId, { color: theme.text }]}>Order #{item.id.slice(0, 8)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status?.toUpperCase() || 'PENDING'}
            </Text>
          </View>
        </View>
        {item.userEmail && (
          <Text style={[styles.orderUser, { color: theme.subtext }]}>{item.userEmail}</Text>
        )}
        <View style={styles.orderMeta}>
          {item.total && (
            <Text style={[styles.orderTotal, { color: theme.text }]}>${item.total.toFixed(2)}</Text>
          )}
          {item.createdAt && (
            <Text style={[styles.orderDate, { color: theme.subtext }]}>{formatDate(item.createdAt)}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
    </TouchableOpacity>
  );

  if (!canAccess) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Order Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Header Actions */}
      <View style={[styles.headerActions, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Filters</Text>
          {(filters.status !== 'all' || filters.orderType !== 'all' || filters.paymentMethod !== 'all' || filters.customerSearch || filters.minAmount || filters.maxAmount || filters.startDate || filters.endDate) && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
          onPress={() => setShowAnalytics(!showAnalytics)}
        >
          <Ionicons name="stats-chart" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
          onPress={handleExportOrders}
        >
          <Ionicons name="download-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Status Filters */}
      <View style={[styles.filters, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {['all', 'pending', 'completed', 'cancelled', 'refunded'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filters.status === filterOption ? theme.primary : theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setFilters({ ...filters, status: filterOption })}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filters.status === filterOption ? '#fff' : theme.text },
                ]}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Advanced Filters Modal */}
      {showFilters && (
        <Modal visible={showFilters} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Advanced Filters</Text>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Order Type Filter */}
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Order Type</Text>
                  <View style={styles.filterOptions}>
                    {['all', 'service', 'event', 'bar'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.filterOption,
                          {
                            backgroundColor: filters.orderType === type ? theme.primary : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setFilters({ ...filters, orderType: type })}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { color: filters.orderType === type ? '#fff' : theme.text },
                          ]}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Payment Method Filter */}
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Payment Method</Text>
                  <View style={styles.filterOptions}>
                    {['all', 'stripe', 'wallet', 'cash', 'free'].map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.filterOption,
                          {
                            backgroundColor: filters.paymentMethod === method ? theme.primary : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setFilters({ ...filters, paymentMethod: method })}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            { color: filters.paymentMethod === method ? '#fff' : theme.text },
                          ]}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Amount Range */}
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Amount Range</Text>
                  <View style={styles.amountRow}>
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Min"
                      placeholderTextColor={theme.subtext}
                      value={filters.minAmount}
                      onChangeText={(text) => setFilters({ ...filters, minAmount: text })}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.amountSeparator, { color: theme.subtext }]}>-</Text>
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Max"
                      placeholderTextColor={theme.subtext}
                      value={filters.maxAmount}
                      onChangeText={(text) => setFilters({ ...filters, maxAmount: text })}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Customer Search */}
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Customer Search</Text>
                  <TextInput
                    style={[styles.searchInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                    placeholder="Email, name, or user ID"
                    placeholderTextColor={theme.subtext}
                    value={filters.customerSearch}
                    onChangeText={(text) => setFilters({ ...filters, customerSearch: text })}
                  />
                </View>

                {/* Date Range */}
                <View style={styles.filterGroup}>
                  <Text style={[styles.filterLabel, { color: theme.text }]}>Date Range</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => {
                        setDatePickerMode('start');
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {filters.startDate ? filters.startDate.toLocaleDateString() : 'Start Date'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => {
                        setDatePickerMode('end');
                        setShowDatePicker(true);
                      }}
                    >
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {filters.endDate ? filters.endDate.toLocaleDateString() : 'End Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Clear Filters */}
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setFilters({
                    status: 'all',
                    orderType: 'all',
                    paymentMethod: 'all',
                    minAmount: '',
                    maxAmount: '',
                    customerSearch: '',
                    startDate: null,
                    endDate: null,
                  })}
                >
                  <Text style={[styles.clearButtonText, { color: theme.text }]}>Clear All Filters</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <Modal visible={showAnalytics} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Order Analytics</Text>
                <TouchableOpacity onPress={() => setShowAnalytics(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalContent}>
                {/* Key Metrics */}
                <View style={styles.analyticsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Metrics</Text>
                  <View style={styles.metricsGrid}>
                    <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                      <Ionicons name="cash-outline" size={24} color="#34C759" />
                      <Text style={[styles.metricValue, { color: theme.text }]}>
                        ${analytics.totalRevenue.toFixed(2)}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Revenue</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                      <Ionicons name="receipt-outline" size={24} color={theme.primary} />
                      <Text style={[styles.metricValue, { color: theme.text }]}>{analytics.totalOrders}</Text>
                      <Text style={[styles.metricLabel, { color: theme.subtext }]}>Total Orders</Text>
                    </View>
                    <View style={[styles.metricCard, { backgroundColor: theme.background }]}>
                      <Ionicons name="trending-up-outline" size={24} color="#FF9500" />
                      <Text style={[styles.metricValue, { color: theme.text }]}>
                        ${analytics.averageOrderValue.toFixed(2)}
                      </Text>
                      <Text style={[styles.metricLabel, { color: theme.subtext }]}>Avg Order Value</Text>
                    </View>
                  </View>
                </View>

                {/* Orders by Status */}
                {Object.keys(analytics.ordersByStatus).length > 0 && (
                  <View style={styles.analyticsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Orders by Status</Text>
                    {Object.entries(analytics.ordersByStatus)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <View key={status} style={[styles.analyticsRow, { backgroundColor: theme.background }]}>
                          <Text style={[styles.analyticsLabel, { color: theme.text }]}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Text>
                          <Text style={[styles.analyticsValue, { color: theme.primary }]}>{count}</Text>
                        </View>
                      ))}
                  </View>
                )}

                {/* Revenue by Type */}
                {Object.keys(analytics.revenueByType).length > 0 && (
                  <View style={styles.analyticsSection}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Revenue by Type</Text>
                    {Object.entries(analytics.revenueByType)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, revenue]) => (
                        <View key={type} style={[styles.analyticsRow, { backgroundColor: theme.background }]}>
                          <Text style={[styles.analyticsLabel, { color: theme.text }]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                          <Text style={[styles.analyticsValue, { color: theme.primary }]}>
                            ${revenue.toFixed(2)}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (filters.startDate || new Date()) : (filters.endDate || new Date())}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (datePickerMode === 'start') {
                setFilters({ ...filters, startDate: selectedDate });
              } else {
                setFilters({ ...filters, endDate: selectedDate });
              }
            }
          }}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No orders"
              message="No orders found in the system"
            />
          }
        />
      )}

      {/* Order Detail Modal */}
      <Modal visible={showOrderModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Order Details</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedOrder && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.subtext }]}>Order ID</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.id}</Text>
                  </View>
                  {selectedOrder.userEmail && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.subtext }]}>User</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedOrder.userEmail}</Text>
                    </View>
                  )}
                  {selectedOrder.total && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.subtext }]}>Total</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>
                        ${selectedOrder.total.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {selectedOrder.status && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.subtext }]}>Status</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                          {selectedOrder.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}
                  {selectedOrder.items && (
                    <View style={styles.itemsSection}>
                      <Text style={[styles.sectionTitle, { color: theme.text }]}>Items</Text>
                      {selectedOrder.items.map((item, index) => (
                        <View key={index} style={styles.itemRow}>
                          <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                          <Text style={[styles.itemPrice, { color: theme.text }]}>
                            ${item.price?.toFixed(2)} x {item.quantity || 1}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {selectedOrder && selectedOrder.status !== 'refunded' && (
              <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
                {selectedOrder.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#34C759' }]}
                    onPress={() => handleUpdateStatus(selectedOrder, 'completed')}
                  >
                    <Text style={styles.modalButtonTextPrimary}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
                {selectedOrder.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#FF9500' }]}
                    onPress={() => handleUpdateStatus(selectedOrder, 'cancelled')}
                  >
                    <Text style={styles.modalButtonTextPrimary}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#FF3B30' }]}
                  onPress={() => handleProcessRefund(selectedOrder)}
                >
                  <Text style={styles.modalButtonTextPrimary}>Refund</Text>
                </TouchableOpacity>
              </View>
            )}
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
  filters: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderInfo: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderUser: {
    fontSize: 14,
    marginBottom: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  orderDate: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
  },
  itemsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header Actions
  headerActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Advanced Filters
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  amountSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Analytics
  analyticsSection: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  analyticsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

