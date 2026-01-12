import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { collection, limit as firestoreLimit, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../components/EmptyState';
import {
  ENABLE_ADD_FUNDS,
  ENABLE_CASH_OUT,
  ENABLE_SEND_MONEY,
  ENABLE_WALLET_BALANCE,
  ENABLE_WALLET_QR_CODE
} from '../constants/featureFlags';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWallet } from '../contexts/WalletContext';
import { db } from '../firebase';
import useScreenTracking from '../hooks/useScreenTracking';
import { trackButtonClick, trackWalletTransaction } from '../services/AnalyticsService';
import GoogleDriveService from '../services/GoogleDriveService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import StripePaymentMethodsService from '../services/StripePaymentMethodsService';
import WalletService from '../services/WalletService';

export default function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { balance, loading: balanceLoading, refreshing: balanceRefreshing, refreshBalance, updateBalance: updateWalletBalance } = useWallet();
  useScreenTracking('WalletScreen');
  
  // Check if we can go back (i.e., accessed from drawer)
  const canGoBack = navigation.canGoBack();
  const [lastUpdated, setLastUpdated] = useState(null);
  const [balanceChange, setBalanceChange] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showSendMoney, setShowSendMoney] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientUser, setRecipientUser] = useState(null);
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [insights, setInsights] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState(null);
  const [qrCodeData, setQrCodeData] = useState('');
  const [error, setError] = useState(null);
  const [transactionFilter, setTransactionFilter] = useState('all'); // all, sent, received, withdrawals
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' or 'content'
  const [contentLibrary, setContentLibrary] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [contentSource, setContentSource] = useState('firestore'); // 'firestore' or 'googledrive'
  const [showFolderIdModal, setShowFolderIdModal] = useState(false);
  const [folderIdInput, setFolderIdInput] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);

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

  useEffect(() => {
    if (user?.uid && activeTab === 'content') {
      checkGoogleDriveConnection();
      loadContentLibrary();
    }
  }, [user?.uid, activeTab]);

  // Refresh balance when screen is focused (e.g., after admin adjustment)
  useFocusEffect(
    useCallback(() => {
      if (user?.uid && ENABLE_WALLET_BALANCE) {
        // Refresh balance from WalletContext when screen comes into focus
        refreshBalance(user.uid);
      }
    }, [user?.uid, refreshBalance])
  );

  const checkGoogleDriveConnection = useCallback(async () => {
    try {
      const connected = await GoogleDriveService.isConnected();
      setGoogleDriveConnected(connected);
      
      // Also get current folder ID if connected
      if (connected && user?.uid) {
        const folderId = await GoogleDriveService.getClientFolderId(user.uid);
        setCurrentFolderId(folderId);
        if (folderId) {
          setFolderIdInput(folderId);
        }
      }
    } catch (error) {
      console.error('Error checking Google Drive connection:', error);
      setGoogleDriveConnected(false);
    }
  }, [user?.uid]);

  const loadWalletData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let loadingTimeout;
    try {
      setLoading(true);
      
      // Set a timeout to ensure loading never gets stuck
      loadingTimeout = setTimeout(() => {
        console.warn('Wallet data loading timeout - forcing loading to false');
        setLoading(false);
        setRefreshing(false);
      }, 10000); // 10 second timeout
      
      // Load transactions and payment methods in parallel
      // Balance is managed by WalletContext
      const loadPromises = [
        WalletService.getTransactions(user.uid).catch(err => {
          console.error('Error loading transactions:', err);
          return [];
        }),
        WalletService.getPaymentMethods(user.uid).catch(err => {
          console.error('Error loading payment methods:', err);
          return [];
        }),
      ];
      
      // Refresh balance from context (it will handle loading state)
      // Don't await this - let it run in parallel and not block the UI
      if (ENABLE_WALLET_BALANCE) {
        refreshBalance(user.uid).then(() => {
          // Update last updated timestamp after balance loads
          setLastUpdated('just now');
          setTimeout(() => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            setLastUpdated(`at ${timeStr}`);
          }, 3000);
        }).catch(err => {
          console.error('Error refreshing balance:', err);
        });
      }
      
      // Use Promise.allSettled to ensure we always resolve, even if one fails
      const results = await Promise.allSettled(loadPromises);
      const walletTransactions = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
      const walletPaymentMethods = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
      
      // Use real transactions from WalletService (no mock fallback)
      setTransactions(walletTransactions);
      // Use real payment methods from WalletService (no mock fallback)
      setPaymentMethods(walletPaymentMethods);
      setSelectedPaymentMethod(
        walletPaymentMethods?.find(pm => pm.isDefault) || null
      );
    } catch (error) {
      console.error('Error loading wallet data:', error);
      // Show empty state instead of mock data
      // Balance is managed by WalletContext, no need to set it here
      setTransactions([]);
      setPaymentMethods([]);
      setSelectedPaymentMethod(null);
    } finally {
      // Always set loading to false, even if there's an error
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, refreshBalance]);

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

  const loadContentLibrary = useCallback(async () => {
    if (!user?.uid) {
      setLoadingContent(false);
      return;
    }

    try {
      setLoadingContent(true);
      const contentItems = [];

      // Try to load from Google Drive first if connected
      if (googleDriveConnected) {
        try {
          const folderId = await GoogleDriveService.getClientFolderId(user.uid);
          if (folderId) {
            const driveFiles = await GoogleDriveService.listFiles(user.uid, folderId);
            
            driveFiles.forEach((file) => {
              contentItems.push({
                id: file.id,
                type: file.type,
                url: file.downloadUrl || file.webViewLink,
                thumbnail: file.thumbnailUrl,
                title: file.name,
                createdAt: file.modifiedTime ? new Date(file.modifiedTime) : new Date(),
                clientId: user.uid,
                clientName: user.displayName || user.email,
                source: 'googledrive',
                fileId: file.id,
                mimeType: file.mimeType,
                size: file.size,
              });
            });
            
            setContentSource('googledrive');
          }
        } catch (driveError) {
          console.error('Error loading from Google Drive:', driveError);
          // Fall back to Firestore
        }
      }

      // Also load from Firestore posts (merge with Google Drive content)
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          firestoreLimit(50)
        );

        const postsSnapshot = await getDocs(postsQuery);

        postsSnapshot.docs.forEach((doc) => {
          const postData = doc.data();
          
          // Extract media from posts
          if (postData.videoUrl) {
            contentItems.push({
              id: doc.id,
              type: 'video',
              url: postData.videoUrl,
              thumbnail: postData.thumbnailUrl,
              title: postData.caption || 'Video',
              createdAt: postData.createdAt?.toDate?.() || new Date(postData.createdAt?.seconds * 1000) || new Date(),
              clientId: postData.userId,
              clientName: postData.userDisplayName || user.displayName || user.email,
              source: 'firestore',
            });
          }
          
          if (postData.audioUrl) {
            contentItems.push({
              id: `${doc.id}_audio`,
              type: 'audio',
              url: postData.audioUrl,
              thumbnail: postData.thumbnailUrl,
              title: postData.caption || 'Audio',
              createdAt: postData.createdAt?.toDate?.() || new Date(postData.createdAt?.seconds * 1000) || new Date(),
              clientId: postData.userId,
              clientName: postData.userDisplayName || user.displayName || user.email,
              source: 'firestore',
            });
          }
          
          if (postData.imageUrl) {
            contentItems.push({
              id: `${doc.id}_image`,
              type: 'image',
              url: postData.imageUrl,
              thumbnail: postData.imageUrl,
              title: postData.caption || 'Image',
              createdAt: postData.createdAt?.toDate?.() || new Date(postData.createdAt?.seconds * 1000) || new Date(),
              clientId: postData.userId,
              clientName: postData.userDisplayName || user.displayName || user.email,
              source: 'firestore',
            });
          }
        });
      } catch (firestoreError) {
        console.error('Error loading from Firestore:', firestoreError);
      }

      // Sort by creation date (newest first)
      contentItems.sort((a, b) => b.createdAt - a.createdAt);
      
      setContentLibrary(contentItems);
    } catch (error) {
      console.error('Error loading content library:', error);
      setContentLibrary([]);
    } finally {
      setLoadingContent(false);
    }
  }, [user?.uid, user?.displayName, user?.email, googleDriveConnected]);

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
                // Update balance optimistically
                updateWalletBalance(newAmount);
                setLastUpdated('just now');
                setBalanceChange({ type: 'increase', amount: newAmount });
                setTimeout(() => setBalanceChange(null), 3000);
                
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
                
                // Reload wallet data (transactions, payment methods)
                // Balance is managed by WalletContext, refresh it
                await refreshBalance(user.uid);
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

  const handleRecipientSearch = useCallback(async (searchText) => {
    setRecipient(searchText);
    setError(null);
    
    if (!searchText || searchText.length < 3) {
      setRecipientUser(null);
      return;
    }
    
    try {
      setSearchingRecipient(true);
      const foundUser = await WalletService.lookupUser(searchText);
      
      if (foundUser) {
        setRecipientUser(foundUser);
        setError(null);
      } else {
        setRecipientUser(null);
        if (searchText.length >= 3) {
          setError('User not found. Please check the email, phone, or username.');
        }
      }
    } catch (error) {
      console.error('Error searching recipient:', error);
      setRecipientUser(null);
      setError('Error searching for user. Please try again.');
    } finally {
      setSearchingRecipient(false);
    }
  }, []);

  const handleSendMoney = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to send money');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!recipientUser) {
      setError('Please select a valid recipient');
      return;
    }
    
    const sendAmount = parseFloat(amount);
    if (sendAmount > balance) {
      setError('Insufficient funds');
      return;
    }
    
    if (sendAmount < 0.01) {
      setError('Minimum amount is $0.01');
      return;
    }
    
    try {
      setProcessing(true);
      setError(null);
      
      // Send money via WalletService
      const result = await WalletService.sendMoney(
        user.uid,
        recipientUser.uid,
        sendAmount,
        `Sent to ${recipientUser.displayName || recipientUser.email || recipient}`
      );

      if (result.success) {
        // Update balance optimistically
        updateWalletBalance(-sendAmount);
        setLastUpdated('just now');
        setBalanceChange({ type: 'decrease', amount: sendAmount });
        setTimeout(() => setBalanceChange(null), 3000);
        
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
        
        // Reload wallet data (transactions, payment methods)
        // Balance is managed by WalletContext, refresh it
        await refreshBalance(user.uid);
        await loadWalletData();
        setAmount('');
        setRecipient('');
        setRecipientUser(null);
        setError(null);
        setShowSendMoney(false);
        Alert.alert('Success', `$${sendAmount.toFixed(2)} sent to ${recipientUser.displayName || recipientUser.email || recipient}!`);
      } else {
        throw new Error('Failed to send money');
      }
    } catch (error) {
      console.error('Error sending money:', error);
      setError(error.message || 'Failed to send money. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCashOut = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'Please log in to cash out');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    
    if (!selectedPaymentMethod) {
      setError('Please select a bank account');
      return;
    }
    
    const cashOutAmount = parseFloat(amount);
    if (cashOutAmount > balance) {
      setError('Insufficient funds');
      return;
    }
    
    if (cashOutAmount < 10) {
      setError('Minimum withdrawal amount is $10');
      return;
    }
    
    Alert.alert(
      'Cash Out',
      `Withdraw $${cashOutAmount.toFixed(2)} to your bank account? Processing may take 1-3 business days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setProcessing(true);
              setError(null);
              
              const result = await WalletService.cashOut(
                user.uid,
                cashOutAmount,
                selectedPaymentMethod.id,
                {
                  paymentMethod: selectedPaymentMethod.name,
                }
              );

              if (result.success) {
                // Track analytics
                await trackWalletTransaction({
                  type: 'withdrawal',
                  amount: -cashOutAmount,
                });
                trackButtonClick('cash_out', 'WalletScreen');
                
                // Reload wallet data
                await loadWalletData();
                setAmount('');
                setShowCashOut(false);
                Alert.alert(
                  'Withdrawal Submitted',
                  result.message || 'Your withdrawal request has been submitted. Funds will be transferred within 1-3 business days.'
                );
              } else {
                throw new Error('Failed to process withdrawal');
              }
            } catch (error) {
              console.error('Error cashing out:', error);
              setError(error.message || 'Failed to process withdrawal. Please try again.');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }) => {
    // Determine icon based on transaction type
    let iconName = item.icon || 'card';
    if (item.type === 'withdrawal') iconName = 'arrow-down';
    if (item.type === 'received') iconName = item.icon || 'arrow-down';
    if (item.type === 'sent') iconName = item.icon || 'arrow-up';
    
    // Determine color based on status
    let statusColor = theme.subtext;
    if (item.status === 'completed') statusColor = theme.success;
    if (item.status === 'pending' || item.status === 'processing') statusColor = theme.warning;
    if (item.status === 'failed') statusColor = theme.error;
    
    return (
      <View style={[styles.transactionItem, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <View style={[styles.transactionIcon, { backgroundColor: item.type === 'received' ? theme.success + '20' : item.type === 'withdrawal' ? theme.warning + '20' : theme.error + '20' }]}>
          <Ionicons 
            name={iconName} 
            size={20} 
            color={item.type === 'received' ? theme.success : item.type === 'withdrawal' ? theme.warning : theme.error} 
          />
        </View>
        
        <View style={styles.transactionContent}>
          <Text style={[styles.transactionDescription, { color: theme.text }]}>{item.description}</Text>
          <Text style={[styles.transactionTime, { color: theme.subtext }]}>{formatTime(item.timestamp)}</Text>
          {item.status && item.status !== 'completed' && (
            <Text style={[styles.transactionStatus, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          )}
        </View>
        
        <View style={styles.transactionAmount}>
          <Text style={[
            styles.transactionAmountText, 
            { color: item.type === 'received' ? theme.success : item.type === 'withdrawal' ? theme.warning : theme.error }
          ]}>
            {item.type === 'received' ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header with conditional Back Button */}
      {canGoBack && (
        <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.topHeaderTitle, { color: theme.text }]}>
            {ENABLE_WALLET_BALANCE ? 'Wallet' : 'Payments'}
          </Text>
          <View style={styles.headerRight} />
        </View>
      )}

      {/* Header */}
      {!canGoBack && (
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {ENABLE_WALLET_BALANCE ? 'Wallet' : 'Payments'}
          </Text>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('M1ASettings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Balance Card - Only show if wallet features are enabled */}
      {ENABLE_WALLET_BALANCE && (
        <View style={[styles.balanceCard, { 
          backgroundColor: theme.isDark ? '#1a1a1a' : theme.primary,
          shadowColor: theme.primary,
        }]}>
          {/* Header with refresh indicator */}
          <View style={styles.balanceHeader}>
            <View style={styles.balanceHeaderLeft}>
              <Ionicons 
                name="wallet" 
                size={20} 
                color={theme.isDark ? theme.primary : 'rgba(255,255,255,0.9)'} 
              />
              <Text style={[styles.balanceLabel, { color: theme.isDark ? theme.primary : 'rgba(255,255,255,0.9)' }]}>
                Total Balance
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => refreshBalance(user.uid)}
              disabled={balanceRefreshing}
              style={styles.refreshButton}
            >
              {balanceRefreshing ? (
                <ActivityIndicator size="small" color={theme.isDark ? theme.primary : '#fff'} />
              ) : (
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={theme.isDark ? theme.primary : 'rgba(255,255,255,0.9)'} 
                />
              )}
            </TouchableOpacity>
          </View>

          {/* Balance Amount with loading indicator */}
          <View style={styles.balanceAmountContainer}>
            {balanceLoading && balance === 0 ? (
              <ActivityIndicator size="large" color={theme.isDark ? theme.primary : '#fff'} />
            ) : (
              <>
                <Text style={[styles.balanceAmount, { color: theme.isDark ? theme.primary : '#fff' }]}>
                  ${typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
                </Text>
                {/* Sync status indicator */}
                <View style={styles.syncIndicator}>
                  <View style={[styles.syncDot, { 
                    backgroundColor: balanceRefreshing ? '#FFA500' : '#4CAF50',
                    shadowColor: balanceRefreshing ? '#FFA500' : '#4CAF50',
                  }]} />
                  <Text style={[styles.syncText, { color: theme.isDark ? theme.primary : 'rgba(255,255,255,0.7)' }]}>
                    {balanceRefreshing ? 'Updating...' : 'Synced'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Last updated timestamp */}
          {lastUpdated && (
            <Text style={[styles.lastUpdatedText, { color: theme.isDark ? theme.primary : 'rgba(255,255,255,0.6)' }]}>
              Updated {lastUpdated}
            </Text>
          )}
          <View style={styles.balanceActions}>
            {ENABLE_ADD_FUNDS && (
              <TouchableOpacity 
                style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setError(null);
                  setShowAddFunds(true);
                }}
              >
                <Ionicons name="add" size={20} color={theme.isDark ? theme.primary : '#fff'} />
                <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>Add</Text>
              </TouchableOpacity>
            )}
            {ENABLE_SEND_MONEY && (
              <TouchableOpacity 
                style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setError(null);
                  setRecipientUser(null);
                  setShowSendMoney(true);
                }}
              >
                <Ionicons name="arrow-up" size={20} color={theme.isDark ? theme.primary : '#fff'} />
                <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>Send</Text>
              </TouchableOpacity>
            )}
            {ENABLE_CASH_OUT && (
              <TouchableOpacity 
                style={[styles.balanceActionButton, { backgroundColor: theme.isDark ? theme.primary + '20' : 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setError(null);
                  setShowCashOut(true);
                }}
              >
                <Ionicons name="arrow-down" size={20} color={theme.isDark ? theme.primary : '#fff'} />
                <Text style={[styles.balanceActionText, { color: theme.isDark ? theme.primary : '#fff' }]}>Cash Out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {ENABLE_WALLET_QR_CODE && (
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowQRCode(true)}
          >
            <Ionicons name="qr-code" size={24} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>QR Code</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => setShowPaymentMethods(true)}
        >
          <Ionicons name="card" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Cards</Text>
        </TouchableOpacity>
        {ENABLE_WALLET_BALANCE && (
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => setShowInsights(true)}
          >
            <Ionicons name="analytics" size={24} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Insights</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={() => Alert.alert('Help', 'Contact support at help@m1a.com or call 1-800-M1A-HELP')}
        >
          <Ionicons name="help-circle" size={24} color={theme.primary} />
          <Text style={[styles.quickActionText, { color: theme.text }]}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'transactions' && [styles.activeTab, { borderBottomColor: theme.primary }]
          ]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'transactions' ? theme.primary : theme.subtext }
          ]}>
            Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'content' && [styles.activeTab, { borderBottomColor: theme.primary }]
          ]}
          onPress={() => setActiveTab('content')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'content' ? theme.primary : theme.subtext }
          ]}>
            Content Library
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loadingContent}
            onRefresh={() => {
              if (activeTab === 'transactions') {
                onRefresh();
              } else {
                loadContentLibrary();
              }
            }}
            tintColor={theme.primary}
          />
        }
      >
        {activeTab === 'transactions' ? (
          <>
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
                    message={ENABLE_WALLET_BALANCE 
                      ? "Your transaction history will appear here once you make your first payment or receive funds."
                      : "Your transaction history will appear here once you make your first payment."}
                    actionLabel={ENABLE_ADD_FUNDS ? "Add Funds" : undefined}
                    onAction={ENABLE_ADD_FUNDS ? () => setShowAddFunds(true) : undefined}
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
                    message={ENABLE_WALLET_BALANCE 
                      ? "Add a payment method to make purchases and add funds to your wallet."
                      : "Add a payment method to make purchases."}
                    actionLabel="Add Payment Method"
                    onAction={() => setShowPaymentMethods(true)}
                  />
                }
              />
            </View>
          </>
        ) : (
          /* Content Library */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Content</Text>
              <View style={styles.sectionHeaderRight}>
                {!googleDriveConnected ? (
                  <TouchableOpacity
                    style={[styles.connectButton, { backgroundColor: theme.primary }]}
                    onPress={async () => {
                      try {
                        const oauthUrl = GoogleDriveService.getOAuthUrl();
                        await Linking.openURL(oauthUrl);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to connect Google Drive. Please check your configuration.');
                      }
                    }}
                  >
                    <Ionicons name="cloud-upload" size={16} color="#fff" />
                    <Text style={styles.connectButtonText}>Connect Drive</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.settingsButton, { borderColor: theme.border }]}
                    onPress={() => setShowFolderIdModal(true)}
                  >
                    <Ionicons name="folder-outline" size={16} color={theme.primary} />
                    <Text style={[styles.settingsButtonText, { color: theme.primary }]}>
                      {currentFolderId ? 'Change Folder' : 'Set Folder'}
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
                  {contentLibrary.length} items
                </Text>
              </View>
            </View>
            
            {loadingContent ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Loading content...</Text>
              </View>
            ) : contentLibrary.length === 0 ? (
              <EmptyState
                icon="library-outline"
                title="No content yet"
                message="Your videos, audio, and images from Merkaba will appear here."
              />
            ) : (
              <View style={styles.contentGrid}>
                {contentLibrary.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.contentItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                    onPress={() => {
                      if (item.source === 'googledrive') {
                        // Download Google Drive file
                        Alert.alert(
                          item.title,
                          `Download this file from Google Drive?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Download',
                              onPress: async () => {
                                try {
                                  await GoogleDriveService.downloadFile(item.fileId, item.title);
                                } catch (error) {
                                  Alert.alert('Error', `Failed to download: ${error.message}`);
                                }
                              },
                            },
                          ]
                        );
                      } else {
                        // Open media viewer or play media
                        Alert.alert(item.title, `Type: ${item.type}\nClient: ${item.clientName}`);
                      }
                    }}
                  >
                    {item.type === 'video' ? (
                      <View style={styles.mediaContainer}>
                        {item.thumbnail ? (
                          <Image source={{ uri: item.thumbnail }} style={styles.mediaThumbnail} />
                        ) : (
                          <View style={[styles.mediaPlaceholder, { backgroundColor: theme.border }]}>
                            <Ionicons name="videocam" size={32} color={theme.subtext} />
                          </View>
                        )}
                        <View style={styles.playOverlay}>
                          <Ionicons name="play-circle" size={40} color="#fff" />
                        </View>
                      </View>
                    ) : item.type === 'audio' ? (
                      <View style={[styles.mediaContainer, styles.audioContainer]}>
                        <View style={[styles.mediaPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                          <Ionicons name="musical-notes" size={32} color={theme.primary} />
                        </View>
                      </View>
                    ) : item.type === 'image' ? (
                      item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.mediaThumbnail} />
                      ) : (
                        <View style={[styles.mediaPlaceholder, { backgroundColor: theme.border }]}>
                          <Ionicons name="image" size={32} color={theme.subtext} />
                        </View>
                      )
                    ) : (
                      <View style={[styles.mediaContainer, styles.audioContainer]}>
                        <View style={[styles.mediaPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                          <Ionicons 
                            name={GoogleDriveService.getFileTypeIcon(item.mimeType)} 
                            size={32} 
                            color={theme.primary} 
                          />
                        </View>
                      </View>
                    )}
                    {item.source === 'googledrive' && (
                      <View style={styles.driveBadge}>
                        <Ionicons name="cloud" size={12} color="#fff" />
                      </View>
                    )}
                    <View style={styles.contentInfo}>
                      <Text style={[styles.contentTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[styles.contentMeta, { color: theme.subtext }]} numberOfLines={1}>
                        {item.clientName}
                      </Text>
                      <View style={styles.contentFooter}>
                        <Text style={[styles.contentDate, { color: theme.subtext }]}>
                          {item.createdAt.toLocaleDateString()}
                        </Text>
                        {item.size && (
                          <Text style={[styles.contentSize, { color: theme.subtext }]}>
                            {GoogleDriveService.formatFileSize(item.size)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Google Drive Folder ID Modal */}
      <Modal
        visible={showFolderIdModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowFolderIdModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Google Drive Folder</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>
                How to Get Your Folder ID
              </Text>
              <Text style={[styles.modalSectionText, { color: theme.subtext }]}>
                1. Open Google Drive in your browser{'\n'}
                2. Navigate to your folder{'\n'}
                3. Copy the URL from your browser{'\n'}
                4. The folder ID is the long string after /folders/{'\n\n'}
                Example:{'\n'}
                https://drive.google.com/drive/folders/
                <Text style={{ fontWeight: 'bold', color: theme.primary }}>
                  1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc
                </Text>
                {'\n\n'}
                The folder ID is: <Text style={{ fontWeight: 'bold' }}>1h1boe5vSWXWUHVWj2BS9hDqe2qPxmSNc</Text>
              </Text>
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Folder ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
                value={folderIdInput}
                onChangeText={setFolderIdInput}
                placeholder="Paste folder ID here"
                placeholderTextColor={theme.subtext}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {currentFolderId && (
                <Text style={[styles.helperText, { color: theme.subtext }]}>
                  Current folder ID: {currentFolderId}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={async () => {
                if (!folderIdInput.trim()) {
                  Alert.alert('Error', 'Please enter a folder ID');
                  return;
                }

                try {
                  setProcessing(true);
                  await GoogleDriveService.setClientFolderId(user.uid, folderIdInput.trim());
                  setCurrentFolderId(folderIdInput.trim());
                  setShowFolderIdModal(false);
                  Alert.alert('Success', 'Folder ID set successfully! Pull to refresh to see files.');
                  loadContentLibrary();
                } catch (error) {
                  Alert.alert('Error', `Failed to set folder ID: ${error.message}`);
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Set Folder ID</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Funds Modal - Only accessible if feature is enabled */}
      {ENABLE_ADD_FUNDS && (
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
      )}

      {/* Send Money Modal - Only accessible if feature is enabled */}
      {ENABLE_SEND_MONEY && (
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
              <View style={styles.recipientSearchContainer}>
                <TextInput
                  style={[
                    styles.textInput, 
                    { 
                      backgroundColor: theme.cardBackground, 
                      color: theme.text, 
                      borderColor: recipientUser ? theme.success : error ? theme.error : theme.border,
                      flex: 1,
                    }
                  ]}
                  placeholder="Enter email, phone, or username"
                  placeholderTextColor={theme.subtext}
                  value={recipient}
                  onChangeText={handleRecipientSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchingRecipient && (
                  <ActivityIndicator size="small" color={theme.primary} style={styles.searchIndicator} />
                )}
                {recipientUser && !searchingRecipient && (
                  <Ionicons name="checkmark-circle" size={24} color={theme.success} style={styles.searchIndicator} />
                )}
              </View>
              {recipientUser && (
                <View style={[styles.recipientCard, { backgroundColor: theme.cardBackground, borderColor: theme.success }]}>
                  <Ionicons name="person-circle" size={40} color={theme.primary} />
                  <View style={styles.recipientInfo}>
                    <Text style={[styles.recipientName, { color: theme.text }]}>
                      {recipientUser.displayName || recipientUser.username || 'User'}
                    </Text>
                    <Text style={[styles.recipientEmail, { color: theme.subtext }]}>
                      {recipientUser.email || recipientUser.phoneNumber || ''}
                    </Text>
                  </View>
                </View>
              )}
              {error && !recipientUser && recipient.length >= 3 && (
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              )}
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
                  backgroundColor: (processing || !recipientUser || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance) 
                    ? theme.subtext 
                    : theme.primary,
                  opacity: (processing || !recipientUser || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance) 
                    ? 0.6 
                    : 1,
                }
              ]}
              onPress={handleSendMoney}
              disabled={processing || !recipientUser || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
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
      )}

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

          <View style={[styles.filterContainer, { borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['all', 'received', 'sent', 'withdrawals'].map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterButton,
                    {
                      backgroundColor: transactionFilter === filter ? theme.primary : theme.cardBackground,
                      borderColor: theme.border,
                    }
                  ]}
                  onPress={() => setTransactionFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      { color: transactionFilter === filter ? '#fff' : theme.text }
                    ]}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={transactions.filter(t => {
              if (transactionFilter === 'all') return true;
              if (transactionFilter === 'received') return t.type === 'received';
              if (transactionFilter === 'sent') return t.type === 'sent';
              if (transactionFilter === 'withdrawals') return t.type === 'withdrawal';
              return true;
            })}
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

      {/* QR Code Modal - Only accessible if feature is enabled */}
      {ENABLE_WALLET_QR_CODE && (
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
      )}

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
                    // If we came from cash out modal, return to it
                    if (showCashOut) {
                      setTimeout(() => setShowCashOut(true), 100);
                    }
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

      {/* Cash Out Modal - Only accessible if feature is enabled */}
      {ENABLE_CASH_OUT && (
      <Modal
        visible={showCashOut}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => {
              setShowCashOut(false);
              setError(null);
              setAmount('');
            }}>
              <Text style={[styles.modalCancel, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Cash Out</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={[styles.infoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="information-circle" size={24} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                Withdraw funds to your bank account. Processing typically takes 1-3 business days.
              </Text>
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Bank Account</Text>
              <TouchableOpacity 
                style={[styles.paymentMethodSelector, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  setShowPaymentMethods(true);
                  setShowCashOut(false);
                }}
              >
                <Text style={[styles.paymentMethodText, { color: selectedPaymentMethod ? theme.text : theme.subtext }]}>
                  {selectedPaymentMethod ? selectedPaymentMethod.name : 'Select Bank Account'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.subtext} />
              </TouchableOpacity>
              {!selectedPaymentMethod && (
                <Text style={[styles.helperText, { color: theme.subtext }]}>
                  Add a bank account in Payment Methods to cash out
                </Text>
              )}
            </View>

            <View style={[styles.inputContainer, { borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Amount</Text>
              <TextInput
                style={[
                  styles.amountInput, 
                  { 
                    backgroundColor: theme.cardBackground, 
                    color: theme.text, 
                    borderColor: error && amount ? theme.error : theme.border 
                  }
                ]}
                placeholder="0.00"
                placeholderTextColor={theme.subtext}
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  setError(null);
                }}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.helperText, { color: theme.subtext }]}>
                Minimum: $10.00 | Available: ${balance.toFixed(2)}
              </Text>
              {amount && parseFloat(amount) > balance && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  Insufficient funds. Available: ${balance.toFixed(2)}
                </Text>
              )}
              {amount && parseFloat(amount) < 10 && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  Minimum withdrawal amount is $10.00
                </Text>
              )}
              {error && amount && (
                <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
              )}
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
                onPress={() => setAmount(balance >= 500 ? '500' : balance.toFixed(2))}
              >
                <Text style={[styles.quickAmountText, { color: theme.text }]}>Max</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[
                styles.confirmButton, 
                { 
                  backgroundColor: (processing || !selectedPaymentMethod || !amount || parseFloat(amount) < 10 || parseFloat(amount) > balance) 
                    ? theme.subtext 
                    : theme.primary,
                  opacity: (processing || !selectedPaymentMethod || !amount || parseFloat(amount) < 10 || parseFloat(amount) > balance) 
                    ? 0.6 
                    : 1,
                }
              ]}
              onPress={handleCashOut}
              disabled={processing || !selectedPaymentMethod || !amount || parseFloat(amount) < 10 || parseFloat(amount) > balance}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Cash Out</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      )}

      {/* Insights Modal - Only accessible if wallet features are enabled */}
      {ENABLE_WALLET_BALANCE && (
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
      )}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Same width as back button to center title
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  
  // Balance card styles
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    padding: 28,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  balanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 4,
  },
  balanceLabel: {
    fontSize: 14,
    opacity: 0.9,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  balanceAmountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 60,
    justifyContent: 'center',
    width: '100%',
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -1,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  lastUpdatedText: {
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 4,
    width: '100%',
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  balanceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 100,
    justifyContent: 'center',
  },
  balanceActionText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  
  // Quick actions styles
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0.2,
  },
  
  // Section styles
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Transaction styles
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionContent: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  transactionTime: {
    fontSize: 13,
    opacity: 0.7,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  pendingText: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  
  // Payment method styles
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
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
  recipientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIndicator: {
    marginLeft: 8,
  },
  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 12,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recipientEmail: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Scroll content styles
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  // Content library styles
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  settingsButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  driveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
    zIndex: 1,
  },
  contentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  contentSize: {
    fontSize: 10,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalSectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 8,
  },
  contentItem: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  audioContainer: {
    aspectRatio: 1,
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentInfo: {
    padding: 12,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  contentDate: {
    fontSize: 11,
  },
  filterContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
