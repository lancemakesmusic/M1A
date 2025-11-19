/**
 * Rating Prompt Service
 * Tracks positive user actions and intelligently prompts for App Store ratings
 * Only prompts after positive experiences and respects user preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform, Linking, Alert } from 'react-native';
import { trackFeatureUsage, trackButtonClick, trackError } from './AnalyticsService';

const RATING_PROMPT_KEY = 'm1a_rating_prompt';
const POSITIVE_ACTIONS_KEY = 'm1a_positive_actions';
const RATING_DECLINED_KEY = 'm1a_rating_declined';
const RATING_COMPLETED_KEY = 'm1a_rating_completed';

// Minimum positive actions before prompting
const MIN_POSITIVE_ACTIONS = 3;
// Minimum days between prompts
const MIN_DAYS_BETWEEN_PROMPTS = 30;
// Minimum days since last decline
const MIN_DAYS_AFTER_DECLINE = 60;

// Positive actions that indicate user satisfaction
const POSITIVE_ACTIONS = {
  EVENT_BOOKED: 'event_booked',
  SERVICE_BOOKED: 'service_booked',
  ORDER_COMPLETED: 'order_completed',
  PAYMENT_SUCCESS: 'payment_success',
  REVIEW_SUBMITTED: 'review_submitted',
  SHARE_APP: 'share_app',
  MULTIPLE_SESSIONS: 'multiple_sessions',
  FEATURE_USED: 'feature_used',
};

class RatingPromptService {
  /**
   * Record a positive action
   */
  async recordPositiveAction(actionType, metadata = {}) {
    if (!Object.values(POSITIVE_ACTIONS).includes(actionType)) {
      console.warn(`Unknown positive action type: ${actionType}`);
      return;
    }

    try {
      const actionsData = await AsyncStorage.getItem(POSITIVE_ACTIONS_KEY);
      const actions = actionsData ? JSON.parse(actionsData) : [];
      
      actions.push({
        type: actionType,
        timestamp: Date.now(),
        metadata,
      });

      // Keep only last 50 actions
      const recentActions = actions.slice(-50);
      await AsyncStorage.setItem(POSITIVE_ACTIONS_KEY, JSON.stringify(recentActions));

      // Check if we should prompt for rating
      await this.checkAndPromptRating();
    } catch (error) {
      console.error('Error recording positive action:', error);
    }
  }

  /**
   * Check if we should prompt for rating and do so if conditions are met
   */
  async checkAndPromptRating() {
    try {
      // Check if user already completed rating
      const ratingCompleted = await AsyncStorage.getItem(RATING_COMPLETED_KEY);
      if (ratingCompleted === 'true') {
        return false;
      }

      // Check if user recently declined
      const lastDeclined = await AsyncStorage.getItem(RATING_DECLINED_KEY);
      if (lastDeclined) {
        const daysSinceDecline = (Date.now() - parseInt(lastDeclined)) / (1000 * 60 * 60 * 24);
        if (daysSinceDecline < MIN_DAYS_AFTER_DECLINE) {
          return false;
        }
      }

      // Check last prompt time
      const lastPrompt = await AsyncStorage.getItem(RATING_PROMPT_KEY);
      if (lastPrompt) {
        const daysSincePrompt = (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24);
        if (daysSincePrompt < MIN_DAYS_BETWEEN_PROMPTS) {
          return false;
        }
      }

      // Count positive actions
      const actionsData = await AsyncStorage.getItem(POSITIVE_ACTIONS_KEY);
      const actions = actionsData ? JSON.parse(actionsData) : [];
      
      if (actions.length < MIN_POSITIVE_ACTIONS) {
        return false;
      }

      // Check for recent positive actions (within last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentActions = actions.filter(action => action.timestamp > sevenDaysAgo);
      
      if (recentActions.length < 2) {
        return false;
      }

      // All conditions met - prompt for rating
      return await this.promptForRating();
    } catch (error) {
      console.error('Error checking rating prompt:', error);
      return false;
    }
  }

  /**
   * Prompt user for App Store rating
   */
  async promptForRating() {
    try {
      // Mark that we've prompted
      await AsyncStorage.setItem(RATING_PROMPT_KEY, String(Date.now()));
      trackFeatureUsage('rating_prompt_shown', {});

      const isAvailable = await StoreReview.isAvailableAsync();
      
      if (isAvailable) {
        // Use native rating prompt
        const hasAction = await StoreReview.hasAction();
        if (hasAction) {
          await StoreReview.requestReview();
          trackFeatureUsage('rating_prompt_native_shown', {});
          return true;
        }
      }

      // Fallback to custom alert
      return new Promise((resolve) => {
        Alert.alert(
          'Enjoying M1A?',
          'Your feedback helps us improve! Would you mind rating us on the App Store?',
          [
            {
              text: 'Not Now',
              style: 'cancel',
              onPress: async () => {
                await AsyncStorage.setItem(RATING_DECLINED_KEY, String(Date.now()));
                trackButtonClick('rating_declined', 'RatingPrompt');
                resolve(false);
              },
            },
            {
              text: 'Rate Now',
              onPress: async () => {
                await this.openAppStore();
                trackButtonClick('rating_accepted', 'RatingPrompt');
                resolve(true);
              },
            },
          ],
          { cancelable: true }
        );
      });
    } catch (error) {
      console.error('Error prompting for rating:', error);
      trackError(error.message || 'Rating prompt failed', 'rating_prompt_error', 'RatingPromptService');
      return false;
    }
  }

  /**
   * Open App Store rating page
   */
  async openAppStore() {
    try {
      let url = '';
      
      if (Platform.OS === 'ios') {
        // iOS App Store URL (replace with your actual app ID)
        const appId = 'YOUR_IOS_APP_ID'; // TODO: Replace with actual app ID
        url = `https://apps.apple.com/app/id${appId}?action=write-review`;
      } else if (Platform.OS === 'android') {
        // Google Play Store URL (replace with your actual package name)
        const packageName = 'com.merkaba.m1a'; // TODO: Replace with actual package name
        url = `https://play.google.com/store/apps/details?id=${packageName}`;
      } else {
        // Web fallback
        url = 'https://merkaba.com'; // TODO: Replace with actual website
      }

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        trackFeatureUsage('app_store_opened', { platform: Platform.OS });
        
        // Mark as completed after opening store
        await AsyncStorage.setItem(RATING_COMPLETED_KEY, 'true');
      }
    } catch (error) {
      console.error('Error opening App Store:', error);
    }
  }

  /**
   * Manually trigger rating prompt (for testing or user request)
   */
  async manualPrompt() {
    return await this.promptForRating();
  }

  /**
   * Reset rating prompt state (for testing)
   */
  async resetRatingState() {
    await AsyncStorage.multiRemove([
      RATING_PROMPT_KEY,
      RATING_DECLINED_KEY,
      RATING_COMPLETED_KEY,
    ]);
  }

  /**
   * Get positive actions count
   */
  async getPositiveActionsCount() {
    try {
      const actionsData = await AsyncStorage.getItem(POSITIVE_ACTIONS_KEY);
      const actions = actionsData ? JSON.parse(actionsData) : [];
      return actions.length;
    } catch (error) {
      return 0;
    }
  }
}

export default new RatingPromptService();
export { POSITIVE_ACTIONS };

