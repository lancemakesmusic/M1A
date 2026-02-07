/**
 * Stripe Payment Service
 * Handles payment processing with Stripe
 */

import { auth } from '../firebase';
import { getApiBaseUrl } from '../utils/apiConfig';
import { logWarn, logError } from '../utils/logger';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const API_BASE_URL = getApiBaseUrl();

// Timeout for API requests (30 seconds)
const API_TIMEOUT = 30000;

class StripeService {
  /**
   * Create a payment intent for the order
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}, orderItems = []) {
    try {
      // Validate inputs
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        throw new Error('Invalid amount: must be a positive number');
      }
      if (amount > 100000) {
        throw new Error('Amount exceeds maximum limit of $100,000');
      }
      if (!currency || typeof currency !== 'string') {
        throw new Error('Invalid currency');
      }
      if (!Array.isArray(orderItems)) {
        throw new Error('Order items must be an array');
      }
      if (metadata && typeof metadata !== 'object') {
        throw new Error('Metadata must be an object');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to create payment intent');
      }
      const idToken = await currentUser.getIdToken();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount, // Amount in dollars (backend converts to cents)
          currency,
          metadata,
          orderItems,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create payment intent: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Payment intent request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Process a refund for a payment intent
   */
  async refundPayment(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to process refund');
      }
      const idToken = await currentUser.getIdToken();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          amount, // Optional: null for full refund, or amount in dollars
          reason,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process refund: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Refund request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(paymentIntentId, paymentMethodId) {
    try {
      // Validate inputs
      if (!paymentIntentId || typeof paymentIntentId !== 'string') {
        throw new Error('Invalid payment intent ID');
      }
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        throw new Error('Invalid payment method ID');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to confirm payment');
      }
      const idToken = await currentUser.getIdToken();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId,
          paymentMethodId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment confirmation failed: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Payment confirmation request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Process bar order payment
   */
  async processBarOrder(orderItems, totalAmount, customerInfo = {}) {
    try {
      // Validate inputs
      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        throw new Error('Order items are required');
      }
      if (!totalAmount || typeof totalAmount !== 'number' || totalAmount <= 0) {
        throw new Error('Invalid total amount');
      }
      if (customerInfo && typeof customerInfo !== 'object') {
        throw new Error('Customer info must be an object');
      }

      // Validate order items
      for (const item of orderItems) {
        if (!item.id || !item.name || !item.price || !item.quantity) {
          throw new Error('Invalid order item: missing required fields');
        }
        if (typeof item.price !== 'number' || item.price <= 0) {
          throw new Error('Invalid order item: price must be positive');
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error('Invalid order item: quantity must be positive');
        }
      }

      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(
        totalAmount,
        'usd',
        {
          orderType: 'bar',
          itemCount: orderItems.length,
          ...customerInfo,
        },
        orderItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))
      );

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      logError('Error processing bar order:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a Stripe Checkout Session
   */
  async createCheckoutSession(amount, currency = 'usd', metadata = {}, orderItems = [], successUrl, cancelUrl) {
    try {
      // Validate inputs
      // Allow 0 for free tickets, but require positive for paid orders
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error('Invalid amount: must be a non-negative number');
      }
      if (amount === 0) {
        throw new Error('Cannot create checkout session for free orders. Use direct order completion instead.');
      }
      if (!successUrl || !cancelUrl) {
        throw new Error('Success and cancel URLs are required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to create checkout session');
      }
      const idToken = await currentUser.getIdToken();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          metadata,
          orderItems,
          successUrl,
          cancelUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // Handle 404 specifically - backend endpoint not found
        if (response.status === 404) {
          logWarn('Backend payment endpoint not found (404) - payment processing may not be configured');
          throw new Error('Payment processing is currently unavailable. The payment server is not configured. Please contact support or try again later.');
        }
        // Handle other errors
        throw new Error(`Failed to create checkout session: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Checkout session request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      // If error message already set, use it; otherwise provide generic message
      if (error.message && error.message.includes('Payment processing is currently unavailable')) {
        throw error; // Re-throw the user-friendly error
      }
      logError('Error creating checkout session:', error);
      // Provide a more user-friendly error message
      if (error.message && error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Unable to connect to payment server. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  /**
   * Get Stripe publishable key
   */
  getPublishableKey() {
    return STRIPE_PUBLISHABLE_KEY;
  }

  /**
   * Check if Stripe is configured
   */
  isConfigured() {
    return !!STRIPE_PUBLISHABLE_KEY && STRIPE_PUBLISHABLE_KEY.startsWith('pk_');
  }
}

export default new StripeService();

