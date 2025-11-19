/**
 * Receipt Service
 * Generates receipts and tracks payment history
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeatureUsage } from './AnalyticsService';

class ReceiptService {
  /**
   * Generate receipt for a transaction
   */
  async generateReceipt(transactionData) {
    try {
      // Validate inputs
      if (!transactionData || typeof transactionData !== 'object') {
        throw new Error('Invalid transaction data');
      }
      if (!transactionData.userId || typeof transactionData.userId !== 'string') {
        throw new Error('User ID is required');
      }
      if (!transactionData.amount || typeof transactionData.amount !== 'number') {
        throw new Error('Amount is required');
      }
      if (!transactionData.type || typeof transactionData.type !== 'string') {
        throw new Error('Transaction type is required');
      }

      const receipt = {
        receiptNumber: `M1A-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        userId: transactionData.userId,
        transactionId: transactionData.id || transactionData.transactionId,
        amount: transactionData.amount,
        currency: transactionData.currency || 'USD',
        type: transactionData.type, // 'payment', 'refund', 'booking', 'bar_order', etc.
        description: transactionData.description || '',
        items: transactionData.items || [],
        paymentMethod: transactionData.paymentMethod || 'Unknown',
        status: transactionData.status || 'completed',
        timestamp: transactionData.timestamp || new Date(),
        tax: transactionData.tax || 0,
        fees: transactionData.fees || 0,
        subtotal: transactionData.subtotal || transactionData.amount,
        total: transactionData.amount,
        createdAt: new Date(),
      };

      // Save receipt to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const receiptsRef = collection(db, 'receipts');
        const receiptRef = await addDoc(receiptsRef, receipt);
        receipt.id = receiptRef.id;
      } else {
        // Mock receipt ID
        receipt.id = `receipt_${Date.now()}`;
      }

      // Track receipt generation
      await trackFeatureUsage('receipt_generated', {
        receiptNumber: receipt.receiptNumber,
        type: receipt.type,
        amount: receipt.amount,
      });

      return receipt;
    } catch (error) {
      console.error('Error generating receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceipt(receiptId) {
    try {
      if (!receiptId || typeof receiptId !== 'string') {
        throw new Error('Receipt ID is required');
      }

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const receiptRef = doc(db, 'receipts', receiptId);
        const receiptSnap = await getDoc(receiptRef);
        
        if (receiptSnap.exists()) {
          return { id: receiptSnap.id, ...receiptSnap.data() };
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting receipt:', error);
      return null;
    }
  }

  /**
   * Get user's receipt history
   */
  async getUserReceipts(userId, limitCount = 50) {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required');
      }

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        const receiptsRef = collection(db, 'receipts');
        const q = query(
          receiptsRef,
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
      }

      return [];
    } catch (error) {
      console.error('Error getting user receipts:', error);
      return [];
    }
  }

  /**
   * Format receipt as text (for sharing/email)
   */
  formatReceiptAsText(receipt) {
    if (!receipt) return '';

    let text = `M1A RECEIPT\n`;
    text += `Receipt #: ${receipt.receiptNumber}\n`;
    text += `Date: ${new Date(receipt.timestamp).toLocaleDateString()}\n`;
    text += `\n`;
    text += `Transaction Type: ${receipt.type}\n`;
    text += `Description: ${receipt.description || 'N/A'}\n`;
    text += `\n`;

    if (receipt.items && receipt.items.length > 0) {
      text += `Items:\n`;
      receipt.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name || 'Item'}: $${(item.price || 0).toFixed(2)} x ${item.quantity || 1}\n`;
      });
      text += `\n`;
    }

    text += `Subtotal: $${(receipt.subtotal || 0).toFixed(2)}\n`;
    if (receipt.tax > 0) {
      text += `Tax: $${receipt.tax.toFixed(2)}\n`;
    }
    if (receipt.fees > 0) {
      text += `Fees: $${receipt.fees.toFixed(2)}\n`;
    }
    text += `Total: $${receipt.total.toFixed(2)}\n`;
    text += `\n`;
    text += `Payment Method: ${receipt.paymentMethod}\n`;
    text += `Status: ${receipt.status}\n`;
    text += `\n`;
    text += `Thank you for using M1A!\n`;

    return text;
  }

  /**
   * Generate tax document summary (for tax year)
   */
  async generateTaxSummary(userId, year) {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('User ID is required');
      }
      if (!year || typeof year !== 'number') {
        year = new Date().getFullYear();
      }

      const receipts = await this.getUserReceipts(userId, 1000);
      
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31, 23, 59, 59);
      
      const yearReceipts = receipts.filter(receipt => {
        const receiptDate = receipt.timestamp instanceof Date 
          ? receipt.timestamp 
          : new Date(receipt.timestamp);
        return receiptDate >= yearStart && receiptDate <= yearEnd;
      });

      const summary = {
        year,
        totalTransactions: yearReceipts.length,
        totalAmount: yearReceipts.reduce((sum, r) => sum + (r.total || 0), 0),
        totalTax: yearReceipts.reduce((sum, r) => sum + (r.tax || 0), 0),
        totalFees: yearReceipts.reduce((sum, r) => sum + (r.fees || 0), 0),
        byType: {},
        receipts: yearReceipts,
      };

      // Group by type
      yearReceipts.forEach(receipt => {
        const type = receipt.type || 'other';
        if (!summary.byType[type]) {
          summary.byType[type] = {
            count: 0,
            total: 0,
          };
        }
        summary.byType[type].count++;
        summary.byType[type].total += receipt.total || 0;
      });

      return summary;
    } catch (error) {
      console.error('Error generating tax summary:', error);
      throw error;
    }
  }
}

export default new ReceiptService();

