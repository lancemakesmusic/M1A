/**
 * Offline Service
 * Handles offline data caching and sync when back online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = 'm1a_cache_';
const SYNC_QUEUE_KEY = 'm1a_sync_queue';

class OfflineService {
  /**
   * Check if device is online
   */
  async isOnline() {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected && state.isInternetReachable;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false;
    }
  }

  /**
   * Cache data locally
   */
  async cacheData(key, data, ttl = 3600000) { // Default 1 hour TTL
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
      return true;
    } catch (error) {
      console.error('Error caching data:', error);
      return false;
    }
  }

  /**
   * Get cached data
   */
  async getCachedData(key) {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Add action to sync queue
   */
  async queueAction(action) {
    try {
      const queue = await this.getSyncQueue();
      queue.push({
        ...action,
        queuedAt: Date.now(),
        id: `action_${Date.now()}_${Math.random()}`,
      });
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('Error queueing action:', error);
      return false;
    }
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing sync queue:', error);
      return false;
    }
  }

  /**
   * Process sync queue when back online
   */
  async processSyncQueue(processAction) {
    try {
      const isConnected = await this.isOnline();
      if (!isConnected) {
        console.log('Still offline, skipping sync');
        return { processed: 0, failed: 0 };
      }

      const queue = await this.getSyncQueue();
      if (queue.length === 0) {
        return { processed: 0, failed: 0 };
      }

      let processed = 0;
      let failed = 0;
      const remaining = [];

      for (const action of queue) {
        try {
          if (processAction) {
            await processAction(action);
          }
          processed++;
        } catch (error) {
          console.error('Error processing queued action:', error);
          failed++;
          // Keep failed actions for retry (limit to prevent infinite queue)
          if (remaining.length < 50) {
            remaining.push(action);
          }
        }
      }

      // Update queue with remaining failed actions
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));

      return { processed, failed, remaining: remaining.length };
    } catch (error) {
      console.error('Error processing sync queue:', error);
      return { processed: 0, failed: 0 };
    }
  }

  /**
   * Clear expired cache
   */
  async clearExpiredCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      const now = Date.now();
      let cleared = 0;

      for (const key of cacheKeys) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached) {
            const cacheItem = JSON.parse(cached);
            if (now - cacheItem.timestamp > cacheItem.ttl) {
              await AsyncStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          await AsyncStorage.removeItem(key);
          cleared++;
        }
      }

      return cleared;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache size (approximate)
   */
  async getCacheSize() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      let totalSize = 0;

      for (const key of cacheKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        } catch (error) {
          // Skip errors
        }
      }

      return totalSize;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAllCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(cacheKeys);
      return cacheKeys.length;
    } catch (error) {
      console.error('Error clearing all cache:', error);
      return 0;
    }
  }
}

export default new OfflineService();

