/**
 * Admin Order Management Screen
 * View all orders, process refunds, manage transactions
 */

import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, orderBy, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
      const collections = ['orders', 'cartOrders', 'transactions'];
      let allOrders = [];

      for (const collectionName of collections) {
        try {
          const ordersQuery = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
          const ordersSnapshot = await getDocs(ordersQuery);
          const ordersData = ordersSnapshot.docs.map(doc => ({
            id: doc.id,
            collection: collectionName,
            ...doc.data(),
          }));
          allOrders = [...allOrders, ...ordersData];
        } catch (error) {
          // Collection might not exist, continue
          console.log(`Collection ${collectionName} not found or error:`, error);
        }
      }

      setOrders(allOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status?.toLowerCase() === filter.toLowerCase();
  });

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

      {/* Filters */}
      <View style={[styles.filters, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {['all', 'pending', 'completed', 'cancelled'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === filterOption ? theme.primary : theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setFilter(filterOption)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === filterOption ? '#fff' : theme.text },
                ]}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
});

