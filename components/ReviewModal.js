/**
 * Review Modal Component
 * Allows users to submit reviews and ratings
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ReviewService from '../services/ReviewService';

export default function ReviewModal({ visible, onClose, item, onReviewSubmitted }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Login Required', 'Please log in to submit a review.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await ReviewService.submitReview({
        itemId: item.id,
        itemName: item.name,
        userId: user.uid,
        userName: user.displayName || user.email,
        userAvatar: user.avatarUrl || null,
        rating,
        reviewText: reviewText.trim(),
      });

      if (result.success) {
        Alert.alert('Thank You!', 'Your review has been submitted.');
        setRating(0);
        setReviewText('');
        onReviewSubmitted?.();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to submit review');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Write a Review</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Item Info */}
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item?.name}</Text>
              <Text style={[styles.itemArtist, { color: theme.subtext }]}>{item?.artist}</Text>
            </View>

            {/* Rating Selection */}
            <View style={styles.ratingSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rating</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={40}
                      color={star <= rating ? '#FFD700' : theme.subtext}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.ratingText, { color: theme.subtext }]}>
                {rating === 0 && 'Tap to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </Text>
            </View>

            {/* Review Text */}
            <View style={styles.reviewSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Review (Optional)</Text>
              <TextInput
                style={[styles.reviewInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Share your experience..."
                placeholderTextColor={theme.subtext}
                multiline
                numberOfLines={6}
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={500}
              />
              <Text style={[styles.charCount, { color: theme.subtext }]}>
                {reviewText.length}/500
              </Text>
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: rating > 0 ? theme.primary : theme.subtext,
                  opacity: submitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting || rating === 0}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  itemInfo: {
    marginBottom: 24,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemArtist: {
    fontSize: 14,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    marginTop: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

