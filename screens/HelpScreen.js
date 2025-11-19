/**
 * Help & Support Screen
 * Provides FAQ, tutorials, support tickets, and contextual help
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { trackFeatureUsage, trackButtonClick } from '../services/AnalyticsService';
import SupportService from '../services/SupportService';
import useScreenTracking from '../hooks/useScreenTracking';

const FAQ_CATEGORIES = [
  { id: 'general', name: 'General', icon: 'help-circle' },
  { id: 'booking', name: 'Booking', icon: 'calendar' },
  { id: 'payments', name: 'Payments', icon: 'card' },
  { id: 'account', name: 'Account', icon: 'person' },
  { id: 'technical', name: 'Technical', icon: 'settings' },
];

const FAQ_ITEMS = {
  general: [
    {
      id: '1',
      question: 'What is M1A?',
      answer: 'M1A is a platform for Merkaba Entertainment fans, artists, and professionals to book services, schedule events, and engage socially.',
    },
    {
      id: '2',
      question: 'How do I get started?',
      answer: 'Simply sign up with your email, create a profile, and start exploring events and services. You can book events, order from the bar, and connect with artists.',
    },
    {
      id: '3',
      question: 'Is M1A free to use?',
      answer: 'Yes, creating an account and browsing is free. You only pay for bookings, services, and purchases you make through the app.',
    },
  ],
  booking: [
    {
      id: '4',
      question: 'How do I book an event?',
      answer: 'Navigate to the Explore tab, find an event you like, and tap "Book Now". Fill out the booking form with your event details and submit.',
    },
    {
      id: '5',
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel bookings from your booking history. Cancellation policies may vary by event type.',
    },
    {
      id: '6',
      question: 'How far in advance can I book?',
      answer: 'You can book events up to 12 months in advance, depending on availability.',
    },
  ],
  payments: [
    {
      id: '7',
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit cards, debit cards, and digital wallets through Stripe. You can also use your M1A wallet balance.',
    },
    {
      id: '8',
      question: 'Is my payment information secure?',
      answer: 'Yes, all payments are processed securely through Stripe. We never store your full payment details on our servers.',
    },
    {
      id: '9',
      question: 'Can I get a refund?',
      answer: 'Refund policies vary by event and service. Contact support for specific refund requests.',
    },
  ],
  account: [
    {
      id: '10',
      question: 'How do I update my profile?',
      answer: 'Go to your Profile tab, tap "Edit Profile", and update your information, photos, and preferences.',
    },
    {
      id: '11',
      question: 'How do I change my password?',
      answer: 'Go to Profile > Settings > Security to change your password.',
    },
    {
      id: '12',
      question: 'Can I delete my account?',
      answer: 'Yes, you can delete your account from Profile > Settings > Account. This action cannot be undone.',
    },
  ],
  technical: [
    {
      id: '13',
      question: 'The app is not loading properly',
      answer: 'Try closing and reopening the app, clearing the cache, or updating to the latest version. If issues persist, contact support.',
    },
    {
      id: '14',
      question: 'I\'m having trouble uploading photos',
      answer: 'Make sure you have granted camera and photo library permissions. Check that your photos are under 10MB in size.',
    },
    {
      id: '15',
      question: 'How do I report a bug?',
      answer: 'Use the Feedback feature in the app or contact support directly. Include details about what happened and when.',
    },
  ],
};

const TUTORIALS = [
  {
    id: '1',
    title: 'Getting Started with M1A',
    description: 'Learn the basics of using M1A',
    icon: 'play-circle',
    duration: '5 min',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual tutorial URL
    category: 'general',
  },
  {
    id: '2',
    title: 'How to Book an Event',
    description: 'Step-by-step guide to booking',
    icon: 'calendar',
    duration: '3 min',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual tutorial URL
    category: 'booking',
  },
  {
    id: '3',
    title: 'Using Your Wallet',
    description: 'Manage payments and transactions',
    icon: 'wallet',
    duration: '4 min',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual tutorial URL
    category: 'payments',
  },
  {
    id: '4',
    title: 'Profile Customization',
    description: 'Make your profile stand out',
    icon: 'person',
    duration: '3 min',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual tutorial URL
    category: 'account',
  },
  {
    id: '5',
    title: 'M1A Assistant Guide',
    description: 'Learn how to use M1A Assistant',
    icon: 'chatbubbles',
    duration: '4 min',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Replace with actual tutorial URL
    category: 'general',
  },
];

export default function HelpScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  useScreenTracking('HelpScreen');

  const [selectedCategory, setSelectedCategory] = useState('general');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubject, setSupportSubject] = useState('');
  const [supportCategory, setSupportCategory] = useState('general');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Enhanced search across all FAQs and tutorials
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        faqs: FAQ_ITEMS[selectedCategory],
        tutorials: TUTORIALS.filter(t => !selectedCategory || t.category === selectedCategory || selectedCategory === 'general'),
      };
    }

    const queryLower = searchQuery.toLowerCase();
    const allFAQs = Object.values(FAQ_ITEMS).flat();
    const matchingFAQs = allFAQs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(queryLower) ||
        faq.answer.toLowerCase().includes(queryLower)
    );

    const matchingTutorials = TUTORIALS.filter(
      (tutorial) =>
        tutorial.title.toLowerCase().includes(queryLower) ||
        tutorial.description.toLowerCase().includes(queryLower)
    );

    return {
      faqs: matchingFAQs,
      tutorials: matchingTutorials,
    };
  }, [searchQuery, selectedCategory]);

  const filteredFAQs = searchQuery.trim() ? searchResults.faqs : FAQ_ITEMS[selectedCategory];
  const filteredTutorials = searchQuery.trim() ? searchResults.tutorials : TUTORIALS.filter(t => !selectedCategory || t.category === selectedCategory || selectedCategory === 'general');

  const handleSubmitSupport = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to submit a support ticket.');
      return;
    }

    if (!supportSubject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject for your support ticket.');
      return;
    }

    if (!supportMessage.trim()) {
      Alert.alert('Missing Information', 'Please enter a message.');
      return;
    }

    setSubmittingTicket(true);
    trackButtonClick('submit_support_ticket', 'HelpScreen');
    trackFeatureUsage('contact_support', { userId: user.uid, category: supportCategory });

    try {
      const result = await SupportService.createSupportTicket({
        userId: user.uid,
        subject: supportSubject,
        message: supportMessage,
        category: supportCategory,
        priority: 'normal',
        metadata: {
          platform: 'mobile',
          appVersion: '1.0.0',
        },
      });

      if (result.success) {
        Alert.alert(
          'Ticket Submitted!',
          `Your support ticket has been created (ID: ${result.ticketId}). We'll get back to you within 24 hours.`,
          [{ text: 'OK', onPress: () => {
            setSupportMessage('');
            setSupportSubject('');
            setSupportCategory('general');
            setShowContactForm(false);
          }}]
        );
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      Alert.alert('Error', error.message || 'Failed to submit support ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleLiveChat = () => {
    trackButtonClick('live_chat', 'HelpScreen');
    trackFeatureUsage('live_chat_opened', { source: 'help_screen' });
    
    // Navigate to M1A Chat for live support
    navigation.navigate('M1AChat');
  };

  const handleTutorialPress = async (tutorial) => {
    trackButtonClick('watch_tutorial', 'HelpScreen');
    trackFeatureUsage('tutorial_opened', { tutorialId: tutorial.id, tutorialTitle: tutorial.title });

    if (tutorial.videoUrl) {
      try {
        const canOpen = await Linking.canOpenURL(tutorial.videoUrl);
        if (canOpen) {
          await Linking.openURL(tutorial.videoUrl);
        } else {
          Alert.alert('Unable to Open', 'Cannot open the tutorial video. Please check your internet connection.');
        }
      } catch (error) {
        console.error('Error opening tutorial:', error);
        Alert.alert('Error', 'Failed to open tutorial video. Please try again.');
      }
    } else {
      Alert.alert(tutorial.title, tutorial.description);
    }
  };

  const renderFAQItem = ({ item }) => {
    const isExpanded = expandedFAQ === item.id;

    return (
      <View style={[styles.faqCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.faqHeader}
          onPress={() => {
            setExpandedFAQ(isExpanded ? null : item.id);
            trackButtonClick('expand_faq', 'HelpScreen');
          }}
        >
          <Text style={[styles.faqQuestion, { color: theme.text }]}>{item.question}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.primary}
          />
        </TouchableOpacity>
        {isExpanded && (
          <Text style={[styles.faqAnswer, { color: theme.subtext }]}>{item.answer}</Text>
        )}
      </View>
    );
  };

  const renderTutorial = ({ item }) => (
    <TouchableOpacity
      style={[styles.tutorialCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => handleTutorialPress(item)}
    >
      <View style={[styles.tutorialIcon, { backgroundColor: theme.primary }]}>
        <Ionicons name={item.icon} size={24} color="#fff" />
      </View>
      <View style={styles.tutorialContent}>
        <Text style={[styles.tutorialTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.tutorialDescription, { color: theme.subtext }]}>
          {item.description}
        </Text>
        <Text style={[styles.tutorialDuration, { color: theme.primary }]}>{item.duration}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Help & Support</Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Find answers and get help
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.subtext} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search for help..."
              placeholderTextColor={theme.subtext}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={() => {
              setShowContactForm(true);
              trackButtonClick('contact_support', 'HelpScreen');
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={handleLiveChat}
          >
            <Ionicons name="chatbubbles" size={24} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.text }]}>Live Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Tutorials */}
        {filteredTutorials.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {searchQuery.trim() ? 'Search Results - Tutorials' : 'Video Tutorials'}
            </Text>
            <FlatList
              data={filteredTutorials}
              renderItem={renderTutorial}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* FAQ Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {FAQ_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      selectedCategory === category.id ? theme.primary : theme.cardBackground,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  trackButtonClick('faq_category', 'HelpScreen');
                }}
              >
                <Ionicons
                  name={category.icon}
                  size={20}
                  color={selectedCategory === category.id ? '#fff' : theme.text}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: selectedCategory === category.id ? '#fff' : theme.text },
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ List */}
          {filteredFAQs.length > 0 ? (
            <FlatList
              data={filteredFAQs}
              renderItem={renderFAQItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={theme.subtext} />
              <Text style={[styles.emptyStateText, { color: theme.subtext }]}>
                No results found for "{searchQuery}"
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Contact Support Modal */}
      <Modal
        visible={showContactForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Contact Support</Text>
              <TouchableOpacity onPress={() => setShowContactForm(false)} disabled={submittingTicket}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.label, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryButtons}>
              {FAQ_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButtonSmall,
                    {
                      backgroundColor: supportCategory === cat.id ? theme.primary : theme.background,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setSupportCategory(cat.id)}
                  disabled={submittingTicket}
                >
                  <Text
                    style={[
                      styles.categoryButtonTextSmall,
                      { color: supportCategory === cat.id ? '#fff' : theme.text },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Subject</Text>
            <TextInput
              style={[styles.supportInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, minHeight: 50 }]}
              placeholder="Brief description of your issue..."
              placeholderTextColor={theme.subtext}
              value={supportSubject}
              onChangeText={setSupportSubject}
              maxLength={200}
              editable={!submittingTicket}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Message</Text>
            <TextInput
              style={[styles.supportInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={theme.subtext}
              multiline
              numberOfLines={6}
              value={supportMessage}
              onChangeText={setSupportMessage}
              maxLength={5000}
              editable={!submittingTicket}
            />
            <Text style={[styles.charCount, { color: theme.subtext }]}>
              {supportMessage.length}/5000
            </Text>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.primary, opacity: submittingTicket ? 0.7 : 1 },
              ]}
              onPress={handleSubmitSupport}
              disabled={submittingTicket || !supportSubject.trim() || !supportMessage.trim()}
            >
              {submittingTicket ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  faqCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  tutorialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tutorialIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tutorialContent: {
    flex: 1,
  },
  tutorialTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  tutorialDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 20,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  supportInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryButtonTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});

