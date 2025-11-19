/**
 * Personalization Service
 * Handles learning from user behavior, personalized recommendations, and personalized pricing
 */

import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeatureUsage } from './AnalyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_BEHAVIOR_KEY = 'm1a_user_behavior';
const RECOMMENDATIONS_KEY = 'm1a_recommendations';
const PRICING_PREFERENCES_KEY = 'm1a_pricing_preferences';

class PersonalizationService {
  /**
   * Track user behavior for learning
   */
  async trackUserBehavior(userId, behaviorType, behaviorData) {
    if (!userId || !behaviorType) {
      throw new Error('User ID and behavior type are required');
    }

    try {
      const behavior = {
        userId,
        type: behaviorType,
        ...behaviorData,
        timestamp: new Date(),
      };

      // Save to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const behaviorsRef = collection(db, 'userBehaviors');
          await addDoc(behaviorsRef, {
            ...behavior,
            timestamp: serverTimestamp(),
          });
        } catch (firebaseError) {
          console.warn('Firebase behavior tracking failed, using local:', firebaseError);
        }
      }

      // Update local behavior cache
      const behaviors = await this.getUserBehaviors(userId);
      behaviors.push(behavior);
      // Keep only last 1000 behaviors
      const recentBehaviors = behaviors.slice(-1000);
      await AsyncStorage.setItem(`${USER_BEHAVIOR_KEY}_${userId}`, JSON.stringify(recentBehaviors));

      // Track analytics
      trackFeatureUsage('behavior_tracked', {
        behaviorType,
        userId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error tracking user behavior:', error);
      return { success: false };
    }
  }

