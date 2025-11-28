/**
 * Accessibility Utilities
 * Provides consistent accessibility labels and hints across the application
 */

/**
 * Common accessibility labels
 */
export const AccessibilityLabels = {
  // Navigation
  BACK_BUTTON: 'Go back',
  MENU_BUTTON: 'Open navigation menu',
  CLOSE_BUTTON: 'Close',
  
  // Actions
  SAVE_BUTTON: 'Save changes',
  CANCEL_BUTTON: 'Cancel',
  DELETE_BUTTON: 'Delete',
  EDIT_BUTTON: 'Edit',
  ADD_BUTTON: 'Add new item',
  SEARCH_BUTTON: 'Search',
  FILTER_BUTTON: 'Filter results',
  REFRESH_BUTTON: 'Refresh content',
  
  // Posts & Content
  POST_IMAGE: 'Post image',
  POST_VIDEO: 'Post video',
  POST_LIKE: 'Like this post',
  POST_COMMENT: 'Comment on this post',
  POST_SHARE: 'Share this post',
  POST_DELETE: 'Delete this post',
  
  // Forms
  EMAIL_INPUT: 'Email address',
  PASSWORD_INPUT: 'Password',
  USERNAME_INPUT: 'Username',
  SEARCH_INPUT: 'Search',
  
  // Profile
  PROFILE_AVATAR: 'Profile picture',
  PROFILE_COVER: 'Cover photo',
  FOLLOW_BUTTON: 'Follow user',
  UNFOLLOW_BUTTON: 'Unfollow user',
  
  // Wallet
  WALLET_BALANCE: 'Wallet balance',
  ADD_MONEY: 'Add money to wallet',
  SEND_MONEY: 'Send money',
  PAYMENT_METHOD: 'Payment method',
  
  // Booking
  BOOK_SERVICE: 'Book service',
  BOOK_EVENT: 'Book event',
  SELECT_DATE: 'Select date',
  SELECT_TIME: 'Select time',
  
  // Auto-Poster
  GENERATE_CONTENT: 'Generate social media content',
  SCHEDULE_POST: 'Schedule post',
  POST_NOW: 'Post immediately',
  SELECT_PLATFORM: 'Select social media platform',
};

/**
 * Common accessibility hints
 */
export const AccessibilityHints = {
  BACK_BUTTON: 'Returns to the previous screen',
  SAVE_BUTTON: 'Saves your changes',
  DELETE_BUTTON: 'Permanently deletes this item',
  SEARCH_INPUT: 'Type to search for content',
  FILTER_BUTTON: 'Opens filter options',
  REFRESH_BUTTON: 'Reloads the current content',
  POST_LIKE: 'Double tap to like',
  FOLLOW_BUTTON: 'Follows this user to see their content',
  BOOK_SERVICE: 'Opens booking form for this service',
};

/**
 * Get accessibility props for a button
 */
export function getButtonAccessibilityProps(label, hint = null) {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint || AccessibilityHints[label] || undefined,
  };
}

/**
 * Get accessibility props for an input
 */
export function getInputAccessibilityProps(label, hint = null) {
  return {
    accessibilityRole: 'text',
    accessibilityLabel: label,
    accessibilityHint: hint || undefined,
  };
}

/**
 * Get accessibility props for an image
 */
export function getImageAccessibilityProps(description, isDecorative = false) {
  if (isDecorative) {
    return {
      accessibilityRole: 'image',
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no',
    };
  }
  
  return {
    accessibilityRole: 'image',
    accessibilityLabel: description,
  };
}

/**
 * Get accessibility props for a list item
 */
export function getListItemAccessibilityProps(label, hint = null) {
  return {
    accessibilityRole: 'button',
    accessibilityLabel: label,
    accessibilityHint: hint || undefined,
  };
}


