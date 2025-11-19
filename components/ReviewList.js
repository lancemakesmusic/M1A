/**
 * Review List Component
 * Displays reviews for an item with moderation and response capabilities
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ReviewService from '../services/ReviewService';
import { trackButtonClick } from '../services/AnalyticsService';

export default function ReviewList({ itemId, showModeration = false }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState({ average: 0, count: 0, distribution: {} });

  useEffect(() => {
    loadReviews();
    loadRating();
  }, [itemId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const reviewsData = await ReviewService.getItemReviews(itemId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRating = async () => {
    try {
      const ratingData = await ReviewService.getItemRating(itemId);
      setRating(ratingData);
    } catch (error) {
      console.error('Error loading rating:', error);
    }
  };

  const handleHelpful = async (reviewId) => {
    if (!user?.uid) return;
    trackButtonClick('review_helpful', 'ReviewList');
    await ReviewService.markReviewHelpful(reviewId, user.uid);
    loadReviews();
  };

  const handleReport = async (reviewId) => {
    if (!user?.uid) return;
    trackButtonClick('report_review', 'ReviewList');
    const result = await ReviewService.reportReview(reviewId, 'inappropriate', user.uid);
    if (result.success) {
      alert('Review reported. Thank you for your feedback.');
    }
  };

  const renderReview = ({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {item.userAvatar ? (
            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{item.userName?.[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={styles.reviewerDetails}>
            <Text style={[styles.reviewerName, { color: theme.text }]}>{item.userName}</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.rating ? 'star' : 'star-outline'}
                  size={12}
                  color={star <= item.rating ? '#FFD700' : theme.subtext}
                />
              ))}
            </View>
          </View>
        </View>
        {item.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: theme.primary }]}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      {item.reviewText && (
        <Text style={[styles.reviewText, { color: theme.text }]}>{item.reviewText}</Text>
      )}

      <View style={styles.reviewFooter}>
        <Text style={[styles.reviewDate, { color: theme.subtext }]}>
          {item.createdAt?.toDate ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Recently'}
        </Text>
        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleHelpful(item.id)}
          >
            <Ionicons name="thumbs-up-outline" size={16} color={theme.subtext} />
            <Text style={[styles.actionText, { color: theme.subtext }]}>
              Helpful ({item.helpful || 0})
            </Text>
          </TouchableOpacity>
          {showModeration && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReport(item.id)}
            >
              <Ionicons name="flag-outline" size={16} color={theme.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {item.response && (
        <View style={[styles.responseCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.responseLabel, { color: theme.primary }]}>Provider Response:</Text>
          <Text style={[styles.responseText, { color: theme.text }]}>{item.response}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Rating Summary */}
      <View style={[styles.ratingSummary, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.ratingMain}>
          <Text style={[styles.ratingAverage, { color: theme.text }]}>{rating.average.toFixed(1)}</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(rating.average) ? 'star' : 'star-outline'}
                size={20}
                color={star <= Math.round(rating.average) ? '#FFD700' : theme.subtext}
              />
            ))}
          </View>
          <Text style={[styles.ratingCount, { color: theme.subtext }]}>
            Based on {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
          </Text>
        </View>
        <View style={styles.ratingDistribution}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = rating.distribution[star] || 0;
            const percentage = rating.count > 0 ? (count / rating.count) * 100 : 0;
            return (
              <View key={star} style={styles.distributionRow}>
                <Text style={[styles.distributionLabel, { color: theme.text }]}>{star}</Text>
                <Ionicons name="star" size={12} color="#FFD700" />
                <View style={[styles.distributionBar, { backgroundColor: theme.background }]}>
                  <View
                    style={[
                      styles.distributionFill,
                      { width: `${percentage}%`, backgroundColor: theme.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.distributionCount, { color: theme.subtext }]}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.subtext} />
          <Text style={[styles.emptyText, { color: theme.subtext }]}>No reviews yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
            Be the first to review this item!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  ratingSummary: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  ratingMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingAverage: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
  },
  ratingDistribution: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distributionLabel: {
    fontSize: 14,
    width: 20,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    width: 30,
    textAlign: 'right',
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
  },
  responseCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

