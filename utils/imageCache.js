// utils/imageCache.js
// Image caching and optimization utilities

import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';

class ImageCache {
  constructor() {
    this.cacheDir = `${FileSystem.cacheDirectory}images/`;
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50; // Maximum number of images in memory
  }

  /**
   * Initialize cache directory
   */
  async init() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, { intermediates: true });
      }
    } catch (error) {
      console.warn('Failed to initialize image cache directory:', error);
    }
  }

  /**
   * Get cache key from URL
   * @param {string} url - Image URL
   * @returns {string} Cache key
   */
  getCacheKey(url) {
    if (!url) return null;
    // Use URL hash or filename as cache key
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1].split('?')[0];
    return filename || url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Get cached image URI
   * @param {string} url - Image URL
   * @returns {string|null} Cached URI or null
   */
  async getCachedUri(url) {
    if (!url) return null;

    // Check memory cache first
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url);
    }

    // Check disk cache
    const cacheKey = this.getCacheKey(url);
    if (!cacheKey) return null;

    const cachedPath = `${this.cacheDir}${cacheKey}`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      if (fileInfo.exists) {
        // Add to memory cache
        this.addToMemoryCache(url, cachedPath);
        return cachedPath;
      }
    } catch (error) {
      console.warn('Error checking cached image:', error);
    }

    return null;
  }

  /**
   * Cache image to disk
   * @param {string} url - Image URL
   * @param {string} localUri - Local file URI
   */
  async cacheImage(url, localUri) {
    if (!url || !localUri) return;

    const cacheKey = this.getCacheKey(url);
    if (!cacheKey) return;

    const cachedPath = `${this.cacheDir}${cacheKey}`;
    try {
      // Copy file to cache directory
      await FileSystem.copyAsync({
        from: localUri,
        to: cachedPath,
      });
      // Add to memory cache
      this.addToMemoryCache(url, cachedPath);
    } catch (error) {
      console.warn('Error caching image:', error);
    }
  }

  /**
   * Add to memory cache
   * @param {string} url - Image URL
   * @param {string} uri - Local URI
   */
  addToMemoryCache(url, uri) {
    // Enforce max size
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(url, uri);
  }

  /**
   * Preload image
   * @param {string} url - Image URL
   */
  async preload(url) {
    if (!url) return;

    // Check if already cached
    const cachedUri = await this.getCachedUri(url);
    if (cachedUri) return cachedUri;

    try {
      // Download and cache
      const downloadResult = await FileSystem.downloadAsync(
        url,
        `${this.cacheDir}${this.getCacheKey(url)}`
      );
      this.addToMemoryCache(url, downloadResult.uri);
      return downloadResult.uri;
    } catch (error) {
      console.warn('Error preloading image:', error);
      return null;
    }
  }

  /**
   * Clear cache
   */
  async clear() {
    try {
      this.memoryCache.clear();
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      await Promise.all(
        files.map(file => FileSystem.deleteAsync(`${this.cacheDir}${file}`, { idempotent: true }))
      );
    } catch (error) {
      console.warn('Error clearing image cache:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.cacheDir);
      let totalSize = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.cacheDir}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }
      return totalSize;
    } catch (error) {
      console.warn('Error getting cache size:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const imageCache = new ImageCache();

// Initialize on import
imageCache.init();

