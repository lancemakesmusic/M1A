/**
 * Admin Security Utilities
 * Ensures only admin@merkabaent.com can access admin panels
 */

/**
 * Check if current user is admin@merkabaent.com
 * @param {Object} user - Auth user object
 * @returns {boolean} - True if user is admin@merkabaent.com
 */
export function isAdminUser(user) {
  return user?.email === 'admin@merkabaent.com';
}

/**
 * Get admin access check result
 * @param {Object} user - Auth user object
 * @param {boolean} isAdminEmail - From RoleContext (checks admin email list)
 * @returns {boolean} - True if user can access admin panels
 */
export function canAccessAdminPanel(user, isAdminEmail) {
  // SECURITY: Only admin@merkabaent.com can access admin panels
  return isAdminEmail && user?.email === 'admin@merkabaent.com';
}

/**
 * Handle unauthorized access attempt
 * @param {Object} navigation - Navigation object
 */
export function handleUnauthorizedAccess(navigation) {
  if (navigation) {
    navigation.goBack();
  }
}

