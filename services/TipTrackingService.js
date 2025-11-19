/**
 * Tip Tracking Service
 * Manages which tips have been shown to users and tip preferences
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TIPS_ENABLED_KEY = 'm1a_tips_enabled';
const SHOWN_TIPS_KEY = 'm1a_shown_tips';
const TIPS_DISABLED_KEY = 'm1a_tips_disabled';

class TipTrackingService {
  /**
   * Check if tips are enabled in settings
   */
  async areTipsEnabled() {
    try {
      const value = await AsyncStorage.getItem(TIPS_ENABLED_KEY);
      // Default to true if not set
      return value === null ? true : value === 'true';
    } catch (error) {
      console.error('Error checking tips enabled:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Set whether tips are enabled
   */
  async setTipsEnabled(enabled) {
    try {
      await AsyncStorage.setItem(TIPS_ENABLED_KEY, enabled.toString());
      return true;
    } catch (error) {
      console.error('Error setting tips enabled:', error);
      return false;
    }
  }

  /**
   * Check if a specific tip has been shown before
   */
  async hasTipBeenShown(tipId) {
    try {
      const shownTips = await this.getShownTips();
      return shownTips.includes(tipId);
    } catch (error) {
      console.error('Error checking if tip shown:', error);
      return false;
    }
  }

  /**
   * Mark a tip as shown
   */
  async markTipAsShown(tipId) {
    try {
      const shownTips = await this.getShownTips();
      if (!shownTips.includes(tipId)) {
        shownTips.push(tipId);
        await AsyncStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(shownTips));
      }
      return true;
    } catch (error) {
      console.error('Error marking tip as shown:', error);
      return false;
    }
  }

  /**
   * Get list of all shown tip IDs
   */
  async getShownTips() {
    try {
      const value = await AsyncStorage.getItem(SHOWN_TIPS_KEY);
      if (!value) return [];
      
      const parsed = JSON.parse(value);
      // Validate that parsed value is an array
      if (!Array.isArray(parsed)) {
        console.warn('Corrupted tip data detected, resetting...');
        // Reset corrupted data
        await AsyncStorage.removeItem(SHOWN_TIPS_KEY);
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Error getting shown tips:', error);
      // Reset corrupted data
      try {
        await AsyncStorage.removeItem(SHOWN_TIPS_KEY);
      } catch (removeError) {
        console.error('Error removing corrupted tip data:', removeError);
      }
      return [];
    }
  }

  /**
   * Check if user has disabled all tips (via checkbox)
   */
  async areTipsDisabled() {
    try {
      const value = await AsyncStorage.getItem(TIPS_DISABLED_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking if tips disabled:', error);
      return false;
    }
  }

  /**
   * Set whether tips are disabled (via checkbox)
   */
  async setTipsDisabled(disabled) {
    try {
      await AsyncStorage.setItem(TIPS_DISABLED_KEY, disabled.toString());
      return true;
    } catch (error) {
      console.error('Error setting tips disabled:', error);
      return false;
    }
  }

  /**
   * Reset all tip tracking (for testing or user reset)
   */
  async resetTipTracking() {
    try {
      await AsyncStorage.removeItem(SHOWN_TIPS_KEY);
      await AsyncStorage.removeItem(TIPS_DISABLED_KEY);
      return true;
    } catch (error) {
      console.error('Error resetting tip tracking:', error);
      return false;
    }
  }

  /**
   * Check if a tip should be shown
   * Returns true if:
   * - Tips are enabled in settings
   * - Tips are not disabled via checkbox
   * - This specific tip hasn't been shown before
   */
  async shouldShowTip(tipId) {
    const tipsEnabled = await this.areTipsEnabled();
    const tipsDisabled = await this.areTipsDisabled();
    const tipShown = await this.hasTipBeenShown(tipId);

    return tipsEnabled && !tipsDisabled && !tipShown;
  }
}

export default new TipTrackingService();

