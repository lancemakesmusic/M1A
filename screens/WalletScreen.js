import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    RefreshControl,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import WalletService from '../services/WalletService';
import StripePaymentMethodsService from '../services/StripePaymentMethodsService';
import { trackWalletTransaction, trackButtonClick, trackFeatureUsage } from '../services/AnalyticsService';
import { sendPaymentConfirmation } from '../services/NotificationService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import useScreenTracking from '../hooks/useScreenTracking';
import EmptyState from '../components/EmptyState';

export default function WalletScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  useScreenTracking('WalletScreen');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [insights, setInsights] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState(null);
  const [qrCodeData, setQrCodeData] = useState('');

  // Mock transaction data
  const mockTransactions = [
    {
      id: '1',
      type: 'received',
      amount: 500.00,
      description: 'Event booking payment',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      status: 'completed',
      icon: 'calendar',
    },
    {
      id: '2',
      type: 'sent',
      amount: -75.50,
      description: 'Service fee payment',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: 'completed',
      icon: 'card',
    },
    {
      id: '3',
      type: 'received',
      amount: 200.00,
      description: 'Refund - Event cancellation',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: 'completed',
      icon: 'refresh',
    },
    {
      id: '4',
      type: 'sent',
      amount: -25.00,
      description: 'Withdrawal to bank',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: 'pending',
      icon: 'arrow-up',
    },
    {
      id: '5',
      type: 'received',
      amount: 1000.00,
      description: 'Event booking payment',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 1 week ago
      status: 'completed',
      icon: 'calendar',
    },
  ];

  // Mock payment methods
  const mockPaymentMethods = [
    {
      id: '1',
      type: 'card',
      name: 'Visa **** 4242',
      expiry: '12/25',
      isDefault: true,
      icon: 'card',
    },
    {
      id: '2',
      type: 'bank',
      name: 'Chase Bank **** 1234',
      isDefault: false,
      icon: 'business',
    },
    {
      id: '3',
      type: 'paypal',
      name: 'PayPal Account',
      isDefault: false,
      icon: 'logo-paypal',
    },
  ];

  useEffect(() => {
    if (user?.uid) {
      loadWalletData();
      // Generate QR code data
      const qrData = JSON.stringify({
        type: 'wallet_payment',
        userId: user.uid,
        email: user.email || '',
        walletId: user.uid,
      });
      setQrCodeData(qrData);
    }
  }, [user?.uid]);

  const loadWalletData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Load balance, transactions, and payment methods in parallel
      const [walletBalance, walletTransactions, walletPaymentMethods] = await Promise.all([
        WalletService.getBalance(user.uid),
        WalletService.getTransactions(user.uid),
        WalletService.getPaymentMethods(user.uid),
      ]);

      setBalance(walletBalance);
      // Use real transactions from WalletService (no mock fallback)
      setTransactions(walletTransactions || []);
      // Use real payment methods from WalletService (no mock fallback)
      setPaymentMethods(walletPaymentMethods || []);
      setSelectedPaymentMethod(
        walletPaymentMethods?.find(pm => pm.isDefault) || null
      );
    } catch (error) {
      console.error('Error loading wallet data:', error);
      // Show empty state instead of mock data
      setBalance(0);
      setTransactions([]);
      setPaymentMethods([]);
      setSelectedPaymentMethod(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWalletData();
  }, [loadWalletData]);

  const loadInsights = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // First load transactions to ensure we have data
      const transactions = await WalletService.getTransactions(user.uid);
      const walletInsights = await WalletService.getInsights(user.uid, 'month');
      setInsights(walletInsights);
    } catch (error) {
      console.error('Error loading insights:', error);
      // Set default insights if error
      setInsights({
        totalReceived: 0,
        totalSent: 0,
        netChange: 0,
        transactionCount: 0,
        topCategories: [],
      });
    }
  }, [user?.uid]);

  const handleSetDefaultPaymentMethod = async (paymentMethod) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to manage payment methods');
      return;
    }

    try {
      setProcessing(true);
      // Get Stripe customer ID from user or create one
      // For now, using userId as customerId (you may need to adjust this)
      const customerId = user.uid;
      
      await StripePaymentMethodsService.setDefaultPaymentMethod(customerId, paymentMethod.id);
      
      // Reload payment methods
      await loadWalletData();
      
      Alert.alert('Success', 'Default payment method updated');
      trackButtonClick('set_default_payment_method', 'WalletScreen');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', error.message || 'Failed to set default payment method');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethod) => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to manage payment methods');
      return;
    }

    Alert.alert(
      'Delete Payment Method',
      `Are you sure you want to delete ${paymentMethod.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingPaymentMethod(paymentMethod.id);
              await StripePaymentMethodsService.deletePaymentMethod(paymentMethod.id);
              
              // Reload payment methods
              await loadWalletData();
              
              Alert.alert('Success', 'Payment method deleted');
              trackButtonClick('delete_payment_method', 'WalletScreen');
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', error.message || 'Failed to delete payment method');
            } finally {
              setDeletingPaymentMethod(null);
            }
          },
        },
      ]
    );
  };

  const handleShareQRCode = async () => {
    try {
      const shareText = `Send money to my M1A wallet!\n\nScan the QR code or use my wallet ID: ${user?.uid || 'N/A'}`;
      await Share.share({
        message: shareText,
        title: 'My M1A Wallet QR Code',
      });
      trackButtonClick('share_qr_code', 'WalletScreen');
    } catch (error) {
      console.error('Error sharing QR code:', error);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const handleAddFunds = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to add funds');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (!selectedPaymentMethod) {
      Alert.alert('No Payment Method', 'Please select a payment method first');
      return;
    }
    
    Alert.alert(
      'Add Funds',
      `Add $${amount} to your wallet using ${selectedPaymentMethod.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setProcessing(true);
              const newAmount = parseFloat(amount);
              
              // Add funds via WalletService (handles Stripe payment)
              const result = await WalletService.addFunds(
                user.uid,
                newAmount,
                selectedPaymentMethod.id,
                {
                  paymentMethod: selectedPaymentMethod.name,
                }
              );

              if (result.success) {
                // Track analytics
                await trackWalletTransaction({
                  type: 'received',
                  amount: newAmount,
                });
                
                // Record positive action for rating prompt
                await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.PAYMENT_SUCCESS, {
                  type: 'add_funds',
                  amount: newAmount,
                });
                
                // Reload wallet data to get updated balance
                await loadWalletData();
                setAmount('');
                setShowAddFunds(false);
                Alert.alert('Success', 'Funds added successfully!');
              } else {
                throw new Error('Payment failed');
              }
            } catch (error) {
              console.error('Error adding funds:', error);
              Alert.alert('Error', error.message || 'Failed to add funds. Please try again.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleSendMoney = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to send money');
      return;
    }

    if (!amount || !recipient || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Details', 'Please enter valid amount and recipient');
      return;
    }
    
    const sendAmount = parseFloat(amount);
    if (sendAmount > balance) {
      Alert.alert('Insufficient Funds', 'You don\'t have enough balance');
      return;
    }
    
    Alert.alert(
      'Send Money',
      `Send $${amount} to ${recipient}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setProcessing(true);
              
              // For now, we'll use recipient as email/UID
              // In production, you'd look up the user by email/phone
              const recipientUserId = recipient; // This should be resolved from email/phone
              
              // Send money via WalletService
              const result = await WalletService.sendMoney(
                user.uid,
                recipientUserId,
                sendAmount,
                `Sent to ${recipient}`
              );

              if (result.success) {
                // Track analytics
                await trackWalletTransaction({
                  type: 'sent',
                  amount: -sendAmount,
                });
                trackButtonClick('send_money', 'WalletScreen');
                
                // Record positive action for rating prompt
                await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.PAYMENT_SUCCESS, {
                  type: 'send_money',
                  amount: sendAmount,
                });
                
                // Reload wallet data
                await loadWalletData();
                setAmount('');
                setRecipient('');
                setShowSendMoney(false);
                Alert.alert('Success', 'Money sent successfully!');
              } else {
                throw new Error('Failed to send money');
              }
            } catch (error) {
              console.error('Error sending money:', error);
              Alert.alert('Error', error.message || 'Failed to send money. Please try again.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }) => (
    <View style={[styles.transactionItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
      <View style={[styles.transactionIcon, { backgroundColor: item.type === 'received' ? theme.success + '20' : theme.error + '20' }]}>
        <Ionicons 
          name={item.icon} 
          size={20} 
          color={item.type === 'received' ? theme.success : theme.error} 
        />
      </View>
      
      <View style={styles.transactionContent}>
        <Text style={[styles.transactionDescription, { color: theme.text }]}>{item.description}</Text>
        <Text style={[styles.transactionTime, { color: theme.subtext }]}>{formatTime(item.timestamp)}</Text>
      </View>
      
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.transactionAmountText, 
          { color: item.type === 'received' ? theme.success : theme.error }
        ]}>
          {item.type === 'received' ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
        </Text>
        {item.status === 'pending' && (
          <Text style={[styles.pendingText, { color: theme.warning }]}>Pending</Text>
        )}
      </View>
    </View>
  );

  const renderPaymentMethod = ({ item }) => (
    <View style={[styles.paymentMethodItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.paymentMethodIcon}>
        <Ionicons name={item.icon} size={24} color={theme.primary} />
      </View>
      
      <View style={styles.paymentMethodContent}>
        <Text style={[styles.paymentMethodName, { color: theme.text }]}>{item.name}</Text>
        {item.expiry && (
          <Text style={[styles.paymentMethodExpiry, { color: theme.subtext }]}>Expires {item.expiry}</Text>
        )}
      </View>
      
      {item.isDefault && (
        <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.defaultText}>Default</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading wallet...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Wallet</Text>
        <TouchableOpacity style={styles.headerActionButton}>
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.isDark ? '#1a1a1a' : theme.primary }]}>
        <Text style={[styles.balanceLabel, { color: theme.isDark ? theme.primary : '#fff' }]}>Total Balance</Text>
        <Text style={[styles.balanceAmount, { color: theme.isDark ? theme.primary : '#fff' }]}>${balance.toFixed(2)}</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity 
            style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowAddFunds(true)}
          >
            <Ionicons name="add" size={20} color={theme.isDark ? theme.primary : '#fff'} />
            <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowSendMoney(true)}
          >
            <Ionicons name="arrow-up" size={20} color={theme.isDark ? theme.primary : '#fff'} />
            <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowTransactionHistory(true)}
          >
            <Ionicons name="list" size={20} color={theme.isDark ? theme.primary : '#fff'} />
            <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowQRCode(true)}
        >
          <Ionicons name="qr-code" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowPaymentMethods(true)}
        >
          <Ionicons name="card" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Cards</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowInsights(true)}
        >
          <Ionicons name="analytics" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => Alert.alert('Help', 'Contact support at help@m1a.com or call 1-800-M1A-HELP')}
        >
          <Ionicons name="help-circle" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => setShowTransactionHistory(true)}>
            <Text style={[styles.sectionAction, { color: theme.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={transactions.slice(0, 3)}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          scrollEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="No transactions yet"
              message="Your transaction history will appear here once you make your first payment or receive funds."
              actionLabel="Add Funds"
              onAction={() => setShowAddFunds(true)}
            />
          }
        />
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Payment Methods</Text>
          <TouchableOpacity>
            <Text style={[styles.sectionAction, { color: theme.primary }]}>Manage</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={paymentMethods}
          keyExtractor={(item) => item.id}
          renderItem={renderPaymentMethod}
          scrollEnabled={false}
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title="No payment methods"
              message="Add a payment method to make purchases and add funds to your wallet."
              actionLabel="Add Payment Method"
              onAction={() => setShowPaymentMethods(true)}
            />
          }
        />
      </View>

      {/* Add Funds Modal */}
      <Modal
        visible={showAddFunds}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowAddFunds(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Funds</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Payment Method</Text>
              <TouchableOpacity 
                style={[styles.paymentMethodSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setShowPaymentMethods(true)}
              >
                <Text style={[styles.paymentMethodText, { color: selectedPaymentMethod ? theme.text : theme.subtext }]}>
                  {selectedPaymentMethod ? selectedPaymentMethod.name : 'Select Payment Method'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="0.00"
                placeholderTextColor={theme.subtext}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.quickAmounts}>
              <TouchableOpacity 
                style={[styles.quickAmountButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setAmount('50')}
              >
                <Text style={[styles.quickAmountText, { color: theme.text }]}>$50</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickAmountButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setAmount('100')}
              >
                <Text style={[styles.quickAmountText, { color: theme.text }]}>$100</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickAmountButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setAmount('250')}
              >
                <Text style={[styles.quickAmountText, { color: theme.text }]}>$250</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickAmountButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => setAmount('500')}
              >
                <Text style={[styles.quickAmountText, { color: theme.text }]}>$500</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                { 
                  backgroundColor: processing ? theme.subtext : theme.primary,
                  opacity: processing ? 0.6 : 1,
                }
              ]}
              onPress={handleAddFunds}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Add Funds</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Send Money Modal */}
      <Modal
        visible={showSendMoney}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowSendMoney(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Send Money</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Recipient</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="Enter email or phone"
                placeholderTextColor={theme.subtext}
                value={recipient}
                onChangeText={setRecipient}
              />
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[styles.amountInput, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="0.00"
                placeholderTextColor={theme.subtext}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                { 
                  backgroundColor: processing ? theme.subtext : theme.primary,
                  opacity: processing ? 0.6 : 1,
                }
              ]}
              onPress={handleSendMoney}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Send Money</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Transaction History Modal */}
      <Modal
        visible={showTransactionHistory}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowTransactionHistory(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Transaction History</Text>
            <View style={{ width: 60 }} />
          </View>

          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={styles.transactionList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="receipt-outline"
                title="No transactions yet"
                message="Your transaction history will appear here once you make your first payment or receive funds."
                actionLabel="Add Funds"
                onAction={() => {
                  setShowTransactionHistory(false);
                  setShowAddFunds(true);
                }}
              />
            }
          />
        </SafeAreaView>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        visible={showQRCode}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowQRCode(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>QR Code</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.qrContent} contentContainerStyle={styles.qrContentContainer}>
            <View style={styles.qrContainer}>
              <View style={[styles.qrCodeWrapper, { backgroundColor: '#fff', borderColor: theme.border }]}>
                {qrCodeData ? (
                  <QRCode
                    value={qrCodeData}
                    size={250}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                ) : (
                  <ActivityIndicator size="large" color={theme.primary} />
                )}
              </View>
              <Text style={[styles.qrSubtext, { color: theme.subtext, marginTop: 16 }]}>
                Scan to send money to this wallet
              </Text>
              <Text style={[styles.qrWalletId, { color: theme.text }]}>
                Wallet ID: {user?.uid?.substring(0, 8)}...
              </Text>
              
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: theme.primary }]}
                onPress={handleShareQRCode}
              >
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share QR Code</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.qrInfoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="information-circle" size={24} color={theme.primary} />
              <Text style={[styles.qrInstructions, { color: theme.text }]}>
                Share this QR code with others to receive money directly to your wallet. They can scan it with the M1A app to send you funds instantly.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Methods Modal */}
      <Modal
        visible={showPaymentMethods}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowPaymentMethods(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Payment Methods</Text>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                'Add Payment Method',
                'To add a payment method, you can add it during checkout or in your account settings. For now, payment methods are managed through Stripe.',
                [{ text: 'OK' }]
              );
              trackButtonClick('add_payment_method_info', 'WalletScreen');
            }}>
              <Text style={[styles.modalAction, { color: theme.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={paymentMethods}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.paymentMethodItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <TouchableOpacity 
                  style={styles.paymentMethodContentWrapper}
                  onPress={() => {
                    setSelectedPaymentMethod(item);
                    setShowPaymentMethods(false);
                  }}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Ionicons name={item.icon || 'card'} size={24} color={theme.primary} />
                  </View>
                  <View style={styles.paymentMethodContent}>
                    <Text style={[styles.paymentMethodName, { color: theme.text }]}>{item.name}</Text>
                    {item.expiry && (
                      <Text style={[styles.paymentMethodExpiry, { color: theme.subtext }]}>Expires {item.expiry}</Text>
                    )}
                    {item.brand && (
                      <Text style={[styles.paymentMethodExpiry, { color: theme.subtext }]}>{item.brand}</Text>
                    )}
                  </View>
                  {item.isDefault && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  )}
                  {selectedPaymentMethod?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
                
                <View style={styles.paymentMethodActions}>
                  {!item.isDefault && (
                    <TouchableOpacity
                      style={[styles.paymentMethodActionButton, { backgroundColor: theme.primary + '20' }]}
                      onPress={() => handleSetDefaultPaymentMethod(item)}
                      disabled={processing}
                    >
                      <Ionicons name="star-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.paymentMethodActionButton, { backgroundColor: theme.error + '20' }]}
                    onPress={() => handleDeletePaymentMethod(item)}
                    disabled={deletingPaymentMethod === item.id}
                  >
                    {deletingPaymentMethod === item.id ? (
                      <ActivityIndicator size="small" color={theme.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.paymentMethodList}
            ListEmptyComponent={
              <EmptyState
                icon="card-outline"
                title="No payment methods"
                message="Add a payment method to make purchases and add funds to your wallet."
                actionLabel="Learn More"
                onAction={() => {
                  Alert.alert(
                    'Add Payment Method',
                    'Payment methods can be added during checkout or through your account settings. They are securely stored with Stripe.',
                    [{ text: 'OK' }]
                  );
                }}
              />
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Insights Modal */}
      <Modal
        visible={showInsights}
        animationType="slide"
        presentationStyle="pageSheet"
        onShow={loadInsights}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowInsights(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Wallet Insights</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView 
            style={styles.insightsContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
            }
          >
            {insights ? (
              <>
                <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={[styles.insightTitle, { color: theme.text }]}>This Month</Text>
                  <View style={styles.insightRow}>
                    <Text style={[styles.insightLabel, { color: theme.subtext }]}>Total Received</Text>
                    <Text style={[styles.insightValue, { color: theme.success }]}>
                      +${insights.totalReceived.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={[styles.insightLabel, { color: theme.subtext }]}>Total Sent</Text>
                    <Text style={[styles.insightValue, { color: theme.error }]}>
                      -${insights.totalSent.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={[styles.insightLabel, { color: theme.subtext }]}>Net Change</Text>
                    <Text style={[
                      styles.insightValue, 
                      { color: insights.netChange >= 0 ? theme.success : theme.error }
                    ]}>
                      {insights.netChange >= 0 ? '+' : ''}${insights.netChange.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.insightRow}>
                    <Text style={[styles.insightLabel, { color: theme.subtext }]}>Transactions</Text>
                    <Text style={[styles.insightValue, { color: theme.text }]}>
                      {insights.transactionCount}
                    </Text>
                  </View>
                </View>

                {insights.topCategories.length > 0 && (
                  <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                    <Text style={[styles.insightTitle, { color: theme.text }]}>Top Categories</Text>
                    {insights.topCategories.map((category, index) => (
                      <View key={index} style={styles.insightRow}>
                        <Text style={[styles.insightLabel, { color: theme.subtext }]}>
                          {category.name}
                        </Text>
                        <Text style={[styles.insightValue, { color: theme.text }]}>
                          ${category.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={[styles.insightCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={[styles.insightTitle, { color: theme.text }]}>Activity Summary</Text>
                  <Text style={[styles.insightText, { color: theme.subtext }]}>
                    You've completed {insights.transactionCount} transaction{insights.transactionCount !== 1 ? 's' : ''} this month.
                    {insights.netChange > 0 && ` Your balance has increased by $${insights.netChange.toFixed(2)}.`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading insights...</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActionButton: {
    padding: 8,
  },
  
  // Balance card styles
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  balanceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  balanceActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  
  // Quick actions styles
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  
  // Section styles
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Transaction styles
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 14,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingText: {
    fontSize: 12,
    marginTop: 2,
  },
  
  // Payment method styles
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  paymentMethodContentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentMethodExpiry: {
    fontSize: 14,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  
  // Input styles
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Quick amounts styles
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Button styles
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Transaction list styles
  transactionList: {
    padding: 20,
  },
  
  // Payment method selector styles
  paymentMethodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  paymentMethodText: {
    fontSize: 16,
  },
  
  // QR Code styles
  qrContent: {
    flex: 1,
  },
  qrContentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    width: '100%',
  },
  qrCodeWrapper: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrWalletId: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  qrInfoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    gap: 12,
  },
  qrCode: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCode: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  qrSubtext: {
    fontSize: 12,
  },
  qrInstructions: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Payment method list styles
  paymentMethodList: {
    padding: 20,
  },
  
  // Modal action styles
  modalAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Insights styles
  insightsContent: {
    flex: 1,
    padding: 20,
  },
  insightCard: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 16,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
