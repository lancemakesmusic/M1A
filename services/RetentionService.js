/**
 * Retention Service
 * Tracks user retention metrics and calculates retention rates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackUserReturn, trackDAU, trackSessionStart, trackSessionEnd } from './AnalyticsService';

const FIRST_USE_KEY = 'm1a_first_use_date';
const LAST_USE_KEY = 'm1a_last_use_date';
const SESSION_START_KEY = 'm1a_session_start';
const TOTAL_SESSIONS_KEY = 'm1a_total_sessions';

/**
 * Track user's first use
 */
export const trackFirstUse = async () => {
  try {
    const firstUse = await AsyncStorage.getItem(FIRST_USE_KEY);
    if (!firstUse) {
      const now = Date.now();
      await AsyncStorage.setItem(FIRST_USE_KEY, now.toString());
      await AsyncStorage.setItem(LAST_USE_KEY, now.toString());
      await AsyncStorage.setItem(TOTAL_SESSIONS_KEY, '1');
      
      // Track in analytics
      await trackDAU();
      return true; // First time user
    }
    return false; // Returning user
  } catch (error) {
    console.warn('Error tracking first use:', error);
    return false;
  }
};

/**
 * Track user session
 */
export const trackSession = async () => {
  try {
    const isFirstUse = await trackFirstUse();
    
    // Update last use date
    await AsyncStorage.setItem(LAST_USE_KEY, Date.now().toString());
    
    // Track session start
    await trackSessionStart();
    await AsyncStorage.setItem(SESSION_START_KEY, Date.now().toString());
    
    // Increment total sessions
    const totalSessions = await AsyncStorage.getItem(TOTAL_SESSIONS_KEY);
    const newTotal = (parseInt(totalSessions || '0') + 1).toString();
    await AsyncStorage.setItem(TOTAL_SESSIONS_KEY, newTotal);
    
    // Track DAU
    await trackDAU();
    
    // Calculate and track retention
    if (!isFirstUse) {
      const firstUseDate = await AsyncStorage.getItem(FIRST_USE_KEY);
      if (firstUseDate) {
        const daysSinceFirstUse = Math.floor(
          (Date.now() - parseInt(firstUseDate)) / (1000 * 60 * 60 * 24)
        );
        await trackUserReturn(daysSinceFirstUse);
      }
    }
    
    return { isFirstUse, totalSessions: parseInt(newTotal) };
  } catch (error) {
    console.warn('Error tracking session:', error);
    return { isFirstUse: false, totalSessions: 0 };
  }
};

/**
 * End current session
 */
export const endSession = async () => {
  try {
    const sessionStart = await AsyncStorage.getItem(SESSION_START_KEY);
    if (sessionStart) {
      const duration = Date.now() - parseInt(sessionStart);
      await trackSessionEnd(duration);
      await AsyncStorage.removeItem(SESSION_START_KEY);
    }
  } catch (error) {
    console.warn('Error ending session:', error);
  }
};

/**
 * Get retention metrics
 */
export const getRetentionMetrics = async () => {
  try {
    const firstUse = await AsyncStorage.getItem(FIRST_USE_KEY);
    const lastUse = await AsyncStorage.getItem(LAST_USE_KEY);
    const totalSessions = await AsyncStorage.getItem(TOTAL_SESSIONS_KEY);
    
    if (!firstUse) {
      return {
        isNewUser: true,
        daysSinceFirstUse: 0,
        daysSinceLastUse: 0,
        totalSessions: 0,
      };
    }
    
    const now = Date.now();
    const firstUseDate = parseInt(firstUse);
    const lastUseDate = parseInt(lastUse || firstUse);
    
    const daysSinceFirstUse = Math.floor(
      (now - firstUseDate) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastUse = Math.floor(
      (now - lastUseDate) / (1000 * 60 * 60 * 24)
    );
    
    return {
      isNewUser: false,
      daysSinceFirstUse,
      daysSinceLastUse,
      totalSessions: parseInt(totalSessions || '0'),
      firstUseDate: new Date(firstUseDate),
      lastUseDate: new Date(lastUseDate),
    };
  } catch (error) {
    console.warn('Error getting retention metrics:', error);
    return {
      isNewUser: true,
      daysSinceFirstUse: 0,
      daysSinceLastUse: 0,
      totalSessions: 0,
    };
  }
};

export default {
  trackFirstUse,
  trackSession,
  endSession,
  getRetentionMetrics,
};

