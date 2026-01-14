// utils/errorHandler.js
// Centralized error handling for consistent UX

import { Alert } from 'react-native';
import { logError } from './logger';

/**
 * User-friendly error messages for common errors
 */
export const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect. Please check your internet connection and try again.',
  TIMEOUT: 'The request took too long. Please try again.',
  UNAUTHORIZED: 'You need to be logged in to perform this action.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: 'The requested item could not be found.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again in a moment.',
  VALIDATION: 'Please check your input and try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
  FIREBASE_AUTH: {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  },
  FIRESTORE: {
    'permission-denied': "You don't have permission to access this data.",
    'unavailable': 'Service temporarily unavailable. Please try again.',
    'deadline-exceeded': 'Request timed out. Please try again.',
  },
  STRIPE: {
    'card_declined': 'Your card was declined. Please try a different payment method.',
    'insufficient_funds': 'Insufficient funds. Please use a different payment method.',
    'expired_card': 'Your card has expired. Please use a different payment method.',
    'processing_error': 'Payment processing error. Please try again.',
  },
};

/**
 * Get user-friendly error message from error object
 */
export const getUserFriendlyError = (error) => {
  if (!error) return ERROR_MESSAGES.UNKNOWN;

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message || '';
    
    // Check for Firebase Auth errors
    if (error.code && ERROR_MESSAGES.FIREBASE_AUTH[error.code]) {
      return ERROR_MESSAGES.FIREBASE_AUTH[error.code];
    }
    
    // Check for Firestore errors
    if (error.code && ERROR_MESSAGES.FIRESTORE[error.code]) {
      return ERROR_MESSAGES.FIRESTORE[error.code];
    }
    
    // Check for network errors
    if (message.includes('network') || message.includes('Network')) {
      return ERROR_MESSAGES.NETWORK;
    }
    
    // Check for timeout errors
    if (message.includes('timeout') || message.includes('Timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    
    // Check for payment server errors (more specific than generic 404)
    if (message.includes('Payment processing is currently unavailable') || 
        message.includes('payment server is not configured') ||
        message.includes('payment server')) {
      return message; // Use the specific error message
    }
    
    // Check for 404 errors
    if (message.includes('404') || message.includes('not found')) {
      return ERROR_MESSAGES.NOT_FOUND;
    }
    
    // Check for 401/403 errors
    if (message.includes('401') || message.includes('Unauthorized')) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    
    if (message.includes('403') || message.includes('Forbidden')) {
      return ERROR_MESSAGES.FORBIDDEN;
    }
    
    // Check for 500 errors
    if (message.includes('500') || message.includes('server')) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }
    
    // Return original message if it's user-friendly, otherwise return generic
    if (message.length < 100 && !message.includes('Error:') && !message.includes('error:')) {
      return message;
    }
  }

  // Handle error objects with code property
  if (error.code) {
    if (ERROR_MESSAGES.FIREBASE_AUTH[error.code]) {
      return ERROR_MESSAGES.FIREBASE_AUTH[error.code];
    }
    if (ERROR_MESSAGES.FIRESTORE[error.code]) {
      return ERROR_MESSAGES.FIRESTORE[error.code];
    }
  }

  return ERROR_MESSAGES.UNKNOWN;
};

/**
 * Show error alert with user-friendly message
 */
export const showErrorAlert = (error, title = 'Error', onDismiss = null) => {
  const message = getUserFriendlyError(error);
  logError('Error shown to user:', { error, message });
  
  Alert.alert(
    title,
    message,
    [
      {
        text: 'OK',
        onPress: onDismiss || (() => {}),
      },
    ],
    { cancelable: true }
  );
};

/**
 * Show success alert
 */
export const showSuccessAlert = (message, title = 'Success', onDismiss = null) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'OK',
        onPress: onDismiss || (() => {}),
      },
    ],
    { cancelable: true }
  );
};

/**
 * Show confirmation alert
 */
export const showConfirmationAlert = (
  message,
  title = 'Confirm',
  onConfirm,
  onCancel = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
) => {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel || (() => {}),
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
};

/**
 * Handle API errors consistently
 */
export const handleApiError = async (response) => {
  if (!response.ok) {
    let errorMessage = ERROR_MESSAGES.SERVER_ERROR;
    
    try {
      const errorData = await response.json();
      if (errorData.error || errorData.message) {
        errorMessage = errorData.error || errorData.message;
      }
    } catch (e) {
      // If response is not JSON, use status-based message
      if (response.status === 404) {
        errorMessage = ERROR_MESSAGES.NOT_FOUND;
      } else if (response.status === 401) {
        errorMessage = ERROR_MESSAGES.UNAUTHORIZED;
      } else if (response.status === 403) {
        errorMessage = ERROR_MESSAGES.FORBIDDEN;
      } else if (response.status >= 500) {
        errorMessage = ERROR_MESSAGES.SERVER_ERROR;
      }
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = response;
    return error;
  }
  
  return null;
};

/**
 * Wrap async function with error handling
 */
export const withErrorHandling = (fn, errorTitle = 'Error') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      showErrorAlert(error, errorTitle);
      throw error;
    }
  };
};
