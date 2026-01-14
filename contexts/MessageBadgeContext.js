// contexts/MessageBadgeContext.js
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  /**
   * Calculate total unread count from all conversations
   */
  const calculateUnreadCount = useCallback((uid) => {
    if (!uid || !isFirebaseReady() || !db || typeof db.collection === 'function') {
      setUnreadCount(0);
      setLoading(false);
      return null;
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

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up unread count listener:', error);
      setUnreadCount(0);
      setLoading(false);
      return null;
    }
  }, []);

  // Set up real-time listener for unread counts
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const unsubscribe = calculateUnreadCount(user.uid);
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
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

