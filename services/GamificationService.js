/**
 * Gamification Service
 * Handles rewards, badges, points, achievements, leaderboards, and challenges
 */

import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db, isFirebaseReady } from '../firebase';
import { trackFeatureUsage, trackButtonClick } from './AnalyticsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POINTS_KEY = 'm1a_user_points';
const BADGES_KEY = 'm1a_user_badges';
const ACHIEVEMENTS_KEY = 'm1a_user_achievements';
const LEADERBOARD_KEY = 'm1a_leaderboard_cache';

// Point values for different actions
const POINT_VALUES = {
  EVENT_BOOKED: 50,
  SERVICE_BOOKED: 30,
  ORDER_COMPLETED: 20,
  REVIEW_SUBMITTED: 15,
  SHARE_APP: 10,
  PROFILE_COMPLETE: 25,
  FIRST_BOOKING: 100,
  REFERRAL: 50,
  DAILY_LOGIN: 5,
  WEEKLY_ACTIVE: 25,
};

// Badge definitions
const BADGES = {
  FIRST_STEPS: {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first booking',
    icon: 'footsteps',
    points: 100,
    condition: { type: 'first_booking' },
  },
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Share the app 5 times',
    icon: 'share-social',
    points: 50,
    condition: { type: 'share_count', count: 5 },
  },
  REVIEW_MASTER: {
    id: 'review_master',
    name: 'Review Master',
    description: 'Submit 10 reviews',
    icon: 'star',
    points: 75,
    condition: { type: 'review_count', count: 10 },
  },
  LOYAL_CUSTOMER: {
    id: 'loyal_customer',
    name: 'Loyal Customer',
    description: 'Make 10 bookings',
    icon: 'heart',
    points: 200,
    condition: { type: 'booking_count', count: 10 },
  },
  EARLY_BIRD: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Login 7 days in a row',
    icon: 'sunny',
    points: 50,
    condition: { type: 'daily_login_streak', count: 7 },
  },
  POWER_USER: {
    id: 'power_user',
    name: 'Power User',
    description: 'Reach 1000 points',
    icon: 'flash',
    points: 100,
    condition: { type: 'total_points', count: 1000 },
  },
};

// Achievement definitions
const ACHIEVEMENTS = {
  EXPLORER: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Browse 50 different items',
    icon: 'compass',
    tier: 'bronze',
  },
  BOOKWORM: {
    id: 'bookworm',
    name: 'Bookworm',
    description: 'Complete 5 bookings',
    icon: 'book',
    tier: 'silver',
  },
  SOCIALITE: {
    id: 'socialite',
    name: 'Socialite',
    description: 'Refer 3 friends',
    icon: 'people',
    tier: 'gold',
  },
  VIP: {
    id: 'vip',
    name: 'VIP Member',
    description: 'Spend $500 total',
    icon: 'diamond',
    tier: 'platinum',
  },
};

class GamificationService {
  /**
   * Award points to user
   */
  async awardPoints(userId, actionType, metadata = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const points = POINT_VALUES[actionType] || 0;
    if (points === 0) {
      return { success: false, points: 0 };
    }

    try {
      // Update local storage
      const currentPoints = await this.getUserPoints(userId);
      const newTotal = currentPoints + points;
      await AsyncStorage.setItem(`${POINTS_KEY}_${userId}`, String(newTotal));

      // Update Firestore if available
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const usersRef = collection(db, 'users');
          const userRef = doc(usersRef, userId);
          
          // Try to update, or create if doesn't exist
          await updateDoc(userRef, {
            points: increment(points),
            totalPoints: increment(points),
            lastPointsUpdate: serverTimestamp(),
          }, { merge: true });
        } catch (firebaseError) {
          console.warn('Firebase points update failed, using local only:', firebaseError);
        }
      }

      // Check for badge/achievement unlocks
      await this.checkBadgeUnlocks(userId, actionType, metadata);
      await this.checkAchievementUnlocks(userId, actionType, metadata);

      // Track analytics
      await trackFeatureUsage('points_awarded', {
        actionType,
        points,
        totalPoints: newTotal,
      });

