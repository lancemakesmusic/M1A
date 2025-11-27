// utils/statsCache.js
// Cache for user stats to reduce Firestore queries

class StatsCache {
  constructor(ttl = 5 * 60 * 1000) {
    // Default: 5 minutes TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Get cached stats for a user
   * @param {string} userId - User ID
   * @returns {object|null} Cached stats or null if expired/missing
   */
  get(userId) {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      // Expired
      this.cache.delete(userId);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached stats for a user
   * @param {string} userId - User ID
   * @param {object} stats - Stats data
   */
  set(userId, stats) {
    this.cache.set(userId, {
      data: stats,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache for a user
   * @param {string} userId - User ID
   */
  invalidate(userId) {
    this.cache.delete(userId);
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
  }
}

export const statsCache = new StatsCache(5 * 60 * 1000); // 5 minutes

