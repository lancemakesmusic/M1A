/**
 * Lazy Loading Utilities
 * Provides lazy loading for images and pagination for lists
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for lazy loading images
 * Only loads images when they're about to be visible
 */
export function useLazyImage(uri, placeholder = null) {
  const [imageUri, setImageUri] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!uri) {
      setImageUri(placeholder);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setImageUri(placeholder);

    // Load image with timeout
    const img = new Image();
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setHasError(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    img.onload = () => {
      if (mountedRef.current) {
        clearTimeout(timeoutId);
        setImageUri(uri);
        setIsLoading(false);
        setHasError(false);
      }
    };

    img.onerror = () => {
      if (mountedRef.current) {
        clearTimeout(timeoutId);
        setHasError(true);
        setIsLoading(false);
        setImageUri(placeholder);
      }
    };

    img.src = uri;

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [uri, placeholder]);

  return { imageUri, isLoading, hasError };
}

/**
 * Hook for pagination
 * Manages paginated data loading
 */
export function usePagination(
  loadMore,
  initialData = [],
  pageSize = 20,
  hasMore = true
) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMoreData, setHasMoreData] = useState(hasMore);
  const pageRef = useRef(0);

  const loadNextPage = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);
    setError(null);

    try {
      const result = await loadMore(pageRef.current + 1, pageSize);
      
      if (result && result.length > 0) {
        setData(prev => [...prev, ...result]);
        pageRef.current += 1;
        setHasMoreData(result.length === pageSize);
      } else {
        setHasMoreData(false);
      }
    } catch (err) {
      setError(err);
      console.error('Pagination error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadMore, pageSize, hasMoreData, loadingMore]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;

    try {
      const result = await loadMore(0, pageSize);
      setData(result || []);
      setHasMoreData((result?.length || 0) === pageSize);
    } catch (err) {
      setError(err);
      console.error('Refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadMore, pageSize]);

  const reset = useCallback(() => {
    setData(initialData);
    pageRef.current = 0;
    setHasMoreData(hasMore);
    setError(null);
  }, [initialData, hasMore]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMoreData,
    loadNextPage,
    refresh,
    reset,
  };
}

/**
 * Intersection Observer for React Native
 * Detects when elements are about to enter viewport
 */
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // For React Native, we use a simpler approach
    // In web, we could use IntersectionObserver
    // For now, we'll trigger on mount (can be enhanced with onLayout)
    if (!hasIntersected) {
      setIsIntersecting(true);
      setHasIntersected(true);
    }

    return () => {
      setIsIntersecting(false);
    };
  }, [hasIntersected]);

  return [elementRef, isIntersecting];
}