      return { success: true, points, totalPoints: newTotal };
    } catch (error) {
      console.error('Error awarding points:', error);
      return { success: false, points: 0 };
    }
  }

  /**
   * Get user's total points
   */
  async getUserPoints(userId) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const usersRef = collection(db, 'users');
          const userRef = doc(usersRef, userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            return userData.points || userData.totalPoints || 0;
          }
        } catch (firebaseError) {
          // Fall through to local storage
        }
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${POINTS_KEY}_${userId}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Error getting user points:', error);
      return 0;
    }
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const badgesRef = collection(db, 'userBadges');
          const q = query(
            badgesRef,
            where('userId', '==', userId),
            orderBy('unlockedAt', 'desc')
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firebaseError) {
          // Fall through to local storage
        }
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${BADGES_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting user badges:', error);
      return [];
    }
  }

  /**
   * Unlock a badge for user
   */
  async unlockBadge(userId, badgeId) {
    try {
      const badge = BADGES[badgeId] || Object.values(BADGES).find(b => b.id === badgeId);
      if (!badge) {
        throw new Error('Invalid badge ID');
      }

      // Check if already unlocked
      const userBadges = await this.getUserBadges(userId);
      if (userBadges.some(b => b.id === badge.id || b.badgeId === badge.id)) {
        return { success: false, alreadyUnlocked: true };
      }

      const badgeData = {
        userId,
        badgeId: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        points: badge.points,
        unlockedAt: serverTimestamp(),
      };

      // Save to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const badgesRef = collection(db, 'userBadges');
          await addDoc(badgesRef, badgeData);
        } catch (firebaseError) {
          console.warn('Firebase badge save failed, using local only:', firebaseError);
        }
      }

      // Save to local storage
      const updatedBadges = [...userBadges, badgeData];
      await AsyncStorage.setItem(`${BADGES_KEY}_${userId}`, JSON.stringify(updatedBadges));

      // Award badge points
      if (badge.points > 0) {
        await this.awardPoints(userId, 'BADGE_UNLOCKED', { badgeId: badge.id });
      }

      // Track analytics
      await trackFeatureUsage('badge_unlocked', {
        badgeId: badge.id,
        badgeName: badge.name,
      });

      return { success: true, badge: badgeData };
    } catch (error) {
      console.error('Error unlocking badge:', error);
      return { success: false };
    }
  }

  /**
   * Check if user should unlock badges
   */
  async checkBadgeUnlocks(userId, actionType, metadata = {}) {
    try {
      const userPoints = await this.getUserPoints(userId);
      const userBadges = await this.getUserBadges(userId);
      const unlockedBadgeIds = userBadges.map(b => b.badgeId || b.id);

      // Check each badge condition
      for (const [key, badge] of Object.entries(BADGES)) {
        if (unlockedBadgeIds.includes(badge.id)) continue;

        const condition = badge.condition;
        let shouldUnlock = false;

        switch (condition.type) {
          case 'first_booking':
            shouldUnlock = actionType === 'EVENT_BOOKED' || actionType === 'SERVICE_BOOKED';
            break;
          case 'share_count':
            // Would need to track share count in metadata
            break;
          case 'review_count':
            // Would need to track review count in metadata
            break;
          case 'booking_count':
            // Would need to track booking count in metadata
            break;
          case 'daily_login_streak':
            // Would need to track login streak
            break;
          case 'total_points':
            shouldUnlock = userPoints >= condition.count;
            break;
        }

        if (shouldUnlock) {
          await this.unlockBadge(userId, badge.id);
        }
      }
    } catch (error) {
      console.error('Error checking badge unlocks:', error);
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const achievementsRef = collection(db, 'userAchievements');
          const q = query(
            achievementsRef,
            where('userId', '==', userId),
            orderBy('unlockedAt', 'desc')
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firebaseError) {
          // Fall through to local storage
        }
      }

      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`${ACHIEVEMENTS_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Unlock an achievement for user
   */
  async unlockAchievement(userId, achievementId) {
    try {
      const achievement = ACHIEVEMENTS[achievementId] || Object.values(ACHIEVEMENTS).find(a => a.id === achievementId);
      if (!achievement) {
        throw new Error('Invalid achievement ID');
      }

      // Check if already unlocked
      const userAchievements = await this.getUserAchievements(userId);
      if (userAchievements.some(a => a.id === achievement.id || a.achievementId === achievement.id)) {
        return { success: false, alreadyUnlocked: true };
      }

      const achievementData = {
        userId,
        achievementId: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        tier: achievement.tier,
        unlockedAt: serverTimestamp(),
      };

      // Save to Firestore
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const achievementsRef = collection(db, 'userAchievements');
          await addDoc(achievementsRef, achievementData);
        } catch (firebaseError) {
          console.warn('Firebase achievement save failed, using local only:', firebaseError);
        }
      }

      // Save to local storage
      const updatedAchievements = [...userAchievements, achievementData];
      await AsyncStorage.setItem(`${ACHIEVEMENTS_KEY}_${userId}`, JSON.stringify(updatedAchievements));

      // Track analytics
      await trackFeatureUsage('achievement_unlocked', {
        achievementId: achievement.id,
        achievementName: achievement.name,
        tier: achievement.tier,
      });

      return { success: true, achievement: achievementData };
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      return { success: false };
    }
  }

  /**
   * Check if user should unlock achievements
   */
  async checkAchievementUnlocks(userId, actionType, metadata = {}) {
    // Implementation would check user stats and unlock achievements
    // This is a placeholder for future implementation
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(type = 'points', limitCount = 100) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const usersRef = collection(db, 'users');
          const q = query(
            usersRef,
            orderBy('points', 'desc'),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          
          const leaderboard = snapshot.docs.map((doc, index) => ({
            rank: index + 1,
            userId: doc.id,
            displayName: doc.data().displayName || 'Anonymous',
            points: doc.data().points || 0,
            avatar: doc.data().avatar || null,
          }));

          // Cache leaderboard
          await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify({
            data: leaderboard,
            timestamp: Date.now(),
          }));

          return leaderboard;
        } catch (firebaseError) {
          console.warn('Firebase leaderboard fetch failed, using cache:', firebaseError);
        }
      }

      // Fallback to cached leaderboard
      const cached = await AsyncStorage.getItem(LEADERBOARD_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
        // Use cache if less than 1 hour old
        if (Date.now() - cacheData.timestamp < 3600000) {
          return cacheData.data || [];
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get user's leaderboard rank
   */
  async getUserRank(userId) {
    try {
      const leaderboard = await this.getLeaderboard();
      const userIndex = leaderboard.findIndex(entry => entry.userId === userId);
      return userIndex >= 0 ? userIndex + 1 : null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return null;
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges() {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const challengesRef = collection(db, 'challenges');
          const q = query(
            challengesRef,
            where('active', '==', true),
            orderBy('endDate', 'asc')
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firebaseError) {
          console.warn('Firebase challenges fetch failed:', firebaseError);
        }
      }

      // Return mock challenges
      return [
        {
          id: 'weekly_booking',
          name: 'Weekly Booking Challenge',
          description: 'Complete 3 bookings this week',
          reward: { type: 'points', amount: 150 },
          progress: 0,
          target: 3,
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];
    } catch (error) {
      console.error('Error getting challenges:', error);
      return [];
    }
  }

  /**
   * Get user's challenge progress
   */
  async getUserChallengeProgress(userId, challengeId) {
    try {
      if (isFirebaseReady() && db && typeof db.collection !== 'function') {
        try {
          const progressRef = collection(db, 'challengeProgress');
          const q = query(
            progressRef,
            where('userId', '==', userId),
            where('challengeId', '==', challengeId)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            return snapshot.docs[0].data();
          }
        } catch (firebaseError) {
          console.warn('Firebase challenge progress fetch failed:', firebaseError);
        }
      }

      return { progress: 0, completed: false };
    } catch (error) {
      console.error('Error getting challenge progress:', error);
      return { progress: 0, completed: false };
    }
  }
}

export default new GamificationService();
export { POINT_VALUES, BADGES, ACHIEVEMENTS };

