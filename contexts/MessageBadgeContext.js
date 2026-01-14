// contexts/MessageBadgeContext.js
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { db, isFirebaseReady } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const MessageBadgeContext = createContext();

export function MessageBadgeProvider({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  /**
   * Calculate total unread count from all conversations
   */
  const calculateUnreadCount = useCallback((uid) => {
    // Clean up previous listener if it exists
    if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
      try {
        unsubscribeRef.current();
      } catch (error) {
        console.warn('Error cleaning up previous listener:', error);
      }
      unsubscribeRef.current = null;
    }

    if (!uid || !isFirebaseReady() || !db || typeof db.collection !== 'function') {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', uid)
      );

      const unsubscribe = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          let totalUnread = 0;
          snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const userUnread = data.unreadCount?.[uid] || 0;
            totalUnread += userUnread;
          });
          
          setUnreadCount(totalUnread);
          setLoading(false);
          
          // Update app badge count
          if (Platform.OS !== 'web') {
            Notifications.setBadgeCountAsync(totalUnread).catch(err => {
              console.warn('Failed to set badge count:', err);
            });
          }
          
          console.log(`🔴 Total unread messages: ${totalUnread}`);
        },
        (error) => {
          console.error('Error calculating unread count:', error);
          setUnreadCount(0);
          setLoading(false);
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Error setting up unread count listener:', error);
      setUnreadCount(0);
      setLoading(false);
      unsubscribeRef.current = null;
    }
  }, []);

  // Set up real-time listener for unread counts
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    calculateUnreadCount(user.uid);
    
    return () => {
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        try {
          unsubscribeRef.current();
        } catch (error) {
          console.warn('Error unsubscribing:', error);
        }
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, calculateUnreadCount]);

  const value = {
    unreadCount,
    loading,
    refreshCount: () => calculateUnreadCount(user?.uid),
  };

  return (
    <MessageBadgeContext.Provider value={value}>
      {children}
    </MessageBadgeContext.Provider>
  );
}

/**
 * Hook to access message badge context
 */
export function useMessageBadge() {
  const context = useContext(MessageBadgeContext);
  if (!context) {
    throw new Error('useMessageBadge must be used within a MessageBadgeProvider');
  }
  return context;
}

