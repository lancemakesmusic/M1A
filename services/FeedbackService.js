/**
 * Feedback Service
 * Handles storing and retrieving user feedback, bug reports, feature requests, and surveys
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeedback, trackBugReport, trackFeatureRequest, trackSurvey, trackError } from './AnalyticsService';

const FEEDBACK_COLLECTION = 'feedback';
const SURVEY_COLLECTION = 'surveys';

class FeedbackService {
  /**
   * Submit feedback (bug report, feature request, improvement, other)
   */
  async submitFeedback(feedbackData) {
    if (!feedbackData || typeof feedbackData !== 'object') {
      throw new Error('Invalid feedback data');
    }

    const { userId, type, text, email, rating, metadata = {} } = feedbackData;

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!type || !['bug', 'feature', 'improvement', 'other'].includes(type)) {
      throw new Error('Invalid feedback type');
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Feedback text is required');
    }

    if (text.length > 1000) {
      throw new Error('Feedback text must be 1000 characters or less');
    }

    // Sanitize text to prevent XSS
    const sanitizedText = this.sanitizeText(text);
    const sanitizedEmail = email ? this.sanitizeEmail(email) : null;

    try {
      const feedbackDoc = {
        userId,
        type,
        text: sanitizedText,
        email: sanitizedEmail,
        rating: rating || null,
        metadata: {
          ...metadata,
          platform: metadata.platform || 'unknown',
          appVersion: metadata.appVersion || '1.0.0',
        },
        status: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (isFirebaseReady() && db) {
        try {
          const feedbackRef = collection(db, FEEDBACK_COLLECTION);
          await addDoc(feedbackRef, feedbackDoc);
          
          // Track feedback with dedicated analytics functions
          await trackFeedback(type, !!rating, !!sanitizedEmail, sanitizedText.length);
          
          // Track specific feedback types
          if (type === 'bug') {
            await trackBugReport(false, !!sanitizedEmail, 'normal');
          } else if (type === 'feature') {
            await trackFeatureRequest('general', !!sanitizedEmail, 'normal');
          }

          return { success: true, id: feedbackRef.id };
        } catch (firebaseError) {
          console.warn('Firebase feedback submission failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation for development
      console.log('📝 Mock Feedback Submitted:', feedbackDoc);
      await trackFeedback(type, !!rating, !!sanitizedEmail, sanitizedText.length);
      
      // Track specific feedback types
      if (type === 'bug') {
        await trackBugReport(false, !!sanitizedEmail, 'normal');
      } else if (type === 'feature') {
        await trackFeatureRequest('general', !!sanitizedEmail, 'normal');
      }

      return { success: true, id: `mock_${Date.now()}` };
    } catch (error) {
      console.error('Error submitting feedback:', error);
      trackError(error.message || 'Feedback submission failed', 'feedback_submission_error', 'FeedbackScreen');
      throw error;
    }
  }

  /**
   * Submit survey response
   */
  async submitSurvey(surveyData) {
    if (!surveyData || typeof surveyData !== 'object') {
      throw new Error('Invalid survey data');
    }

    const { userId, surveyId, responses, metadata = {} } = surveyData;

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!surveyId || typeof surveyId !== 'string') {
      throw new Error('Survey ID is required');
    }

    if (!responses || typeof responses !== 'object') {
      throw new Error('Survey responses are required');
    }

    try {
      const surveyDoc = {
        userId,
        surveyId,
        responses: this.sanitizeObject(responses),
        metadata: {
          ...metadata,
          platform: metadata.platform || 'unknown',
          appVersion: metadata.appVersion || '1.0.0',
        },
        completedAt: serverTimestamp(),
      };

      if (isFirebaseReady() && db) {
        try {
          const surveyRef = collection(db, SURVEY_COLLECTION);
          await addDoc(surveyRef, surveyDoc);
          
          // Track survey completion with dedicated analytics function
          await trackSurvey(surveyId, Object.keys(responses).length, 0, responses);

          return { success: true, id: surveyRef.id };
        } catch (firebaseError) {
          console.warn('Firebase survey submission failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation
      console.log('📊 Mock Survey Submitted:', surveyDoc);
      await trackSurvey(surveyId, Object.keys(responses).length, 0, responses);

      return { success: true, id: `mock_${Date.now()}` };
    } catch (error) {
      console.error('Error submitting survey:', error);
      trackError(error.message || 'Survey submission failed', 'survey_submission_error', 'FeedbackScreen');
      throw error;
    }
  }

  /**
   * Get user's feedback history
   */
  async getUserFeedback(userId, limitCount = 10) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      if (isFirebaseReady() && db) {
        try {
          const feedbackRef = collection(db, FEEDBACK_COLLECTION);
          const q = query(
            feedbackRef,
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firebaseError) {
          console.warn('Firebase feedback fetch failed, using mock:', firebaseError);
          // Fall through to mock
        }
      }

      // Mock implementation
      return [];
    } catch (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }
  }

  /**
   * Sanitize text input to prevent XSS
   */
  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .substring(0, 1000); // Enforce max length
  }

  /**
   * Sanitize email input
   */
  sanitizeEmail(email) {
    if (typeof email !== 'string') return null;
    const sanitized = email.trim().toLowerCase();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : null;
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? this.sanitizeText(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = this.sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
}

export default new FeedbackService();

