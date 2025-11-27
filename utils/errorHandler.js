/**
 * Centralized Error Handling Utility
 * Provides consistent error handling across the entire application
 */

import { Alert } from 'react-native';

/**
 * Error types for categorization
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  AUTHENTICATION: 'AUTHENTICATION',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN',
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: {
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    retryable: true,
  },
  [ErrorType.AUTHENTICATION]: {
    title: 'Authentication Error',
    message: 'Your session has expired. Please log in again.',
    retryable: false,
  },
  [ErrorType.VALIDATION]: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    retryable: false,
  },
  [ErrorType.PERMISSION]: {
    title: 'Permission Denied',
    message: 'You don\'t have permission to perform this action.',
    retryable: false,
  },
  [ErrorType.NOT_FOUND]: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    retryable: false,
  },
  [ErrorType.SERVER]: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    retryable: true,
  },
  [ErrorType.UNKNOWN]: {
    title: 'Error',
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
  },
};

/**
 * Categorize error based on error object
 */
export function categorizeError(error) {
  if (!error) return ErrorType.UNKNOWN;

  // Network errors
  if (
    error.message?.includes('Network') ||
    error.message?.includes('network') ||
    error.message?.includes('fetch') ||
    error.message?.includes('timeout') ||
    error.code === 'NETWORK_ERROR' ||
    error.name === 'NetworkError'
  ) {
    return ErrorType.NETWORK;
  }

  // Authentication errors
  if (
    error.code === 'auth/requires-recent-login' ||
    error.code === 'auth/user-token-expired' ||
    error.message?.includes('401') ||
    error.message?.includes('Unauthorized') ||
    error.message?.includes('authentication')
  ) {
    return ErrorType.AUTHENTICATION;
  }

  // Validation errors
  if (
    error.code === 'auth/invalid-email' ||
    error.code === 'auth/weak-password' ||
    error.message?.includes('validation') ||
    error.message?.includes('Invalid') ||
    error.message?.includes('400')
  ) {
    return ErrorType.VALIDATION;
  }

  // Permission errors
  if (
    error.code === 'permission-denied' ||
    error.message?.includes('403') ||
    error.message?.includes('Forbidden') ||
    error.message?.includes('permission')
  ) {
    return ErrorType.PERMISSION;
  }

  // Not found errors
  if (
    error.code === 'not-found' ||
    error.message?.includes('404') ||
    error.message?.includes('Not Found')
  ) {
    return ErrorType.NOT_FOUND;
  }

  // Server errors
  if (
    error.message?.includes('500') ||
    error.message?.includes('502') ||
    error.message?.includes('503') ||
    error.message?.includes('Server Error') ||
    error.message?.includes('Internal Server Error')
  ) {
    return ErrorType.SERVER;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error) {
  const errorType = categorizeError(error);
  const errorInfo = ERROR_MESSAGES[errorType];

  // Allow custom messages to override defaults
  if (error.userMessage) {
    return {
      title: errorInfo.title,
      message: error.userMessage,
      retryable: errorInfo.retryable,
      type: errorType,
    };
  }

  return {
    ...errorInfo,
    type: errorType,
  };
}

/**
 * Check if device is online
 * Uses fetch to a reliable endpoint as a network check
 */
export async function isOnline() {
  try {
    // Use a simple fetch to check connectivity
    // This works without requiring expo-network package
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    // Network is likely offline or unreachable
    return false;
  }
}

/**
 * Handle error with user-friendly alert
 */
export function handleError(error, options = {}) {
  const {
    showAlert = true,
    customTitle = null,
    customMessage = null,
    onRetry = null,
    onDismiss = null,
    logError = true,
  } = options;

  if (logError) {
    console.error('Error handled:', error);
  }

  const errorInfo = getUserFriendlyError(error);
  const title = customTitle || errorInfo.title;
  const message = customMessage || errorInfo.message;

  if (showAlert) {
    const buttons = [];

    if (errorInfo.retryable && onRetry) {
      buttons.push({
        text: 'Retry',
        onPress: onRetry,
        style: 'default',
      });
    }

    buttons.push({
      text: 'OK',
      onPress: onDismiss,
      style: 'cancel',
    });

    Alert.alert(title, message, buttons);
  }

  return {
    title,
    message,
    type: errorInfo.type,
    retryable: errorInfo.retryable,
    originalError: error,
  };
}

/**
 * Handle API errors with retry logic
 */
export async function handleApiError(response, options = {}) {
  const { retryCount = 0, maxRetries = 3, retryDelay = 1000 } = options;

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const error = new Error(errorData.message || 'API request failed');
    error.status = response.status;
    error.statusText = response.statusText;
    error.data = errorData;

    // Retry logic for retryable errors
    if (retryCount < maxRetries && shouldRetry(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (retryCount + 1)));
      return { shouldRetry: true, error };
    }

    return { shouldRetry: false, error };
  }

  return { shouldRetry: false, error: null };
}

/**
 * Determine if error should be retried
 */
function shouldRetry(status) {
  // Retry on network errors and server errors (5xx)
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Safe async wrapper with error handling
 */
export function withErrorHandling(asyncFn, errorHandler = handleError) {
  return async (...args) => {
    try {
      // Check network connectivity first
      const online = await isOnline();
      if (!online) {
        throw new Error('No internet connection');
      }

      return await asyncFn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      }
      throw error;
    }
  };
}

/**
 * Create a retryable function
 */
export function createRetryableFunction(fn, options = {}) {
  const { maxRetries = 3, retryDelay = 1000, onRetry = null } = options;

  return async (...args) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0 && onRetry) {
          onRetry(attempt, maxRetries);
        }

        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        }

        return await fn(...args);
      } catch (error) {
        lastError = error;
        const errorType = categorizeError(error);

        // Don't retry non-retryable errors
        if (!ERROR_MESSAGES[errorType].retryable) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw lastError;
  };
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error) {
  return {
    message: error.message || 'Unknown error',
    stack: error.stack,
    code: error.code,
    status: error.status,
    type: categorizeError(error),
    timestamp: new Date().toISOString(),
  };
}

