/**
 * Feedback Screen
 * Allows users to submit feedback, rate the app, and report bugs
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trackFeatureUsage, trackButtonClick, trackReviewSubmitted, trackError, trackSurveyStarted } from '../services/AnalyticsService';
import useScreenTracking from '../hooks/useScreenTracking';
import FeedbackService from '../services/FeedbackService';
import RatingPromptService, { POSITIVE_ACTIONS } from '../services/RatingPromptService';
import * as StoreReview from 'expo-store-review';

const FEEDBACK_TYPES = [
  { id: 'bug', label: 'Bug Report', icon: 'bug', color: '#FF3B30' },
  { id: 'feature', label: 'Feature Request', icon: 'bulb', color: '#FF9500' },
  { id: 'improvement', label: 'Improvement', icon: 'trending-up', color: '#34C759' },
  { id: 'other', label: 'Other', icon: 'chatbubble', color: '#007AFF' },
];

// Survey questions
const SURVEY_QUESTIONS = [
  {
    id: 'satisfaction',
    question: 'How satisfied are you with M1A?',
    type: 'scale',
    options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
  },
  {
    id: 'ease_of_use',
    question: 'How easy is M1A to use?',
    type: 'scale',
    options: ['Very Difficult', 'Difficult', 'Neutral', 'Easy', 'Very Easy'],
  },
  {
    id: 'features',
    question: 'Which features do you use most? (Select all that apply)',
    type: 'multiple',
    options: ['Event Booking', 'Bar Menu', 'Services', 'AutoPoster', 'Wallet', 'M1A Assistant'],
  },
  {
    id: 'improvements',
    question: 'What would you like to see improved?',
    type: 'text',
    placeholder: 'Tell us your thoughts...',
  },
  {
    id: 'recommend',
    question: 'How likely are you to recommend M1A to a friend?',
    type: 'scale',
    options: ['Not Likely', 'Somewhat Likely', 'Neutral', 'Likely', 'Very Likely'],
  },
];

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  useScreenTracking('FeedbackScreen');

  const [feedbackType, setFeedbackType] = useState('bug');
  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResponses, setSurveyResponses] = useState({});
  const [currentSurveyQuestion, setCurrentSurveyQuestion] = useState(0);
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Missing Information', 'Please provide your feedback.');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to submit feedback.');
      return;
    }

    setSubmitting(true);
    trackButtonClick('submit_feedback', 'FeedbackScreen');
    trackFeatureUsage('feedback_submission', { type: feedbackType });

    try {
      await FeedbackService.submitFeedback({
        userId: user.uid,
        type: feedbackType,
        text: feedbackText,
        email: email || null,
        rating: rating > 0 ? rating : null,
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
        },
      });

      // Record positive action if rating is high
      if (rating >= 4) {
        await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.REVIEW_SUBMITTED, {
          rating,
          feedbackType,
        });
      }

      Alert.alert('Thank You!', 'Your feedback has been submitted. We appreciate your input!');
      setFeedbackText('');
      setRating(0);
      setFeedbackType('bug');
      setEmail(user?.email || '');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      trackError(error.message || 'Feedback submission failed', 'feedback_submission_error', 'FeedbackScreen');
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppRating = async () => {
    trackButtonClick('request_app_rating', 'FeedbackScreen');
    
    try {
      // Record positive action
      if (rating >= 4) {
        await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.REVIEW_SUBMITTED, {
          rating,
          source: 'feedback_screen',
        });
      }

      // Use RatingPromptService for consistent behavior
      const prompted = await RatingPromptService.manualPrompt();
      
      if (prompted && rating >= 4) {
        // Track successful rating submission
        trackReviewSubmitted('app', rating, true);
        trackFeatureUsage('app_rating_submitted', { rating, source: 'feedback_screen' });
      }
    } catch (error) {
      console.error('Error requesting app rating:', error);
      trackError(error.message || 'Rating request failed', 'rating_request_error', 'FeedbackScreen');
    }
  };

  const handleSurvey = () => {
    trackButtonClick('start_survey', 'FeedbackScreen');
    trackSurveyStarted('user_satisfaction');
    setShowSurvey(true);
    setCurrentSurveyQuestion(0);
    setSurveyResponses({});
  };

  const handleSurveyResponse = (questionId, response) => {
    setSurveyResponses(prev => ({
      ...prev,
      [questionId]: response,
    }));
  };

  const handleSurveyNext = () => {
    if (currentSurveyQuestion < SURVEY_QUESTIONS.length - 1) {
      setCurrentSurveyQuestion(prev => prev + 1);
    } else {
      handleSurveySubmit();
    }
  };

  const handleSurveyBack = () => {
    if (currentSurveyQuestion > 0) {
      setCurrentSurveyQuestion(prev => prev - 1);
    }
  };

  const handleSurveySubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to submit a survey.');
      return;
    }

    setSubmittingSurvey(true);
    trackButtonClick('submit_survey', 'FeedbackScreen');

    try {
      await FeedbackService.submitSurvey({
        userId: user.uid,
        surveyId: 'user_satisfaction',
        responses: surveyResponses,
        metadata: {
          platform: Platform.OS,
          appVersion: '1.0.0',
        },
      });

      // Record positive action
      await RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.FEATURE_USED, {
        feature: 'survey_completion',
      });

      trackFeatureUsage('survey_completed', {
        survey_id: 'user_satisfaction',
        response_count: Object.keys(surveyResponses).length,
      });

      Alert.alert('Thank You!', 'Your survey responses have been submitted. We appreciate your feedback!');
      setShowSurvey(false);
      setSurveyResponses({});
      setCurrentSurveyQuestion(0);
    } catch (error) {
      console.error('Error submitting survey:', error);
      trackError(error.message || 'Survey submission failed', 'survey_submission_error', 'FeedbackScreen');
      Alert.alert('Error', error.message || 'Failed to submit survey. Please try again.');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  const renderSurveyQuestion = () => {
    if (currentSurveyQuestion >= SURVEY_QUESTIONS.length) return null;

    const question = SURVEY_QUESTIONS[currentSurveyQuestion];
    const currentResponse = surveyResponses[question.id];

    return (
      <View style={styles.surveyQuestionContainer}>
        <Text style={[styles.surveyQuestionText, { color: theme.text }]}>
          {question.question}
        </Text>
        <Text style={[styles.surveyProgress, { color: theme.subtext }]}>
          {currentSurveyQuestion + 1} of {SURVEY_QUESTIONS.length}
        </Text>

        {question.type === 'scale' && (
          <View style={styles.surveyOptions}>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.surveyOption,
                  {
                    backgroundColor: currentResponse === index ? theme.primary : theme.cardBackground,
                    borderColor: currentResponse === index ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => handleSurveyResponse(question.id, index)}
              >
                <Text
                  style={[
                    styles.surveyOptionText,
                    { color: currentResponse === index ? '#fff' : theme.text },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {question.type === 'multiple' && (
          <View style={styles.surveyOptions}>
            {question.options.map((option, index) => {
              const isSelected = Array.isArray(currentResponse) && currentResponse.includes(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.surveyOption,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.cardBackground,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => {
                    const current = Array.isArray(currentResponse) ? currentResponse : [];
                    const updated = isSelected
                      ? current.filter(i => i !== index)
                      : [...current, index];
                    handleSurveyResponse(question.id, updated);
                  }}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isSelected ? '#fff' : theme.text}
                  />
                  <Text
                    style={[
                      styles.surveyOptionText,
                      { color: isSelected ? '#fff' : theme.text, marginLeft: 8 },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {question.type === 'text' && (
          <TextInput
            style={[
              styles.surveyTextInput,
              { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text },
            ]}
            placeholder={question.placeholder}
            placeholderTextColor={theme.subtext}
            multiline
            numberOfLines={6}
            value={currentResponse || ''}
            onChangeText={text => handleSurveyResponse(question.id, text)}
            maxLength={500}
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Feedback</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* App Rating Section */}
        <View style={[styles.ratingSection, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Rate M1A</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.subtext }]}>
            Enjoying M1A? We'd love your feedback!
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => {
                  setRating(star);
                  trackReviewSubmitted('app', star, false);
                }}
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
          {rating > 0 && (
            <TouchableOpacity
              style={[styles.rateButton, { backgroundColor: theme.primary }]}
              onPress={handleAppRating}
            >
              <Text style={styles.rateButtonText}>Submit Rating</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Feedback Type Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What would you like to share?</Text>
          <View style={styles.feedbackTypesGrid}>
            {FEEDBACK_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.feedbackTypeCard,
                  {
                    backgroundColor:
                      feedbackType === type.id ? theme.primary : theme.cardBackground,
                    borderColor: feedbackType === type.id ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setFeedbackType(type.id);
                  trackButtonClick('select_feedback_type', 'FeedbackScreen');
                }}
              >
                <Ionicons
                  name={type.icon}
                  size={24}
                  color={feedbackType === type.id ? '#fff' : type.color}
                />
                <Text
                  style={[
                    styles.feedbackTypeLabel,
                    { color: feedbackType === type.id ? '#fff' : theme.text },
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Feedback</Text>
          <TextInput
            style={[styles.feedbackInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            placeholder="Tell us what's on your mind..."
            placeholderTextColor={theme.subtext}
            multiline
            numberOfLines={8}
            value={feedbackText}
            onChangeText={setFeedbackText}
            maxLength={1000}
          />
          <Text style={[styles.charCount, { color: theme.subtext }]}>
            {feedbackText.length}/1000
          </Text>
        </View>

        {/* Email (Optional) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Email (Optional)</Text>
          <Text style={[styles.labelSubtext, { color: theme.subtext }]}>
            We'll only use this to follow up if needed
          </Text>
          <TextInput
            style={[styles.emailInput, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
            placeholder="your@email.com"
            placeholderTextColor={theme.subtext}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: feedbackText.trim() ? theme.primary : theme.subtext,
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={!feedbackText.trim() || submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Other Ways to Help</Text>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={handleSurvey}
          >
            <Ionicons name="clipboard-outline" size={24} color={theme.primary} />
            <View style={styles.quickActionContent}>
              <Text style={[styles.quickActionTitle, { color: theme.text }]}>Take a Survey</Text>
              <Text style={[styles.quickActionSubtitle, { color: theme.subtext }]}>
                Help us improve with a quick survey
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Survey Modal */}
      <Modal
        visible={showSurvey}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSurvey(false)}
      >
        <SafeAreaView style={[styles.surveyModal, { backgroundColor: theme.background }]}>
          <View style={styles.surveyHeader}>
            <TouchableOpacity
              onPress={() => setShowSurvey(false)}
              style={styles.surveyCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.surveyHeaderTitle, { color: theme.text }]}>User Survey</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.surveyContent} showsVerticalScrollIndicator={false}>
            {renderSurveyQuestion()}
          </ScrollView>

          <View style={[styles.surveyFooter, { borderTopColor: theme.border }]}>
            {currentSurveyQuestion > 0 && (
              <TouchableOpacity
                style={[styles.surveyButton, styles.surveyButtonSecondary, { borderColor: theme.border }]}
                onPress={handleSurveyBack}
              >
                <Text style={[styles.surveyButtonText, { color: theme.text }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.surveyButton,
                styles.surveyButtonPrimary,
                { backgroundColor: theme.primary },
                submittingSurvey && { opacity: 0.7 },
              ]}
              onPress={handleSurveyNext}
              disabled={submittingSurvey}
            >
              <Text style={styles.surveyButtonText}>
                {submittingSurvey
                  ? 'Submitting...'
                  : currentSurveyQuestion === SURVEY_QUESTIONS.length - 1
                  ? 'Submit'
                  : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingSection: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  starButton: {
    padding: 4,
  },
  rateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  feedbackTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  feedbackTypeCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  feedbackTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  labelSubtext: {
    fontSize: 12,
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  submitButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  quickActionContent: {
    flex: 1,
    marginLeft: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 14,
  },
  surveyModal: {
    flex: 1,
  },
  surveyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  surveyCloseButton: {
    padding: 4,
  },
  surveyHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  surveyContent: {
    flex: 1,
    padding: 20,
  },
  surveyQuestionContainer: {
    marginBottom: 24,
  },
  surveyQuestionText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  surveyProgress: {
    fontSize: 14,
    marginBottom: 24,
  },
  surveyOptions: {
    gap: 12,
  },
  surveyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  surveyOptionText: {
    fontSize: 16,
    flex: 1,
  },
  surveyTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  surveyFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  surveyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  surveyButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  surveyButtonSecondary: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  surveyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

