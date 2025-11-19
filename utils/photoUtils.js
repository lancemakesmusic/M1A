/**
 * Photo Utilities
 * Centralized functions for getting user avatar and cover photo URLs
 * Ensures consistency across the entire app
 */

/**
 * Get the avatar URL for a user with proper fallback and cache-busting
 * @param {Object} user - User object from Firestore
 * @param {number} cacheBust - Optional cache-busting timestamp
 * @returns {string|null} - Avatar URL with cache-busting query param, or null if no avatar
 */
export function getAvatarUrl(user, cacheBust = null) {
  if (!user) return null;
  
  // Priority: avatarUrl > photoURL
  const avatarUrl = (user.avatarUrl && user.avatarUrl.trim() !== '') 
    ? user.avatarUrl 
    : (user.photoURL && user.photoURL.trim() !== '') 
      ? user.photoURL 
      : null;
  
  if (!avatarUrl) return null;
  
  // Add cache-busting query parameter
  const separator = avatarUrl.includes('?') ? '&' : '?';
  const timestamp = cacheBust || user.photoUpdatedAt || Date.now();
  return `${avatarUrl}${separator}t=${timestamp}`;
}

/**
 * Get the cover photo URL for a user with proper cache-busting
 * @param {Object} user - User object from Firestore
 * @param {number} cacheBust - Optional cache-busting timestamp
 * @returns {string|null} - Cover URL with cache-busting query param, or null if no cover
 */
export function getCoverUrl(user, cacheBust = null) {
  if (!user || !user.coverUrl || user.coverUrl.trim() === '') return null;
  
  // Add cache-busting query parameter
  const separator = user.coverUrl.includes('?') ? '&' : '?';
  const timestamp = cacheBust || user.coverUpdatedAt || Date.now();
  return `${user.coverUrl}${separator}t=${timestamp}`;
}

/**
 * Get avatar source object for Image component
 * @param {Object} user - User object from Firestore
 * @param {number} cacheBust - Optional cache-busting timestamp
 * @param {string} fallbackUrl - Optional fallback URL if no avatar
 * @returns {Object} - Source object for Image component
 */
export function getAvatarSource(user, cacheBust = null, fallbackUrl = null) {
  const avatarUrl = getAvatarUrl(user, cacheBust);
  
  if (avatarUrl) {
    return { uri: avatarUrl };
  }
  
  if (fallbackUrl) {
    return { uri: fallbackUrl };
  }
  
  // Return null to indicate no avatar (component should show placeholder)
  return null;
}

/**
 * Get cover photo source object for Image component
 * @param {Object} user - User object from Firestore
 * @param {number} cacheBust - Optional cache-busting timestamp
 * @returns {Object|null} - Source object for Image component or null
 */
export function getCoverSource(user, cacheBust = null) {
  const coverUrl = getCoverUrl(user, cacheBust);
  return coverUrl ? { uri: coverUrl } : null;
}

/**
 * Generate a unique key for Image component to force re-render
 * @param {Object} user - User object from Firestore
 * @param {string} prefix - Optional prefix for the key
 * @returns {string} - Unique key string
 */
export function getImageKey(user, prefix = 'avatar') {
  if (!user) return `${prefix}-${Date.now()}`;
  
  const photoUrl = user.avatarUrl || user.photoURL || '';
  const timestamp = user.photoUpdatedAt || user.coverUpdatedAt || Date.now();
  return `${prefix}-${photoUrl}-${timestamp}`;
}

/**
 * Check if user has an avatar
 * @param {Object} user - User object from Firestore
 * @returns {boolean} - True if user has an avatar
 */
export function hasAvatar(user) {
  if (!user) return false;
  return !!(user.avatarUrl && user.avatarUrl.trim() !== '') || 
         !!(user.photoURL && user.photoURL.trim() !== '');
}

/**
 * Check if user has a cover photo
 * @param {Object} user - User object from Firestore
 * @returns {boolean} - True if user has a cover photo
 */
export function hasCover(user) {
  if (!user) return false;
  return !!(user.coverUrl && user.coverUrl.trim() !== '');
}

