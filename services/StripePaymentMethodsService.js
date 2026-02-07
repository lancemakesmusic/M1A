/**
 * Stripe Payment Methods Service
 * Handles loading and managing payment methods from Stripe
 */

import { auth } from '../firebase';
import { getApiBaseUrl } from '../utils/apiConfig';
import { logError } from '../utils/logger';
const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = 30000;

class StripePaymentMethodsService {
  /**
   * Get payment methods for a customer
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Array>} Array of payment methods
   */
  async getPaymentMethods(customerId) {
    try {
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Customer ID is required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to get payment methods');
      }
      const idToken = await currentUser.getIdToken();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/payment-methods?customerId=${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get payment methods: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.paymentMethods || [];
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Payment methods request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Add a payment method for a customer
   * @param {string} customerId - Stripe customer ID
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Payment method object
   */
  async addPaymentMethod(customerId, paymentMethodId) {
    try {
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Customer ID is required');
      }
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        throw new Error('Payment method ID is required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to add payment methods');
      }
      const idToken = await currentUser.getIdToken();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add payment method: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.paymentMethod;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Add payment method request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error adding payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method for a customer
   * @param {string} customerId - Stripe customer ID
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Updated payment method
   */
  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Customer ID is required');
      }
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        throw new Error('Payment method ID is required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to set default payment method');
      }
      const idToken = await currentUser.getIdToken();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/payment-methods/default`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          customerId,
          paymentMethodId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to set default payment method: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      return data.paymentMethod;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Set default payment method request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Delete a payment method
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePaymentMethod(paymentMethodId) {
    try {
      if (!paymentMethodId || typeof paymentMethodId !== 'string') {
        throw new Error('Payment method ID is required');
      }

      // Get Firebase auth token for authentication
      const currentUser = auth?.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to delete payment methods');
      }
      const idToken = await currentUser.getIdToken();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_BASE_URL}/api/payments/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete payment method: ${errorText || response.statusText}`);
      }

      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        logError('Delete payment method request timed out');
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      logError('Error deleting payment method:', error);
      throw error;
    }
  }
}

export default new StripePaymentMethodsService();

