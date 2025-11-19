/**
 * Analytics Service
 * Tracks user behavior, conversions, and key events for business intelligence
 * Supports both web (Firebase Analytics) and native (Expo Analytics)
 */

import { Platform } from 'react-native';

// Dynamic imports to handle platform differences
let Analytics = null;
let firebaseAnalytics = null;

// Initialize analytics imports
const initAnalyticsImports = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web: Use Firebase Analytics
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      const { app } = await import('../firebase');
      
      if (app) {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          firebaseAnalytics = getAnalytics(app);
          return true;
        }
      }
    } else {
      // Native: Use Expo Firebase Analytics (if available)
      try {
        Analytics = require('expo-firebase-analytics');
        return true;
      } catch (e) {
        console.warn('expo-firebase-analytics not available, using fallback');
      }
    }
  } catch (error) {
    console.warn('Analytics import failed:', error);
  }
  return false;
};

let analytics = null;
let isAnalyticsReady = false;
let analyticsQueue = [];

// Initialize analytics (call this in App.js)
export const initAnalytics = async () => {
  try {
    const imported = await initAnalyticsImports();
    
    if (Platform.OS === 'web' && firebaseAnalytics) {
      analytics = firebaseAnalytics;
      isAnalyticsReady = true;
      console.log('✅ Web Analytics initialized');
      // Process queued events
      processAnalyticsQueue();
    } else if (Platform.OS !== 'web' && Analytics) {
      try {
        await Analytics.setAnalyticsCollectionEnabled(true);
        isAnalyticsReady = true;
        console.log('✅ Native Analytics initialized');
        // Process queued events
        processAnalyticsQueue();
      } catch (error) {
        console.warn('⚠️ Native Analytics initialization failed:', error);
      }
    } else {
      console.warn('⚠️ Analytics not available on this platform');
    }
  } catch (error) {
    console.warn('⚠️ Analytics initialization failed:', error);
  }
};

// Process queued analytics events
const processAnalyticsQueue = async () => {
  if (!isAnalyticsReady || analyticsQueue.length === 0) return;
  
  const queue = [...analyticsQueue];
  analyticsQueue = [];
  
  for (const event of queue) {
    try {
      if (event.type === 'screen_view') {
        await trackScreenView(event.data.screen_name, event.data.screen_class);
      } else if (event.type === 'event') {
        if (Platform.OS === 'web' && analytics) {
          const { logEvent } = await import('firebase/analytics');
          logEvent(analytics, event.eventName, event.params);
        } else if (Analytics) {
          await Analytics.logEvent(event.eventName, event.params);
        }
      }
    } catch (error) {
      console.warn('Error processing queued analytics event:', error);
      // Re-queue failed events (limit to prevent infinite queue)
      if (analyticsQueue.length < 100) {
        analyticsQueue.push(event);
      }
    }
  }
};

// Track screen views
export const trackScreenView = async (screenName, screenClass = null) => {
  const eventData = {
    screen_name: screenName,
    screen_class: screenClass || screenName,
    timestamp: Date.now(),
  };
  
  if (!isAnalyticsReady) {
    // Queue for later
    analyticsQueue.push({ type: 'screen_view', data: eventData });
    return;
  }
  
  try {
    if (Platform.OS === 'web' && analytics) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, 'screen_view', eventData);
    } else if (Analytics) {
      await Analytics.logEvent('screen_view', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
    // Queue for retry
    analyticsQueue.push({ type: 'screen_view', data: eventData });
  }
};

