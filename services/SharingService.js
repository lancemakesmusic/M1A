/**
 * Sharing Service
 * Handles social sharing, referrals, and invite functionality
 */

import { Platform, Share } from 'react-native';
import { trackShare, trackFeatureUsage } from './AnalyticsService';
import RatingPromptService, { POSITIVE_ACTIONS } from './RatingPromptService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REFERRAL_CODE_KEY = 'm1a_referral_code';
const REFERRAL_LINK_KEY = 'm1a_referral_link';

// Generate or retrieve user's referral code
export const getReferralCode = async (userId) => {
  try {
    const stored = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
    if (stored) return stored;

    // Generate new referral code
    const code = `M1A${userId.slice(0, 8).toUpperCase()}`;
    await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
    return code;
  } catch (error) {
    console.error('Error getting referral code:', error);
    return null;
  }
};

// Generate referral link
export const getReferralLink = async (userId) => {
  try {
    const code = await getReferralCode(userId);
    if (!code) return null;

    const link = `https://m1a.app/invite?ref=${code}`;
    await AsyncStorage.setItem(REFERRAL_LINK_KEY, link);
    return link;
  } catch (error) {
    console.error('Error getting referral link:', error);
    return null;
  }
};

// Share content (event, service, etc.)
export const shareContent = async (contentType, contentId, contentData) => {
  try {
    // Validate inputs
    if (!contentType || typeof contentType !== 'string') {
      throw new Error('Content type is required');
    }
    if (!contentId) {
      throw new Error('Content ID is required');
    }
    if (!contentData || typeof contentData !== 'object') {
      contentData = {};
    }

    const shareText = generateShareText(contentType, contentData);
    const shareUrl = `https://m1a.app/${contentType}/${contentId}`;

    if (Platform.OS === 'web') {
      // Web sharing
      if (navigator.share) {
        try {
          await navigator.share({
            title: contentData.name || 'Check this out on M1A',
            text: shareText,
            url: shareUrl,
          });
          await trackShare(contentType, contentId, 'web');
        } catch (shareError) {
          // User cancelled or share failed, fallback to clipboard
          await copyToClipboard(`${shareText}\n${shareUrl}`);
          if (typeof alert !== 'undefined') {
            alert('Link copied to clipboard!');
          }
        }
      } else {
        // Fallback: copy to clipboard
        await copyToClipboard(`${shareText}\n${shareUrl}`);
        if (typeof alert !== 'undefined') {
          alert('Link copied to clipboard!');
        }
      }
    } else {
      // Native sharing
      try {
        await Share.share({
          message: `${shareText}\n${shareUrl}`,
          title: contentData.name || 'Check this out on M1A',
        });
        await trackShare(contentType, contentId, 'native');
      } catch (shareError) {
        // User cancelled, that's okay
        if (shareError.message !== 'User did not share') {
          // Real error, try clipboard fallback
          await copyToClipboard(`${shareText}\n${shareUrl}`);
        }
      }
    }

    await trackFeatureUsage('share_content', { contentType, contentId });
    return { success: true };
  } catch (error) {
    console.error('Error sharing content:', error);
    // Final fallback: try to copy to clipboard
    try {
      const shareUrl = `https://m1a.app/${contentType}/${contentId}`;
      await copyToClipboard(shareUrl);
      if (typeof alert !== 'undefined') {
        alert('Link copied to clipboard!');
      }
    } catch (clipboardError) {
      console.error('Clipboard fallback also failed:', clipboardError);
    }
    return { success: false, error: error.message };
  }
};

// Share referral link
export const shareReferral = async (userId) => {
  try {
    const link = await getReferralLink(userId);
    if (!link) {
      throw new Error('Failed to generate referral link');
    }

    const shareText = `Join me on M1A! Use my referral code to get started: ${link}`;

    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({
          title: 'Join me on M1A',
          text: shareText,
          url: link,
        });
      } else {
        await copyToClipboard(shareText);
        alert('Referral link copied to clipboard!');
      }
    } else {
      await Share.share({
        message: shareText,
        title: 'Join me on M1A',
      });
    }

    await trackShare('referral', userId, 'referral');
    await trackFeatureUsage('share_referral', { userId });
    
    // Record positive action for rating prompt
    await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.SHARE_APP, {
      type: 'referral',
      userId,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sharing referral:', error);
    return { success: false, error: error.message };
  }
};

// Invite friends via email/SMS
export const inviteFriends = async (contacts, message) => {
  try {
    const defaultMessage = message || 'Join me on M1A! Download the app and connect with amazing artists and events.';
    
    if (Platform.OS === 'web') {
      // Web: Open mailto link
      const mailtoLink = `mailto:?subject=Join me on M1A&body=${encodeURIComponent(defaultMessage)}`;
      window.open(mailtoLink);
    } else {
      // Native: Use share sheet
      await Share.share({
        message: defaultMessage,
        title: 'Invite Friends to M1A',
      });
    }

    await trackFeatureUsage('invite_friends', { contactCount: contacts?.length || 0 });
    
    // Record positive action for rating prompt
    await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.SHARE_APP, {
      type: 'invite_friends',
      contactCount: contacts?.length || 0,
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error inviting friends:', error);
    return { success: false, error: error.message };
  }
};

// Track referral usage
export const trackReferralUsage = async (referralCode, userId) => {
  try {
    // Store referral tracking
    await AsyncStorage.setItem(`referral_used_${userId}`, referralCode);
    await trackFeatureUsage('referral_used', { referralCode, userId });
    return { success: true };
  } catch (error) {
    console.error('Error tracking referral:', error);
    return { success: false, error: error.message };
  }
};

// Check if user has referral rewards
export const getReferralRewards = async (userId) => {
  try {
    // This would typically fetch from Firestore
    // For now, return mock data
    return {
      totalReferrals: 0,
      pendingRewards: 0,
      redeemedRewards: 0,
      referralCode: await getReferralCode(userId),
    };
  } catch (error) {
    console.error('Error getting referral rewards:', error);
    return null;
  }
};

// Helper: Generate share text
const generateShareText = (contentType, contentData) => {
  switch (contentType) {
    case 'event':
      return `Check out this amazing event: ${contentData.name}! ${contentData.description || ''}`;
    case 'service':
      return `I found this great service on M1A: ${contentData.name}! ${contentData.description || ''}`;
    case 'bar':
      return `Check out the bar menu on M1A! ${contentData.name || 'Great drinks and food available.'}`;
    default:
      return `Check this out on M1A: ${contentData.name || 'Something amazing!'}`;
  }
};

// Helper: Copy to clipboard (web)
const copyToClipboard = async (text) => {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(text);
  } else {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard').default;
      await Clipboard.setString(text);
    } catch (error) {
      console.warn('Clipboard not available:', error);
    }
  }
};

export default {
  getReferralCode,
  getReferralLink,
  shareContent,
  shareReferral,
  inviteFriends,
  trackReferralUsage,
  getReferralRewards,
};

