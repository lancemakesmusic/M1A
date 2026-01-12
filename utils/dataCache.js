// utils/dataCache.js
// Comprehensive caching system for frequently accessed data

class DataCache {
  constructor(defaultTtl = 5 * 60 * 1000) {
    // Default: 5 minutes TTL
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    this.maxSize = 100; // Maximum number of cached items
  }

  /**
   * Generate a cache key from parameters
   * @param {string} prefix - Cache prefix (e.g., 'events', 'users')
   * @param {object} params - Parameters to include in key
   * @returns {string} Cache key
   */
  generateKey(prefix, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}${paramString ? `|${paramString}` : ''}`;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {object|null} Cached data or null if expired/missing
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // Expired
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, data, ttl = null) {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  /**
   * Invalidate cache by prefix
   * @param {string} prefix - Cache prefix to invalidate
   */
  invalidate(prefix) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate specific cache key
   * @param {string} key - Cache key to invalidate
   */
  invalidateKey(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.cache.values()) {
      if (now - cached.timestamp > cached.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      maxSize: this.maxSize,
    };
  }
}

// Export singleton instance
export const dataCache = new DataCache(5 * 60 * 1000); // 5 minutes default TTL

// Specialized cache instances with different TTLs
export const eventsCache = new DataCache(10 * 60 * 1000); // 10 minutes for events
export const usersCache = new DataCache(5 * 60 * 1000); // 5 minutes for users
export const servicesCache = new DataCache(10 * 60 * 1000); // 10 minutes for services
export const imageCache = new DataCache(30 * 60 * 1000); // 30 minutes for images

