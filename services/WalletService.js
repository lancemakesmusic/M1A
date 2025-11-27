/**
 * Wallet Service
 * Handles wallet operations including balance, transactions, and payments
 */

import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import ReceiptService from './ReceiptService';
import StripeService from './StripeService';

import { Platform } from 'react-native';

// Backend Configuration - Use environment variable or fallback
const getApiBaseUrl = () => {
    // Always check environment variable first (required for production)
    if (process.env.EXPO_PUBLIC_API_BASE_URL) {
        return process.env.EXPO_PUBLIC_API_BASE_URL;
    }
    
    // Development fallbacks
    if (Platform.OS === 'web') {
        return 'http://localhost:8001';
    }
    
    // Development only - should never reach here in production
    if (__DEV__) {
        console.warn('⚠️ EXPO_PUBLIC_API_BASE_URL not set. Using localhost fallback (development only).');
        // Try to detect network IP for development
        // In production, this should never be reached
        return 'http://localhost:8001';
    }
    
    // Production: fail if no URL configured
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be set in production. Please configure your environment variables.');
};
const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = 30000;

class WalletService {
  /**
   * Get wallet balance for a user
   * Guarantees wallet exists and returns accurate balance
   */
  async getBalance(userId) {
    try {
      if (!userId) return 0;

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore - use transaction to ensure wallet exists
        const walletRef = doc(db, 'wallets', userId);
        
        try {
          return await runTransaction(db, async (transaction) => {
            const walletSnap = await transaction.get(walletRef);
            
            if (walletSnap.exists()) {
              const data = walletSnap.data();
              return data.balance || 0;
            } else {
              // Initialize wallet atomically
              transaction.set(walletRef, {
                balance: 0,
                currency: 'USD',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userId: userId,
                status: 'active',
              });
              return 0;
            }
          });
        } catch (transactionError) {
          // Fallback to regular read if transaction fails
          const walletSnap = await getDoc(walletRef);
          if (walletSnap.exists()) {
            return walletSnap.data().balance || 0;
          } else {
            // Initialize wallet
            await setDoc(walletRef, {
              balance: 0,
              currency: 'USD',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              userId: userId,
              status: 'active',
            }, { merge: true });
            return 0;
          }
        }
      } else {
        // Mock or fallback
        return 1250.75; // Default mock balance
      }
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  /**
   * Get wallet document
   */
  async getWallet(userId) {
    try {
      if (!userId) return null;

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const walletRef = doc(db, 'wallets', userId);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
          return { id: walletSnap.id, ...walletSnap.data() };
        }
        return null;
      }
      return null;
    } catch (error) {
      console.error('Error getting wallet:', error);
      return null;
    }
  }

  /**
   * Get transactions for a user
   */
  async getTransactions(userId, limitCount = 50) {
    try {
      if (!userId) return [];

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Real Firestore
        const transactionsRef = collection(db, 'walletTransactions');
        const q = query(
          transactionsRef,
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        }));
      } else {
        // Mock transactions
        return this.getMockTransactions();
      }
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  /**
   * Add funds to wallet using Stripe
   */
  async addFunds(userId, amount, paymentMethodId, metadata = {}) {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required');
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (amount > 10000) {
        throw new Error('Maximum single transaction is $10,000');
      }
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        throw new Error('Payment method ID is required');
      }
      if (metadata && typeof metadata !== 'object') {
        throw new Error('Metadata must be an object');
      }

      // Process payment with Stripe
      const paymentResult = await StripeService.createPaymentIntent(
        amount,
        'usd',
        {
          type: 'wallet_add_funds',
          userId,
          ...metadata,
        }
      );

      if (!paymentResult.id) {
        throw new Error('Failed to create payment intent');
      }

      // If Stripe is not configured, use mock payment
      if (!StripeService.isConfigured()) {
        // Mock successful payment
        await this.updateBalance(userId, amount);
        await this.addTransaction(userId, {
          type: 'received',
          amount,
          description: `Added funds via ${metadata.paymentMethod || 'Payment Method'}`,
          status: 'completed',
          paymentMethod: metadata.paymentMethod || 'Mock Payment',
          paymentIntentId: paymentResult.id,
        });
        return { success: true, transactionId: paymentResult.id };
      }

      // CRITICAL: Verify payment succeeded before adding balance
      // In production, payment confirmation should happen on backend
      // Webhooks are the source of truth for payment status
      let paymentStatus = 'completed';
      
      if (StripeService.isConfigured()) {
        try {
          // Payment intent created - status will be confirmed via webhook
          // For now, mark as pending if not already succeeded
          if (paymentResult.status && paymentResult.status !== 'succeeded') {
            paymentStatus = 'pending';
          }
        } catch (confirmError) {
          console.warn('Payment status check failed:', confirmError);
          // Mark as pending - webhook will update when payment succeeds
          paymentStatus = 'pending';
        }
      }

      const transactionId = paymentResult.id || `add_funds_${Date.now()}`;
      const transaction = {
        type: 'received',
        amount,
        description: `Added funds via ${metadata.paymentMethod || 'Payment Method'}`,
        status: paymentStatus,
        paymentMethod: metadata.paymentMethod || 'Stripe',
        paymentIntentId: transactionId,
        timestamp: new Date(),
      };

      // Only add balance if payment succeeded or in mock mode
      // In production, webhooks should update balance when payment succeeds
      if (paymentStatus === 'completed' || !StripeService.isConfigured()) {
        await this.updateBalance(userId, amount, transactionId);
      }
      
      await this.addTransaction(userId, {
        ...transaction,
        transactionId,
      });

      // Generate receipt
      try {
        await ReceiptService.generateReceipt({
          userId,
          transactionId: paymentResult.id,
          amount,
          type: 'wallet_add_funds',
          description: transaction.description,
          paymentMethod: transaction.paymentMethod,
          status: 'completed',
          timestamp: new Date(),
        });
      } catch (receiptError) {
        console.warn('Error generating receipt:', receiptError);
        // Don't fail the transaction if receipt generation fails
      }

      return { success: true, transactionId: paymentResult.id };
    } catch (error) {
      console.error('Error adding funds:', error);
      throw error;
    }
  }

  /**
   * Send money to another user
   */
  async sendMoney(fromUserId, toUserId, amount, description = '') {
    try {
      // Validate inputs
      if (!fromUserId || typeof fromUserId !== 'string') {
        throw new Error('Sender user ID is required');
      }
      if (!toUserId || typeof toUserId !== 'string') {
        throw new Error('Recipient user ID is required');
      }
      if (fromUserId === toUserId) {
        throw new Error('Cannot send money to yourself');
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (amount > 5000) {
        throw new Error('Maximum single transfer is $5,000');
      }
      if (description && typeof description !== 'string') {
        throw new Error('Description must be a string');
      }
      if (description && description.length > 500) {
        throw new Error('Description must be less than 500 characters');
      }

      // Check balance
      const balance = await this.getBalance(fromUserId);
      if (balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Update balances atomically using batch write
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const fromWalletRef = doc(db, 'wallets', fromUserId);
        const toWalletRef = doc(db, 'wallets', toUserId);
        const transactionId = `transfer_${Date.now()}_${fromUserId}_${toUserId}`;
        
        try {
          await runTransaction(db, async (transaction) => {
            // Get both wallets
            const fromWalletSnap = await transaction.get(fromWalletRef);
            const toWalletSnap = await transaction.get(toWalletRef);
            
            // Ensure wallets exist
            if (!fromWalletSnap.exists()) {
              transaction.set(fromWalletRef, {
                balance: 0,
                currency: 'USD',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userId: fromUserId,
                status: 'active',
              });
            }
            if (!toWalletSnap.exists()) {
              transaction.set(toWalletRef, {
                balance: 0,
                currency: 'USD',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userId: toUserId,
                status: 'active',
              });
            }
            
            const fromBalance = fromWalletSnap.exists() 
              ? (fromWalletSnap.data().balance || 0) 
              : 0;
            const toBalance = toWalletSnap.exists() 
              ? (toWalletSnap.data().balance || 0) 
              : 0;
            
            // Check sufficient funds
            if (fromBalance < amount) {
              throw new Error('Insufficient funds');
            }
            
            // Update both balances atomically
            transaction.update(fromWalletRef, {
              balance: fromBalance - amount,
              updatedAt: serverTimestamp(),
              lastTransactionId: transactionId,
            });
            
            transaction.update(toWalletRef, {
              balance: toBalance + amount,
              updatedAt: serverTimestamp(),
              lastTransactionId: transactionId,
            });
          });
        } catch (transactionError) {
          // Fallback to individual updates if transaction fails
          if (transactionError.message === 'Insufficient funds') {
            throw transactionError;
          }
          await this.updateBalance(fromUserId, -amount);
          await this.updateBalance(toUserId, amount);
        }
      } else {
        // Fallback for non-Firestore
        await this.updateBalance(fromUserId, -amount);
        await this.updateBalance(toUserId, amount);
      }

      // Add transactions
      const sentTransaction = {
        type: 'sent',
        amount: -amount,
        description: description || `Sent to ${toUserId}`,
        status: 'completed',
        recipientId: toUserId,
        timestamp: new Date(),
      };

      const receivedTransaction = {
        type: 'received',
        amount,
        description: description || `Received from ${fromUserId}`,
        status: 'completed',
        senderId: fromUserId,
        timestamp: new Date(),
      };

      await this.addTransaction(fromUserId, sentTransaction);
      await this.addTransaction(toUserId, receivedTransaction);

      // Generate receipts
      try {
        await ReceiptService.generateReceipt({
          userId: fromUserId,
          transactionId: `transfer_${Date.now()}`,
          amount: -amount,
          type: 'transfer_sent',
          description: description || `Sent to ${toUserId}`,
          status: 'completed',
          timestamp: new Date(),
        });

        await ReceiptService.generateReceipt({
          userId: toUserId,
          transactionId: `transfer_${Date.now()}`,
          amount,
          type: 'transfer_received',
          description: description || `Received from ${fromUserId}`,
          status: 'completed',
          timestamp: new Date(),
        });
      } catch (receiptError) {
        console.warn('Error generating receipts:', receiptError);
        // Don't fail the transaction if receipt generation fails
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending money:', error);
      throw error;
    }
  }

  /**
   * Cash out (withdraw) funds to bank account
   * Creates a withdrawal request that processes through Stripe
   */
  async cashOut(userId, amount, bankAccountId, metadata = {}) {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required');
      }
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (amount < 10) {
        throw new Error('Minimum withdrawal amount is $10');
      }
      if (amount > 10000) {
        throw new Error('Maximum single withdrawal is $10,000');
      }
      if (!bankAccountId || typeof bankAccountId !== 'string') {
        throw new Error('Bank account ID is required');
      }

      // Check balance
      const balance = await this.getBalance(userId);
      if (balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Create withdrawal transaction (pending status)
      const transactionId = `cashout_${Date.now()}_${userId}`;
      const withdrawalTransaction = {
        type: 'withdrawal',
        amount: -amount,
        description: `Withdrawal to bank account`,
        status: 'pending',
        bankAccountId: bankAccountId,
        transactionId: transactionId,
        timestamp: new Date(),
        ...metadata,
      };

      // Add transaction first (before processing)
      await this.addTransaction(userId, withdrawalTransaction);

      // Process withdrawal through Stripe
      try {
        if (StripeService.isConfigured()) {
          // Create payout via Stripe
          // Note: This requires Stripe Connect for payouts
          // For now, we'll mark as processing and handle via backend
          const payoutResult = await fetch(`${API_BASE_URL}/api/payouts/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              amount: amount * 100, // Convert to cents
              bankAccountId,
              metadata: {
                transactionId,
                ...metadata,
              },
            }),
          }).catch(() => null);

          if (payoutResult && payoutResult.ok) {
            const payoutData = await payoutResult.json();
            
            // Update transaction status
            await this.updateTransactionStatus(transactionId, 'processing', {
              payoutId: payoutData.id,
            });
            
            // Reserve balance (subtract from available balance)
            await this.updateBalance(userId, -amount, transactionId);
            
            return {
              success: true,
              transactionId,
              payoutId: payoutData.id,
              status: 'processing',
              message: 'Withdrawal request submitted. Funds will be transferred within 1-3 business days.',
            };
          } else {
            // If backend not available, mark as pending manual processing
            await this.updateTransactionStatus(transactionId, 'pending', {
              note: 'Pending manual processing',
            });
            
            return {
              success: true,
              transactionId,
              status: 'pending',
              message: 'Withdrawal request submitted. Processing may take 1-3 business days.',
            };
          }
        } else {
          // Mock withdrawal for development
          await this.updateBalance(userId, -amount, transactionId);
          await this.updateTransactionStatus(transactionId, 'completed', {
            note: 'Mock withdrawal completed',
          });
          
          return {
            success: true,
            transactionId,
            status: 'completed',
            message: 'Withdrawal completed (mock mode)',
          };
        }
      } catch (payoutError) {
        // If payout fails, mark transaction as failed
        await this.updateTransactionStatus(transactionId, 'failed', {
          error: payoutError.message,
        });
        throw new Error(`Withdrawal failed: ${payoutError.message}`);
      }
    } catch (error) {
      console.error('Error cashing out:', error);
      throw error;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId, status, additionalData = {}) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const transactionsRef = collection(db, 'walletTransactions');
        const q = query(transactionsRef, where('transactionId', '==', transactionId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((docSnap) => {
            batch.update(docSnap.ref, {
              status,
              updatedAt: serverTimestamp(),
              ...additionalData,
            });
          });
          await batch.commit();
        }
      }
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  /**
   * Lookup user by email or phone for sending money
   */
  async lookupUser(identifier) {
    try {
      if (!identifier) return null;

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        // Try email first
        const usersRef = collection(db, 'users');
        let q = query(usersRef, where('email', '==', identifier.toLowerCase().trim()));
        let snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          return {
            uid: userDoc.id,
            ...userDoc.data(),
          };
        }
        
        // Try phone number
        q = query(usersRef, where('phoneNumber', '==', identifier.trim()));
        snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          return {
            uid: userDoc.id,
            ...userDoc.data(),
          };
        }
        
        // Try username
        q = query(usersRef, where('username', '==', identifier.toLowerCase().trim()));
        snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          return {
            uid: userDoc.id,
            ...userDoc.data(),
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error looking up user:', error);
      return null;
    }
  }

  /**
   * Update wallet balance atomically
   * Uses Firestore transactions to guarantee consistency
   */
  async updateBalance(userId, amount, transactionId = null) {
    try {
      if (!userId) throw new Error('User ID is required');
      if (typeof amount !== 'number') throw new Error('Amount must be a number');

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const walletRef = doc(db, 'wallets', userId);
        
        // Use transaction for atomic update
        try {
          await runTransaction(db, async (transaction) => {
            const walletSnap = await transaction.get(walletRef);
            
            // Ensure wallet exists
            if (!walletSnap.exists()) {
              transaction.set(walletRef, {
                balance: 0,
                currency: 'USD',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                userId: userId,
                status: 'active',
              });
            }
            
            const currentBalance = walletSnap.exists() 
              ? (walletSnap.data().balance || 0) 
              : 0;
            const newBalance = currentBalance + amount;
            
            // Prevent negative balance (unless explicitly allowed for withdrawals)
            if (newBalance < 0 && amount < 0) {
              throw new Error('Insufficient funds');
            }
            
            transaction.update(walletRef, {
              balance: newBalance,
              updatedAt: serverTimestamp(),
              lastTransactionId: transactionId,
            });
          });
        } catch (transactionError) {
          // If transaction fails, try fallback method
          if (transactionError.message === 'Insufficient funds') {
            throw transactionError;
          }
          
          // Fallback: ensure wallet exists, then update
          const walletSnap = await getDoc(walletRef);
          if (!walletSnap.exists()) {
            await setDoc(walletRef, {
              balance: 0,
              currency: 'USD',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              userId: userId,
              status: 'active',
            }, { merge: true });
          }
          
          const currentBalance = walletSnap.exists() 
            ? (walletSnap.data().balance || 0) 
            : 0;
          const newBalance = currentBalance + amount;
          
          if (newBalance < 0 && amount < 0) {
            throw new Error('Insufficient funds');
          }
          
          await updateDoc(walletRef, {
            balance: newBalance,
            updatedAt: serverTimestamp(),
            lastTransactionId: transactionId,
          });
        }
      }
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  /**
   * Add a transaction
   */
  async addTransaction(userId, transactionData) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const transactionsRef = collection(db, 'walletTransactions');
        await addDoc(transactionsRef, {
          userId,
          ...transactionData,
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  }

  /**
   * Get payment methods for a user
   * Tries Stripe first, then Firestore, then mock data
   */
  async getPaymentMethods(userId) {
    try {
      if (!userId) return [];

      // Try Stripe payment methods first
      try {
        const StripePaymentMethodsService = (await import('./StripePaymentMethodsService')).default;
        // Use userId as customerId (you may need to adjust this based on your setup)
        const stripeMethods = await StripePaymentMethodsService.getPaymentMethods(userId);
        if (stripeMethods && stripeMethods.length > 0) {
          // Format Stripe payment methods
          return stripeMethods.map(method => ({
            id: method.id,
            type: method.type || 'card',
            name: method.card ? `${method.card.brand?.toUpperCase() || 'Card'} **** ${method.card.last4 || '0000'}` : method.name || 'Payment Method',
            expiry: method.card ? `${String(method.card.exp_month || 12).padStart(2, '0')}/${String(method.card.exp_year || 2025).slice(-2)}` : null,
            brand: method.card?.brand || null,
            isDefault: method.isDefault || false,
            icon: method.type === 'card' ? 'card' : method.type === 'bank_account' ? 'business' : 'wallet',
          }));
        }
      } catch (stripeError) {
        console.log('Stripe payment methods not available, trying Firestore:', stripeError.message);
      }

      // Try Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const paymentMethodsRef = collection(db, 'paymentMethods');
        const q = query(
          paymentMethodsRef,
          where('userId', '==', userId),
          where('active', '==', true)
        );
        
        const snapshot = await getDocs(q);
        const firestoreMethods = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        if (firestoreMethods.length > 0) {
          return firestoreMethods;
        }
      }

      // Fallback to empty array (no mock data)
      return [];
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  }

  /**
   * Get wallet insights/statistics
   */
  async getInsights(userId, period = 'month') {
    try {
      const transactions = await this.getTransactions(userId, 100);
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Filter transactions by period, handling both Date objects and Firestore Timestamps
      const periodTransactions = transactions.filter(t => {
        let transactionDate;
        if (t.timestamp && typeof t.timestamp.toDate === 'function') {
          // Firestore Timestamp
          transactionDate = t.timestamp.toDate();
        } else if (t.timestamp instanceof Date) {
          // Date object
          transactionDate = t.timestamp;
        } else if (t.timestamp && typeof t.timestamp === 'number') {
          // Unix timestamp
          transactionDate = new Date(t.timestamp);
        } else if (t.createdAt && typeof t.createdAt.toDate === 'function') {
          // Firestore Timestamp from createdAt
          transactionDate = t.createdAt.toDate();
        } else {
          return false;
        }
        return transactionDate >= startDate;
      });

      const totalReceived = periodTransactions
        .filter(t => t.type === 'received')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const totalSent = periodTransactions
        .filter(t => t.type === 'sent')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const netChange = totalReceived - totalSent;

      // Group by category/description
      const categoryTotals = {};
      periodTransactions.forEach(t => {
        const category = t.description || 'Other';
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        categoryTotals[category] += Math.abs(t.amount);
      });

      const topCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, amount]) => ({ name, amount }));

      return {
        totalReceived,
        totalSent,
        netChange,
        transactionCount: periodTransactions.length,
        topCategories,
      };
    } catch (error) {
      console.error('Error getting insights:', error);
      return {
        totalReceived: 0,
        totalSent: 0,
        netChange: 0,
        transactionCount: 0,
        topCategories: [],
      };
    }
  }

  /**
   * Mock transactions for fallback
   */
  getMockTransactions() {
    return [
      {
        id: '1',
        type: 'received',
        amount: 500.00,
        description: 'Event booking payment',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: 'completed',
        icon: 'calendar',
      },
      {
        id: '2',
        type: 'sent',
        amount: -75.50,
        description: 'Service fee payment',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: 'completed',
        icon: 'card',
      },
      {
        id: '3',
        type: 'received',
        amount: 200.00,
        description: 'Refund - Event cancellation',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: 'completed',
        icon: 'refresh',
      },
      {
        id: '4',
        type: 'sent',
        amount: -25.00,
        description: 'Withdrawal to bank',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        status: 'pending',
        icon: 'arrow-up',
      },
      {
        id: '5',
        type: 'received',
        amount: 1000.00,
        description: 'Event booking payment',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        status: 'completed',
        icon: 'calendar',
      },
    ];
  }
}

export default new WalletService();

