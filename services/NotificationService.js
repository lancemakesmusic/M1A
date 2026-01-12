/**
 * Notification Service
 * Handles push notifications for messages, events, discounts, and more
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior - Corporate grade like WhatsApp/Facebook
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Always show alerts, play sound, and set badge for messages
    const isMessage = notification.request.content.data?.type === 'message';
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Priority for messages
      priority: isMessage ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
    };
  },
});

let notificationListener = null;
let responseListener = null;

// Initialize notifications
export const initNotifications = async () => {
  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    // Get push token
    if (Platform.OS !== 'web') {
      const token = await Notifications.getExpoPushTokenAsync();
      await AsyncStorage.setItem('expo_push_token', token.data);
      console.log('✅ Push token:', token.data);
    }

    // Set up notification listeners
    notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      // Play haptic feedback for message notifications
      if (notification.request.content.data?.type === 'message') {
        import('expo-haptics').then(({ default: Haptics }) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }).catch(() => {});
      }
    });

    responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle message notification tap - navigate to conversation
      if (data?.type === 'message' && data?.conversationId) {
        // This will be handled by the navigation system
        // Store the conversation ID to navigate when app opens
        import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
          AsyncStorage.setItem('pending_navigation', JSON.stringify({
            screen: 'Messages',
            params: { conversationId: data.conversationId },
          })).catch(() => {});
        }).catch(() => {});
      }
    });

    return true;
  } catch (error) {
    console.warn('⚠️ Notification initialization failed:', error);
    return false;
  }
};

// Schedule event reminder notification
export const scheduleEventReminder = async (eventDate, eventTitle, eventId = null) => {
  try {
    // Validate inputs
    if (!eventDate || !(eventDate instanceof Date)) {
      throw new Error('Invalid event date');
    }
    if (eventDate < new Date()) {
      throw new Error('Event date cannot be in the past');
    }
    if (!eventTitle || typeof eventTitle !== 'string') {
      throw new Error('Event title is required');
    }

    const trigger = new Date(eventDate);
    trigger.setHours(trigger.getHours() - 24); // 24 hours before event
    
    // Don't schedule if reminder time is in the past
    if (trigger < new Date()) {
      console.warn('⚠️ Event reminder time is in the past, not scheduling');
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event Reminder',
        body: `Your event "${eventTitle}" is tomorrow!`,
        data: { type: 'event_reminder', eventId: eventId || 'unknown' },
        sound: true,
      },
      trigger,
    });

    console.log('✅ Event reminder scheduled');
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to schedule event reminder:', error);
    return false;
  }
};

// Send order status update
export const sendOrderStatusUpdate = async (orderData) => {
  try {
    // Validate inputs
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Invalid order data');
    }
    if (!orderData.id) {
      throw new Error('Order ID is required');
    }
    if (!orderData.status || typeof orderData.status !== 'string') {
      throw new Error('Order status is required');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Order Update',
        body: `Your order #${orderData.id} status: ${orderData.status}`,
        data: { type: 'order_update', orderId: orderData.id },
        sound: true,
      },
      trigger: null, // Send immediately
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to send order update:', error);
    return false;
  }
};

// Send payment confirmation
export const sendPaymentConfirmation = async (paymentData) => {
  try {
    // Validate inputs
    if (!paymentData || typeof paymentData !== 'object') {
      throw new Error('Invalid payment data');
    }
    if (!paymentData.amount || typeof paymentData.amount !== 'number' || paymentData.amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    if (!paymentData.id) {
      throw new Error('Payment ID is required');
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Payment Confirmed',
        body: `Payment of $${paymentData.amount.toFixed(2)} has been processed successfully.`,
        data: { type: 'payment_confirmation', paymentId: paymentData.id },
        sound: true,
      },
      trigger: null, // Send immediately
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to send payment confirmation:', error);
    return false;
  }
};

// Send booking reminder
export const sendBookingReminder = async (bookingData) => {
  try {
    // Validate inputs
    if (!bookingData || typeof bookingData !== 'object') {
      throw new Error('Invalid booking data');
    }
    if (!bookingData.date) {
      throw new Error('Booking date is required');
    }
    if (!bookingData.serviceName || typeof bookingData.serviceName !== 'string') {
      throw new Error('Service name is required');
    }
    
    const bookingDate = new Date(bookingData.date);
    if (isNaN(bookingDate.getTime())) {
      throw new Error('Invalid booking date');
    }
    if (bookingDate < new Date()) {
      throw new Error('Booking date cannot be in the past');
    }
    
    const trigger = new Date(bookingDate);
    trigger.setHours(trigger.getHours() - 2); // 2 hours before booking
    
    // Don't schedule if reminder time is in the past
    if (trigger < new Date()) {
      console.warn('⚠️ Booking reminder time is in the past, not scheduling');
      return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Booking Reminder',
        body: `Your booking for "${bookingData.serviceName}" is in 2 hours!`,
        data: { type: 'booking_reminder', bookingId: bookingData.id },
        sound: true,
      },
      trigger,
    });
  } catch (error) {
    console.warn('⚠️ Failed to send booking reminder:', error);
  }
};

// Send personalized M1A tip
export const sendM1ATip = async (tipData) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💡 M1A Tip',
        body: tipData.message,
        data: { type: 'm1a_tip', tipId: tipData.id },
        sound: true,
      },
      trigger: { seconds: 3600 }, // Send in 1 hour (or customize)
    });
  } catch (error) {
    console.warn('⚠️ Failed to send M1A tip:', error);
  }
};

// Send engagement notification
export const sendEngagementNotification = async (engagementData) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: engagementData.title,
        body: engagementData.message,
        data: { type: 'engagement', ...engagementData },
        sound: true,
      },
      trigger: null, // Send immediately
    });
  } catch (error) {
    console.warn('⚠️ Failed to send engagement notification:', error);
  }
};

// Cancel all notifications
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.warn('⚠️ Failed to cancel notifications:', error);
  }
};

// Get all scheduled notifications
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn('⚠️ Failed to get scheduled notifications:', error);
    return [];
  }
};

// Send message notification
export const sendMessageNotification = async (messageData, preferences) => {
  try {
    // Check if user has message notifications enabled
    if (!preferences?.enabled || !preferences?.messages?.enabled) {
      return false;
    }

    const notificationType = messageData.isMention ? 'mentions' : 'newMessage';
    if (!preferences?.messages?.[notificationType]) {
      return false;
    }

    // Corporate-grade notification like WhatsApp/Facebook/Instagram
    await Notifications.scheduleNotificationAsync({
      content: {
        title: messageData.senderName || 'New Message',
        body: messageData.text || 'You have a new message',
        data: {
          type: 'message',
          conversationId: messageData.conversationId,
          messageId: messageData.id,
          senderId: messageData.senderId,
        },
        sound: true, // Play sound
        badge: 1, // Red badge indicator
        priority: 'high', // High priority for messages
        vibrate: [0, 250, 250, 250], // Vibration pattern
        categoryId: 'MESSAGE', // Message category
      },
      trigger: null, // Send immediately
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to send message notification:', error);
    return false;
  }
};

// Send event notification
export const sendEventNotification = async (eventData, preferences, notificationType = 'newEvent') => {
  try {
    // Check if user has event notifications enabled
    if (!preferences?.enabled || !preferences?.events?.enabled) {
      return false;
    }

    if (!preferences?.events?.[notificationType]) {
      return false;
    }

    let title, body;
    switch (notificationType) {
      case 'reminder':
        title = 'Event Reminder';
        body = `Your event "${eventData.title}" is ${eventData.reminderTime || 'soon'}!`;
        break;
      case 'newEvent':
        title = 'New Event Available';
        body = `Check out "${eventData.title}" - ${eventData.description || 'New event in your area'}`;
        break;
      case 'eventUpdate':
        title = 'Event Updated';
        body = `"${eventData.title}" has been updated`;
        break;
      case 'cancellation':
        title = 'Event Cancelled';
        body = `"${eventData.title}" has been cancelled`;
        break;
      default:
        title = 'Event Notification';
        body = eventData.title || 'You have an event update';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'event',
          eventId: eventData.id,
          notificationType,
        },
        sound: true,
      },
      trigger: notificationType === 'reminder' && eventData.reminderDate
        ? eventData.reminderDate
        : null, // Send immediately for others
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to send event notification:', error);
    return false;
  }
};

// Send discount/promotion notification
export const sendDiscountNotification = async (discountData, preferences, notificationType = 'newDeal') => {
  try {
    // Check if user has discount notifications enabled
    if (!preferences?.enabled || !preferences?.discounts?.enabled) {
      return false;
    }

    if (!preferences?.discounts?.[notificationType]) {
      return false;
    }

    let title, body;
    switch (notificationType) {
      case 'newDeal':
        title = '🎉 New Deal Available!';
        body = `${discountData.title || 'Special offer'}: ${discountData.description || 'Check it out now!'}`;
        break;
      case 'priceDrop':
        title = '💰 Price Drop!';
        body = `${discountData.itemName} is now ${discountData.discountPercent || 'on sale'}!`;
        break;
      case 'flashSale':
        title = '⚡ Flash Sale!';
        body = `${discountData.title || 'Limited time offer'} - ${discountData.timeRemaining || 'Ending soon!'}`;
        break;
      case 'personalizedOffer':
        title = '🎁 Personalized Offer';
        body = `${discountData.title || 'Special offer just for you'}: ${discountData.description || 'Check it out!'}`;
        break;
      default:
        title = 'Special Offer';
        body = discountData.title || 'You have a new discount available';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'discount',
          discountId: discountData.id,
          notificationType,
        },
        sound: true,
      },
      trigger: null, // Send immediately
    });
    return true;
  } catch (error) {
    console.warn('⚠️ Failed to send discount notification:', error);
    return false;
  }
};

// Cleanup listeners
export const cleanupNotifications = () => {
  if (notificationListener) {
    Notifications.removeNotificationSubscription(notificationListener);
  }
  if (responseListener) {
    Notifications.removeNotificationSubscription(responseListener);
  }
};

export default {
  initNotifications,
  scheduleEventReminder,
  sendOrderStatusUpdate,
  sendPaymentConfirmation,
  sendBookingReminder,
  sendM1ATip,
  sendEngagementNotification,
  sendMessageNotification,
  sendEventNotification,
  sendDiscountNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  cleanupNotifications,
};