// Track user signup
export const trackSignup = async (method = 'email') => {
  const params = { method: method || 'email' };
  
  if (!isAnalyticsReady) {
    analyticsQueue.push({ type: 'event', eventName: 'sign_up', params });
    return;
  }
  
  try {
    if (Platform.OS === 'web' && analytics) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, 'sign_up', params);
    } else {
      await Analytics.logEvent('sign_up', {
        method: method,
      });
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track user login
export const trackLogin = async (method = 'email') => {
  if (!isAnalyticsReady) return;
  
  try {
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'login', {
        method: method,
      });
    } else {
      await Analytics.logEvent('login', {
        method: method,
      });
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track event booking started
export const trackEventBookingStarted = async (eventType) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      event_type: eventType,
      item_category: 'event',
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'begin_checkout', eventData);
    } else {
      await Analytics.logEvent('begin_checkout', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track event booking completed
export const trackEventBookingCompleted = async (eventData) => {
  if (!isAnalyticsReady) return;
  
  try {
    const purchaseData = {
      transaction_id: eventData.id || `event_${Date.now()}`,
      value: eventData.total || 0,
      currency: 'USD',
      items: [{
        item_id: eventData.id || 'event',
        item_name: eventData.eventType || 'Event',
        item_category: 'event',
        price: eventData.total || 0,
        quantity: 1,
      }],
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'purchase', purchaseData);
    } else {
      await Analytics.logEvent('purchase', purchaseData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track bar order placed
export const trackBarOrder = async (orderData) => {
  if (!isAnalyticsReady) return;
  
  try {
    const purchaseData = {
      transaction_id: orderData.id || `order_${Date.now()}`,
      value: orderData.total || 0,
      currency: 'USD',
      items: (orderData.items || []).map(item => ({
        item_id: item.id || item.name,
        item_name: item.name,
        item_category: 'bar',
        price: item.price || 0,
        quantity: item.quantity || 1,
      })),
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'purchase', purchaseData);
    } else {
      await Analytics.logEvent('purchase', purchaseData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track wallet transaction
export const trackWalletTransaction = async (transactionData) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      transaction_type: transactionData.type,
      value: Math.abs(transactionData.amount || 0),
      currency: 'USD',
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'wallet_transaction', eventData);
    } else {
      await Analytics.logEvent('wallet_transaction', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track feature usage
export const trackFeatureUsage = async (featureName, metadata = {}) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      feature_name: featureName,
      ...metadata,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'feature_usage', eventData);
    } else {
      await Analytics.logEvent('feature_usage', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track button clicks
export const trackButtonClick = async (buttonName, screenName) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      button_name: buttonName,
      screen_name: screenName,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'button_click', eventData);
    } else {
      await Analytics.logEvent('button_click', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track search
export const trackSearch = async (searchTerm, resultsCount = 0) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      search_term: searchTerm,
      results_count: resultsCount,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'search', eventData);
    } else {
      await Analytics.logEvent('search', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track share
export const trackShare = async (contentType, contentId, method) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      content_type: contentType,
      content_id: contentId,
      method: method,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'share', eventData);
    } else {
      await Analytics.logEvent('share', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track review submission
export const trackReviewSubmitted = async (itemId, rating, hasText) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      item_id: itemId,
      rating: rating,
      has_text: hasText,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'review_submitted', eventData);
    } else {
      await Analytics.logEvent('review_submitted', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track errors
export const trackError = async (errorMessage, errorType, screenName) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      error_message: errorMessage,
      error_type: errorType,
      screen_name: screenName,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'error', eventData);
    } else {
      await Analytics.logEvent('error', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track feedback submission
export const trackFeedback = async (feedbackType, hasRating, hasEmail, textLength) => {
  if (!isAnalyticsReady) {
    if (analyticsQueue.length < 100) {
      analyticsQueue.push({ type: 'event', eventName: 'feedback_submitted', params: { feedback_type: feedbackType, has_rating: hasRating, has_email: hasEmail, text_length: textLength } });
    }
    return;
  }
  
  try {
    const eventData = {
      feedback_type: feedbackType,
      has_rating: hasRating,
      has_email: hasEmail,
      text_length: textLength,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'feedback_submitted', eventData);
    } else {
      await Analytics.logEvent('feedback_submitted', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track bug report submission
export const trackBugReport = async (hasScreenshot, hasEmail, severity) => {
  if (!isAnalyticsReady) {
    if (analyticsQueue.length < 100) {
      analyticsQueue.push({ type: 'event', eventName: 'bug_report_submitted', params: { has_screenshot: hasScreenshot, has_email: hasEmail, severity: severity } });
    }
    return;
  }
  
  try {
    const eventData = {
      has_screenshot: hasScreenshot || false,
      has_email: hasEmail || false,
      severity: severity || 'unknown',
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'bug_report_submitted', eventData);
    } else {
      await Analytics.logEvent('bug_report_submitted', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track feature request submission
export const trackFeatureRequest = async (featureCategory, hasEmail, priority) => {
  if (!isAnalyticsReady) {
    if (analyticsQueue.length < 100) {
      analyticsQueue.push({ type: 'event', eventName: 'feature_request_submitted', params: { feature_category: featureCategory, has_email: hasEmail, priority: priority } });
    }
    return;
  }
  
  try {
    const eventData = {
      feature_category: featureCategory || 'general',
      has_email: hasEmail || false,
      priority: priority || 'normal',
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'feature_request_submitted', eventData);
    } else {
      await Analytics.logEvent('feature_request_submitted', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track survey completion
export const trackSurvey = async (surveyId, questionCount, completionTime, responses) => {
  if (!isAnalyticsReady) {
    if (analyticsQueue.length < 100) {
      analyticsQueue.push({ type: 'event', eventName: 'survey_completed', params: { survey_id: surveyId, question_count: questionCount, completion_time: completionTime, response_count: Object.keys(responses || {}).length } });
    }
    return;
  }
  
  try {
    const eventData = {
      survey_id: surveyId,
      question_count: questionCount,
      completion_time: completionTime || 0,
      response_count: Object.keys(responses || {}).length,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'survey_completed', eventData);
    } else {
      await Analytics.logEvent('survey_completed', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track survey started
export const trackSurveyStarted = async (surveyId) => {
  if (!isAnalyticsReady) {
    if (analyticsQueue.length < 100) {
      analyticsQueue.push({ type: 'event', eventName: 'survey_started', params: { survey_id: surveyId } });
    }
    return;
  }
  
  try {
    const eventData = {
      survey_id: surveyId,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'survey_started', eventData);
    } else {
      await Analytics.logEvent('survey_started', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Set user properties
export const setUserProperty = async (propertyName, value) => {
  if (!isAnalyticsReady) return;
  
  try {
    if (Platform.OS === 'web' && analytics) {
      await setUserProperties(analytics, {
        [propertyName]: value,
      });
    } else {
      await Analytics.setUserProperty(propertyName, value);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Set user ID
export const setAnalyticsUserId = async (userId) => {
  if (!isAnalyticsReady) return;
  
  try {
    if (Platform.OS === 'web' && analytics) {
      setUserId(analytics, userId);
    } else {
      await Analytics.setUserId(userId);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track conversion funnel
export const trackFunnelStep = async (funnelName, stepName, stepNumber) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      funnel_name: funnelName,
      step_name: stepName,
      step_number: stepNumber,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'funnel_step', eventData);
    } else {
      await Analytics.logEvent('funnel_step', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// ========== RETENTION METRICS ==========

// Track user session start
export const trackSessionStart = async () => {
  if (!isAnalyticsReady) return;
  
  try {
    const sessionData = {
      timestamp: new Date().toISOString(),
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'session_start', sessionData);
    } else {
      await Analytics.logEvent('session_start', sessionData);
    }
    
    // Store session start time for retention calculation
    if (Platform.OS !== 'web') {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('last_session_start', Date.now().toString());
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track user session end
export const trackSessionEnd = async (sessionDuration) => {
  if (!isAnalyticsReady) return;
  
  try {
    const sessionData = {
      duration: sessionDuration,
      timestamp: new Date().toISOString(),
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'session_end', sessionData);
    } else {
      await Analytics.logEvent('session_end', sessionData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track daily active user
export const trackDAU = async () => {
  if (!isAnalyticsReady) return;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'dau', {
        date: today,
      });
    } else {
      await Analytics.logEvent('dau', {
        date: today,
      });
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track user return (Day 1, 7, 30 retention)
export const trackUserReturn = async (daysSinceFirstUse) => {
  if (!isAnalyticsReady) return;
  
  try {
    let retentionCohort = 'new';
    if (daysSinceFirstUse === 1) retentionCohort = 'day_1';
    else if (daysSinceFirstUse === 7) retentionCohort = 'day_7';
    else if (daysSinceFirstUse === 30) retentionCohort = 'day_30';
    else if (daysSinceFirstUse > 30) retentionCohort = 'day_30_plus';
    
    const eventData = {
      retention_cohort: retentionCohort,
      days_since_first_use: daysSinceFirstUse,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'user_return', eventData);
    } else {
      await Analytics.logEvent('user_return', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// ========== REVENUE TRACKING ==========

// Track revenue metrics
export const trackRevenue = async (revenueData) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      revenue: revenueData.amount || 0,
      currency: revenueData.currency || 'USD',
      revenue_type: revenueData.type || 'unknown',
      item_id: revenueData.itemId,
      item_name: revenueData.itemName,
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'revenue', eventData);
    } else {
      await Analytics.logEvent('revenue', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track lifetime value (LTV)
export const trackLTV = async (userId, totalRevenue) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      user_id: userId,
      ltv: totalRevenue,
      currency: 'USD',
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'ltv', eventData);
      // Also set as user property
      await setUserProperty('ltv', totalRevenue.toString());
    } else {
      await Analytics.logEvent('ltv', eventData);
      await Analytics.setUserProperty('ltv', totalRevenue.toString());
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// ========== A/B TESTING ==========

// Track A/B test assignment
export const trackABTestAssignment = async (testName, variant) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      test_name: testName,
      variant: variant,
      timestamp: new Date().toISOString(),
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'ab_test_assignment', eventData);
      await setUserProperty(`ab_test_${testName}`, variant);
    } else {
      await Analytics.logEvent('ab_test_assignment', eventData);
      await Analytics.setUserProperty(`ab_test_${testName}`, variant);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Track A/B test conversion
export const trackABTestConversion = async (testName, variant, conversionType) => {
  if (!isAnalyticsReady) return;
  
  try {
    const eventData = {
      test_name: testName,
      variant: variant,
      conversion_type: conversionType,
      timestamp: new Date().toISOString(),
    };
    
    if (Platform.OS === 'web' && analytics) {
      logEvent(analytics, 'ab_test_conversion', eventData);
    } else {
      await Analytics.logEvent('ab_test_conversion', eventData);
    }
  } catch (error) {
    console.warn('Analytics error:', error);
  }
};

// Get A/B test variant (simple hash-based assignment)
export const getABTestVariant = (testName, userId, variants = ['control', 'variant']) => {
  // Simple hash-based assignment for consistency
  const hash = (testName + userId).split('').reduce((acc, char) => {
    const hash = ((acc << 5) - acc) + char.charCodeAt(0);
    return hash & hash;
  }, 0);
  
  const index = Math.abs(hash) % variants.length;
  return variants[index];
};

export default {
  initAnalytics,
  trackScreenView,
  trackSignup,
  trackLogin,
  trackEventBookingStarted,
  trackEventBookingCompleted,
  trackBarOrder,
  trackWalletTransaction,
  trackFeatureUsage,
  trackButtonClick,
  trackSearch,
  trackShare,
  trackReviewSubmitted,
  trackError,
  setUserProperty,
  setAnalyticsUserId,
  trackFunnelStep,
  // Retention
  trackSessionStart,
  trackSessionEnd,
  trackDAU,
  trackUserReturn,
  // Revenue
  trackRevenue,
  trackLTV,
  // A/B Testing
  trackABTestAssignment,
  trackABTestConversion,
  getABTestVariant,
};

