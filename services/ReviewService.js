/**
 * Review Service
 * Handles user reviews, ratings, and moderation
 */

import { collection, addDoc, query, where, getDocs, orderBy, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackReviewSubmitted } from './AnalyticsService';

// Sanitize text to prevent XSS
const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Enforce length limit
};

// Submit a review
export const submitReview = async (reviewData) => {
  try {
    // Validate inputs
    if (!reviewData || typeof reviewData !== 'object') {
      throw new Error('Invalid review data');
    }
    if (!reviewData.itemId || typeof reviewData.itemId !== 'string') {
      throw new Error('Item ID is required');
    }
    if (!reviewData.userId || typeof reviewData.userId !== 'string') {
      throw new Error('User ID is required');
    }
    if (!reviewData.rating || typeof reviewData.rating !== 'number' || reviewData.rating < 1 || reviewData.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    if (!reviewData.reviewText || typeof reviewData.reviewText !== 'string') {
      throw new Error('Review text is required');
    }
    if (reviewData.reviewText.length > 1000) {
      throw new Error('Review text must be less than 1000 characters');
    }

    // Sanitize inputs
    const sanitizedReviewText = sanitizeText(reviewData.reviewText);
    const sanitizedItemName = sanitizeText(reviewData.itemName || '');
    const sanitizedUserName = sanitizeText(reviewData.userName || '');

    const review = {
      itemId: reviewData.itemId,
      itemName: sanitizedItemName,
      userId: reviewData.userId,
      userName: sanitizedUserName,
      userAvatar: reviewData.userAvatar || null,
      rating: Math.round(reviewData.rating), // Ensure integer rating
      reviewText: sanitizedReviewText,
      verified: false, // Will be verified by admin
      helpful: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    let reviewId;

    if (isFirebaseReady() && db && typeof db.collection !== 'function') {
      // Real Firestore
      const reviewRef = await addDoc(collection(db, 'reviews'), review);
      reviewId = reviewRef.id;
    } else if (db && typeof db.collection === 'function') {
      // Mock Firestore
      const reviewRef = await db.collection('reviews').add(review);
      reviewId = reviewRef.id || `review_${Date.now()}`;
    } else {
      reviewId = `local_${Date.now()}`;
    }

    // Track in analytics
    await trackReviewSubmitted(reviewData.itemId, reviewData.rating, !!reviewData.reviewText);

    return { success: true, reviewId };
  } catch (error) {
    console.error('Error submitting review:', error);
    return { success: false, error: error.message };
  }
};

// Get reviews for an item
export const getItemReviews = async (itemId, limitCount = 20) => {
  try {
    let reviews = [];

    if (isFirebaseReady() && db && typeof db.collection !== 'function') {
      // Real Firestore
      const q = query(
        collection(db, 'reviews'),
        where('itemId', '==', itemId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (db && typeof db.collection === 'function') {
      // Mock Firestore
      const snapshot = await db.collection('reviews')
        .where('itemId', '==', itemId)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get();
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return reviews;
  } catch (error) {
    console.error('Error getting reviews:', error);
    return [];
  }
};

// Get average rating for an item
export const getItemRating = async (itemId) => {
  try {
    const reviews = await getItemReviews(itemId, 1000); // Get all reviews for calculation
    
    if (reviews.length === 0) {
      return { average: 0, count: 0, distribution: {} };
    }

    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const average = totalRating / reviews.length;
    
    // Calculate distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      const rating = Math.round(review.rating);
      if (distribution[rating] !== undefined) {
        distribution[rating]++;
      }
    });

    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      count: reviews.length,
      distribution,
    };
  } catch (error) {
    console.error('Error getting item rating:', error);
    return { average: 0, count: 0, distribution: {} };
  }
};

// Mark review as helpful
export const markReviewHelpful = async (reviewId, userId) => {
  try {
    // Validate inputs
    if (!reviewId || typeof reviewId !== 'string') {
      throw new Error('Review ID is required');
    }
    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required');
    }

    if (isFirebaseReady() && db && typeof db.collection !== 'function') {
      // Real Firestore
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        helpful: increment(1),
        helpfulUsers: arrayUnion(userId),
      });
    } else if (db && typeof db.collection === 'function') {
      // Mock Firestore
      const reviewRef = db.collection('reviews').doc(reviewId);
      const review = await reviewRef.get();
      if (review.exists()) {
        const currentHelpful = review.data().helpful || 0;
        await reviewRef.update({ helpful: currentHelpful + 1 });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking review helpful:', error);
    return { success: false, error: error.message };
  }
};

// Report review (for moderation)
export const reportReview = async (reviewId, reason, userId) => {
  try {
    const report = {
      reviewId,
      reason,
      reportedBy: userId,
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    if (isFirebaseReady() && db && typeof db.collection !== 'function') {
      await addDoc(collection(db, 'reviewReports'), report);
    } else if (db && typeof db.collection === 'function') {
      await db.collection('reviewReports').add(report);
    }

    return { success: true };
  } catch (error) {
    console.error('Error reporting review:', error);
    return { success: false, error: error.message };
  }
};

// Get user's reviews
export const getUserReviews = async (userId) => {
  try {
    let reviews = [];

    if (isFirebaseReady() && db && typeof db.collection !== 'function') {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (db && typeof db.collection === 'function') {
      const snapshot = await db.collection('reviews')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    return reviews;
  } catch (error) {
    console.error('Error getting user reviews:', error);
    return [];
  }
};

export default {
  submitReview,
  getItemReviews,
  getItemRating,
  markReviewHelpful,
  reportReview,
  getUserReviews,
};

