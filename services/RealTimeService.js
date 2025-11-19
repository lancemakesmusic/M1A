/**
 * Real-Time Service
 * Handles real-time updates for events, orders, notifications, and activity feeds
 */

import { collection, query, where, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeatureUsage } from './AnalyticsService';

class RealTimeService {
  /**
   * Subscribe to real-time event updates
   */
  subscribeToEventUpdates(eventId, callback) {
    if (!eventId || !callback) {
      throw new Error('Event ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      // Mock implementation
      console.warn('Real-time event updates not available in mock mode');
      return () => {}; // Return unsubscribe function
    }

    try {
      const eventRef = doc(db, 'events', eventId);
      
      const unsubscribe = onSnapshot(
        eventRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const eventData = { id: snapshot.id, ...snapshot.data() };
            callback(eventData);
            
            // Track real-time update
            trackFeatureUsage('realtime_event_update', {
              eventId,
              updateType: 'event_updated',
            });
          }
        },
        (error) => {
          console.error('Error in real-time event subscription:', error);
          callback(null, error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up event subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to real-time order status updates
   */
  subscribeToOrderStatus(orderId, callback) {
    if (!orderId || !callback) {
      throw new Error('Order ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      // Mock implementation
      console.warn('Real-time order updates not available in mock mode');
      return () => {};
    }

    try {
      const orderRef = doc(db, 'barOrders', orderId);
      
      const unsubscribe = onSnapshot(
        orderRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const orderData = { id: snapshot.id, ...snapshot.data() };
            callback(orderData);
            
            // Track real-time update
            trackFeatureUsage('realtime_order_update', {
              orderId,
              status: orderData.status,
            });
          }
        },
        (error) => {
          console.error('Error in real-time order subscription:', error);
          callback(null, error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up order subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to user's order status updates
   */
  subscribeToUserOrders(userId, callback) {
    if (!userId || !callback) {
      throw new Error('User ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.warn('Real-time user orders not available in mock mode');
      return () => {};
    }

    try {
      const ordersRef = collection(db, 'barOrders');
      const q = query(
        ordersRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(orders);
        },
        (error) => {
          console.error('Error in user orders subscription:', error);
          callback([], error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up user orders subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to live activity feed
   */
  subscribeToActivityFeed(userId, callback, limitCount = 50) {
    if (!userId || !callback) {
      throw new Error('User ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.warn('Real-time activity feed not available in mock mode');
      return () => {};
    }

    try {
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));
          callback(activities);
        },
        (error) => {
          console.error('Error in activity feed subscription:', error);
          callback([], error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up activity feed subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to global activity feed (for discovery)
   */
  subscribeToGlobalActivityFeed(callback, limitCount = 100) {
    if (!callback) {
      throw new Error('Callback is required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.warn('Real-time global activity feed not available in mock mode');
      return () => {};
    }

    try {
      const activitiesRef = collection(db, 'activities');
      const q = query(
        activitiesRef,
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));
          callback(activities);
        },
        (error) => {
          console.error('Error in global activity feed subscription:', error);
          callback([], error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up global activity feed subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(userId, callback) {
    if (!userId || !callback) {
      throw new Error('User ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.warn('Real-time notifications not available in mock mode');
      return () => {};
    }

    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          }));
          callback(notifications);
        },
        (error) => {
          console.error('Error in notifications subscription:', error);
          callback([], error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notifications subscription:', error);
      return () => {};
    }
  }

  /**
   * Subscribe to real-time collaboration (e.g., shared event editing)
   */
  subscribeToCollaboration(roomId, callback) {
    if (!roomId || !callback) {
      throw new Error('Room ID and callback are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.warn('Real-time collaboration not available in mock mode');
      return () => {};
    }

    try {
      const collaborationRef = collection(db, 'collaborations', roomId, 'updates');
      const q = query(
        collaborationRef,
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const updates = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));
          callback(updates);
        },
        (error) => {
          console.error('Error in collaboration subscription:', error);
          callback([], error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up collaboration subscription:', error);
      return () => {};
    }
  }

  /**
   * Create activity feed entry
   */
  async createActivity(userId, activityType, activityData) {
    if (!userId || !activityType) {
      throw new Error('User ID and activity type are required');
    }

    if (!isFirebaseReady() || !db || typeof db.collection === 'function') {
      console.log('📊 Mock Activity Created:', { userId, activityType, activityData });
      return { success: true, id: `mock_${Date.now()}` };
    }

    try {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      const activitiesRef = collection(db, 'activities');
      
      const activity = {
        userId,
        type: activityType,
        ...activityData,
        timestamp: serverTimestamp(),
      };

      const activityRef = await addDoc(activitiesRef, activity);
      
      // Track activity creation
      trackFeatureUsage('activity_created', {
        activityType,
        userId,
      });

      return { success: true, id: activityRef.id };
    } catch (error) {
      console.error('Error creating activity:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new RealTimeService();

