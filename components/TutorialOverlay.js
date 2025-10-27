import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function TutorialOverlay({ 
  visible, 
  onClose, 
  steps = [], 
  currentStep = 0,
  onNext,
  onPrevious,
  onSkip,
  personaType = 'promoter'
}) {
  const { theme } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getPersonaSpecificSteps = () => {
    const personaSteps = {
      promoter: [
        {
          title: 'Welcome to M1A!',
          description: 'Your AI-powered event promotion assistant',
          icon: 'rocket',
          content: 'M1A helps you promote events, manage social media, and track analytics all in one place.',
        },
        {
          title: 'Create Your First Event',
          description: 'Set up events quickly and efficiently',
          icon: 'add-circle',
          content: 'Use the "Schedule an Event" button to create your first event. Add details, set dates, and configure pricing.',
        },
        {
          title: 'Social Media Integration',
          description: 'Connect your social platforms',
          icon: 'share-social',
          content: 'Link your Instagram, Facebook, and Twitter accounts to automatically promote your events.',
        },
        {
          title: 'Analytics Dashboard',
          description: 'Track your event performance',
          icon: 'analytics',
          content: 'Monitor ticket sales, social engagement, and revenue in real-time.',
        },
      ],
      coordinator: [
        {
          title: 'Event Coordination Made Easy',
          description: 'Plan and execute flawless events',
          icon: 'calendar',
          content: 'M1A helps you coordinate every aspect of your events from planning to execution.',
        },
        {
          title: 'Vendor Management',
          description: 'Keep track of all your vendors',
          icon: 'business',
          content: 'Manage contracts, payments, and communications with all your event vendors.',
        },
        {
          title: 'Timeline Builder',
          description: 'Create detailed event timelines',
          icon: 'time',
          content: 'Build comprehensive timelines and keep everyone on schedule.',
        },
        {
          title: 'Budget Tracking',
          description: 'Monitor your event budget',
          icon: 'card',
          content: 'Track expenses, manage payments, and stay within budget.',
        },
      ],
      wedding_planner: [
        {
          title: 'Wedding Planning Studio',
          description: 'Create magical moments for couples',
          icon: 'heart',
          content: 'M1A helps you plan beautiful weddings with ease and attention to detail.',
        },
        {
          title: 'Vendor Portfolio',
          description: 'Showcase your preferred vendors',
          icon: 'images',
          content: 'Build a portfolio of trusted vendors to recommend to your couples.',
        },
        {
          title: 'Design Boards',
          description: 'Visualize wedding concepts',
          icon: 'color-palette',
          content: 'Create beautiful design boards to help couples visualize their special day.',
        },
        {
          title: 'Timeline Management',
          description: 'Keep the big day on track',
          icon: 'list',
          content: 'Create detailed timelines for the wedding day and all related events.',
        },
      ],
      venue_owner: [
        {
          title: 'Venue Management Hub',
          description: 'Maximize your space potential',
          icon: 'business',
          content: 'M1A helps you manage bookings, track revenue, and grow your venue business.',
        },
        {
          title: 'Booking Calendar',
          description: 'Manage your venue schedule',
          icon: 'calendar',
          content: 'View and manage all your venue bookings in one comprehensive calendar.',
        },
        {
          title: 'Revenue Analytics',
          description: 'Track your venue performance',
          icon: 'trending-up',
          content: 'Monitor revenue, occupancy rates, and identify growth opportunities.',
        },
        {
          title: 'Client Portal',
          description: 'Streamline client communications',
          icon: 'people',
          content: 'Provide clients with easy access to booking details and venue information.',
        },
      ],
      performer: [
        {
          title: 'Performance Dashboard',
          description: 'Manage your entertainment business',
          icon: 'musical-notes',
          content: 'M1A helps you manage bookings, showcase your work, and grow your performance business.',
        },
        {
          title: 'Booking Management',
          description: 'Track your performance schedule',
          icon: 'calendar',
          content: 'Manage all your performance bookings and availability in one place.',
        },
        {
          title: 'Portfolio Showcase',
          description: 'Display your best work',
          icon: 'camera',
          content: 'Create a stunning portfolio to attract new clients and opportunities.',
        },
        {
          title: 'Earnings Tracker',
          description: 'Monitor your performance income',
          icon: 'cash',
          content: 'Track your earnings, manage payments, and plan for future growth.',
        },
      ],
      vendor: [
        {
          title: 'Service Management',
          description: 'Connect with clients and grow your business',
          icon: 'construct',
          content: 'M1A helps you manage your service business and connect with event professionals.',
        },
        {
          title: 'Service Catalog',
          description: 'Showcase your offerings',
          icon: 'list',
          content: 'Create detailed service listings with pricing and availability.',
        },
        {
          title: 'Quote Generator',
          description: 'Create professional quotes quickly',
          icon: 'document-text',
          content: 'Generate detailed quotes and proposals for potential clients.',
        },
        {
          title: 'Client Management',
          description: 'Build lasting client relationships',
          icon: 'people',
          content: 'Track client interactions, manage contracts, and build your reputation.',
        },
      ],
    };

    return personaSteps[personaType] || personaSteps.promoter;
  };

  const tutorialSteps = steps.length > 0 ? steps : getPersonaSpecificSteps();
  const currentStepData = tutorialSteps[currentStep];

  if (!visible || !currentStepData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { 
            opacity: fadeAnim,
            backgroundColor: 'rgba(0,0,0,0.8)'
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.container,
            { 
              backgroundColor: theme.background,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.primary,
                    width: `${((currentStep + 1) / tutorialSteps.length) * 100}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.subtext }]}>
              {currentStep + 1} of {tutorialSteps.length}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name={currentStepData.icon} size={48} color={theme.primary} />
            </View>
            
            <Text style={[styles.title, { color: theme.text }]}>
              {currentStepData.title}
            </Text>
            
            <Text style={[styles.description, { color: theme.subtext }]}>
              {currentStepData.description}
            </Text>
            
            <Text style={[styles.contentText, { color: theme.text }]}>
              {currentStepData.content}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: theme.border }]}
              onPress={onSkip}
            >
              <Text style={[styles.skipButtonText, { color: theme.subtext }]}>Skip</Text>
            </TouchableOpacity>

            <View style={styles.navigationButtons}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, { borderColor: theme.border }]}
                  onPress={onPrevious}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.text} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: theme.primary }]}
                onPress={currentStep === tutorialSteps.length - 1 ? onClose : onNext}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  contentText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