  /**
   * Get user behaviors
   */
  async getUserBehaviors(userId, limitCount = 1000) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const behaviorsRef = collection(db, 'userBehaviors');
          const q = query(
            behaviorsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date(),
          }));
        } catch (firebaseError) {
          // Fall through to local storage
        }
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${USER_BEHAVIOR_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting user behaviors:', error);
      return [];
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId) {
    try {
      const behaviors = await this.getUserBehaviors(userId);
      
      const analysis = {
        favoriteCategories: {},
        preferredPriceRange: { min: null, max: null },
        bookingFrequency: 0,
        averageBookingValue: 0,
        preferredTimes: {},
        preferredDays: {},
        mostViewedItems: {},
        searchPatterns: [],
        interactionPatterns: {},
      };

      // Analyze behaviors
      behaviors.forEach(behavior => {
        switch (behavior.type) {
          case 'view_item':
            if (behavior.category) {
              analysis.favoriteCategories[behavior.category] = 
                (analysis.favoriteCategories[behavior.category] || 0) + 1;
            }
            if (behavior.itemId) {
              analysis.mostViewedItems[behavior.itemId] = 
                (analysis.mostViewedItems[behavior.itemId] || 0) + 1;
            }
            break;
          case 'book_event':
          case 'book_service':
            analysis.bookingFrequency++;
            if (behavior.amount) {
              analysis.averageBookingValue = 
                (analysis.averageBookingValue * (analysis.bookingFrequency - 1) + behavior.amount) / 
                analysis.bookingFrequency;
            }
            if (behavior.price) {
              if (!analysis.preferredPriceRange.min || behavior.price < analysis.preferredPriceRange.min) {
                analysis.preferredPriceRange.min = behavior.price;
              }
              if (!analysis.preferredPriceRange.max || behavior.price > analysis.preferredPriceRange.max) {
                analysis.preferredPriceRange.max = behavior.price;
              }
            }
            break;
          case 'search':
            if (behavior.query) {
              analysis.searchPatterns.push(behavior.query);
            }
            break;
        }
      });

      // Get top categories
      analysis.topCategories = Object.entries(analysis.favoriteCategories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category]) => category);

      // Get top viewed items
      analysis.topViewedItems = Object.entries(analysis.mostViewedItems)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([itemId]) => itemId);

      return analysis;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      return null;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(userId, type = 'items', limitCount = 20) {
    try {
      // Get user behavior analysis
      const behaviorAnalysis = await this.analyzeUserBehavior(userId);
      if (!behaviorAnalysis) {
        return [];
      }

      // Get recommendations from Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const itemsRef = collection(db, 'menuItems');
          let q;

          // Filter by user's favorite categories
          if (behaviorAnalysis.topCategories.length > 0) {
            q = query(
              itemsRef,
              where('category', 'in', behaviorAnalysis.topCategories.slice(0, 10)),
              limit(limitCount)
            );
          } else {
            q = query(itemsRef, limit(limitCount));
          }

          const snapshot = await getDocs(q);
          let items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));

          // Score and sort by relevance
          items = items.map(item => {
            let score = 0;
            
            // Boost score if in favorite category
            if (behaviorAnalysis.topCategories.includes(item.category)) {
              score += 10;
            }
            
            // Boost score if in price range
            if (behaviorAnalysis.preferredPriceRange.min && behaviorAnalysis.preferredPriceRange.max) {
              if (item.price >= behaviorAnalysis.preferredPriceRange.min && 
                  item.price <= behaviorAnalysis.preferredPriceRange.max) {
                score += 5;
              }
            }
            
            // Boost score if previously viewed
            if (behaviorAnalysis.mostViewedItems[item.id]) {
              score += behaviorAnalysis.mostViewedItems[item.id] * 2;
            }
            
            // Boost score if high rating
            if (item.rating && item.rating >= 4) {
              score += 3;
            }

            return { ...item, relevanceScore: score };
          });

          // Sort by relevance score
          items.sort((a, b) => b.relevanceScore - a.relevanceScore);

          // Cache recommendations
          await AsyncStorage.setItem(
            `${RECOMMENDATIONS_KEY}_${userId}`,
            JSON.stringify({
              items: items.slice(0, limitCount),
              timestamp: Date.now(),
            })
          );

          return items.slice(0, limitCount);
        } catch (firebaseError) {
          console.warn('Firebase recommendations failed, using cache:', firebaseError);
        }
      }

      // Fallback to cached recommendations
      const cached = await AsyncStorage.getItem(`${RECOMMENDATIONS_KEY}_${userId}`);
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - cacheData.timestamp < 3600000) {
          return cacheData.items || [];
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get personalized pricing for user
   */
  async getPersonalizedPricing(userId, itemId, basePrice) {
    try {
      if (!userId || !itemId || !basePrice) {
        return basePrice;
      }

      // Get user behavior analysis
      const behaviorAnalysis = await this.analyzeUserBehavior(userId);
      if (!behaviorAnalysis) {
        return basePrice;
      }

      // Get pricing preferences
      const preferences = await this.getPricingPreferences(userId);

      let personalizedPrice = basePrice;
      let discount = 0;
      let discountReason = null;

      // Apply loyalty discount for frequent users
      if (behaviorAnalysis.bookingFrequency >= 10) {
        discount = 0.10; // 10% discount
        discountReason = 'Loyalty Discount';
      } else if (behaviorAnalysis.bookingFrequency >= 5) {
        discount = 0.05; // 5% discount
        discountReason = 'Frequent Customer';
      }

      // Apply first-time buyer discount
      if (behaviorAnalysis.bookingFrequency === 0 && preferences.firstTimeBuyer) {
        discount = Math.max(discount, 0.15); // 15% discount
        discountReason = 'First-Time Buyer';
      }

      // Apply volume discount if user typically books multiple items
      if (preferences.volumeDiscount && preferences.typicalQuantity >= 3) {
        discount = Math.max(discount, 0.08); // 8% volume discount
        discountReason = 'Volume Discount';
      }

      personalizedPrice = basePrice * (1 - discount);

      // Track personalized pricing
      trackFeatureUsage('personalized_pricing_applied', {
        userId,
        itemId,
        basePrice,
        personalizedPrice,
        discount,
        discountReason,
      });

      return {
        basePrice,
        personalizedPrice: Math.round(personalizedPrice * 100) / 100,
        discount: Math.round(discount * 100),
        discountReason,
      };
    } catch (error) {
      console.error('Error getting personalized pricing:', error);
      return { basePrice, personalizedPrice: basePrice, discount: 0, discountReason: null };
    }
  }

  /**
   * Get pricing preferences
   */
  async getPricingPreferences(userId) {
    try {
      const stored = await AsyncStorage.getItem(`${PRICING_PREFERENCES_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Default preferences
      return {
        firstTimeBuyer: true,
        volumeDiscount: false,
        typicalQuantity: 1,
      };
    } catch (error) {
      console.error('Error getting pricing preferences:', error);
      return {
        firstTimeBuyer: true,
        volumeDiscount: false,
        typicalQuantity: 1,
      };
    }
  }

  /**
   * Update pricing preferences
   */
  async updatePricingPreferences(userId, preferences) {
    try {
      await AsyncStorage.setItem(
        `${PRICING_PREFERENCES_KEY}_${userId}`,
        JSON.stringify(preferences)
      );
      return { success: true };
    } catch (error) {
      console.error('Error updating pricing preferences:', error);
      return { success: false };
    }
  }

  /**
   * Get trending items (based on all user behaviors)
   */
  async getTrendingItems(limitCount = 20) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          // This would typically aggregate from userBehaviors collection
          // For now, return items sorted by views/bookings
          const itemsRef = collection(db, 'menuItems');
          const q = query(
            itemsRef,
            orderBy('views', 'desc'),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
        } catch (firebaseError) {
          console.warn('Firebase trending items failed:', firebaseError);
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting trending items:', error);
      return [];
    }
  }

  /**
   * Get "Similar to" recommendations
   */
  async getSimilarItems(itemId, limitCount = 10) {
    try {
      if (!itemId) {
        return [];
      }

      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          // Get the item first
          const itemRef = doc(db, 'menuItems', itemId);
          const itemSnap = await getDoc(itemRef);
          
          if (!itemSnap.exists()) {
            return [];
          }

          const item = itemSnap.data();

          // Find similar items (same category, similar price range)
          const itemsRef = collection(db, 'menuItems');
          const q = query(
            itemsRef,
            where('category', '==', item.category),
            limit(limitCount + 1) // +1 to exclude the original item
          );
          const snapshot = await getDocs(q);
          
          let similarItems = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(i => i.id !== itemId)
            .slice(0, limitCount);

          // Score by similarity (category match, price proximity)
          similarItems = similarItems.map(similarItem => {
            let score = 10; // Base score for same category
            
            // Price similarity (closer price = higher score)
            const priceDiff = Math.abs((similarItem.price || 0) - (item.price || 0));
            const maxPrice = Math.max(similarItem.price || 0, item.price || 0);
            if (maxPrice > 0) {
              const priceSimilarity = 1 - (priceDiff / maxPrice);
              score += priceSimilarity * 5;
            }

            return { ...similarItem, similarityScore: score };
          });

          // Sort by similarity score
          similarItems.sort((a, b) => b.similarityScore - a.similarityScore);

          return similarItems;
        } catch (firebaseError) {
          console.warn('Firebase similar items failed:', firebaseError);
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting similar items:', error);
      return [];
    }
  }
}

export default new PersonalizationService();

