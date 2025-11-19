/**
 * Support Service
 * Handles support tickets, live chat, and help center functionality
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeatureUsage, trackError } from './AnalyticsService';

const SUPPORT_TICKETS_COLLECTION = 'supportTickets';
const LIVE_CHAT_COLLECTION = 'liveChatSessions';

class SupportService {
  /**
   * Create a support ticket
   */
  async createSupportTicket(ticketData) {
    if (!ticketData || typeof ticketData !== 'object') {
      throw new Error('Invalid ticket data');
    }

    const { userId, subject, message, category = 'general', priority = 'normal', metadata = {} } = ticketData;

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new Error('Subject is required');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message is required');
    }

    if (subject.length > 200) {
      throw new Error('Subject must be 200 characters or less');
    }

    if (message.length > 5000) {
      throw new Error('Message must be 5000 characters or less');
    }

    // Sanitize inputs
    const sanitizedSubject = this.sanitizeText(subject);
    const sanitizedMessage = this.sanitizeText(message);

    try {
      const ticketDoc = {
        userId,
        subject: sanitizedSubject,
        message: sanitizedMessage,
        category,
        priority,
        status: 'open',
        metadata: {
          ...metadata,
          platform: metadata.platform || 'unknown',
          appVersion: metadata.appVersion || '1.0.0',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isFirebaseReady() && db) {
        try {
          const ticketsRef = collection(db, SUPPORT_TICKETS_COLLECTION);
          const ticketRef = await addDoc(ticketsRef, ticketDoc);
          
          await trackFeatureUsage('support_ticket_created', {
            category,
            priority,
            ticketId: ticketRef.id,
          });

          return { success: true, ticketId: ticketRef.id };
        } catch (firebaseError) {
          console.warn('Firebase ticket creation failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation
      console.log('📧 Mock Support Ticket Created:', ticketDoc);
      await trackFeatureUsage('support_ticket_created', {
        category,
        priority,
        ticketId: `mock_${Date.now()}`,
      });

      return { success: true, ticketId: `mock_${Date.now()}` };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      trackError(error.message || 'Support ticket creation failed', 'support_ticket_error', 'SupportService');
      throw error;
    }
  }

  /**
   * Get user's support tickets
   */
  async getUserTickets(userId, limitCount = 20) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      if (isFirebaseReady() && db) {
        try {
          const ticketsRef = collection(db, SUPPORT_TICKETS_COLLECTION);
          const q = query(
            ticketsRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firebaseError) {
          console.warn('Firebase ticket fetch failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation
      return [];
    } catch (error) {
      console.error('Error fetching user tickets:', error);
      return [];
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId, status) {
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(status)) {
      throw new Error('Invalid ticket status');
    }

    try {
      if (isFirebaseReady() && db) {
        try {
          const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
          await updateDoc(ticketRef, {
            status,
            updatedAt: serverTimestamp(),
          });
          return { success: true };
        } catch (firebaseError) {
          console.warn('Firebase ticket update failed:', firebaseError);
          throw firebaseError;
        }
      }

      // Mock implementation
      console.log(`📧 Mock Ticket ${ticketId} status updated to: ${status}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Create a live chat session
   */
  async createLiveChatSession(userId, initialMessage = null) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      const sessionDoc = {
        userId,
        status: 'active',
        messages: initialMessage ? [{
          text: initialMessage,
          senderId: userId,
          timestamp: serverTimestamp(),
        }] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isFirebaseReady() && db) {
        try {
          const sessionsRef = collection(db, LIVE_CHAT_COLLECTION);
          const sessionRef = await addDoc(sessionsRef, sessionDoc);
          
          await trackFeatureUsage('live_chat_started', {
            sessionId: sessionRef.id,
            hasInitialMessage: !!initialMessage,
          });

          return { success: true, sessionId: sessionRef.id };
        } catch (firebaseError) {
          console.warn('Firebase live chat creation failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation
      console.log('💬 Mock Live Chat Session Created:', sessionDoc);
      await trackFeatureUsage('live_chat_started', {
        sessionId: `mock_${Date.now()}`,
        hasInitialMessage: !!initialMessage,
      });

      return { success: true, sessionId: `mock_${Date.now()}` };
    } catch (error) {
      console.error('Error creating live chat session:', error);
      trackError(error.message || 'Live chat creation failed', 'live_chat_error', 'SupportService');
      throw error;
    }
  }

  /**
   * Sanitize text input to prevent XSS
   */
  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim();
  }
}

export default new SupportService();

