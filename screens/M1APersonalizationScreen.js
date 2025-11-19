import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

// User personas with tailored features and descriptions
const userPersonas = [
  {
    id: 'guest',
    title: 'Guest',
    subtitle: 'Patrons & Fans',
    description: 'Attend events, enjoy drinks, and experience Merkaba with personalized customer service',
    icon: 'person',
    color: '#3498DB',
    gradient: ['#3498DB', '#5DADE2'],
    features: [
      'Drink Recommendations',
      'Event Information',
      'On-Site Service Requests',
      'Merkaba Information',
      'Customer Support',
      'Service Discovery'
    ],
    primaryActions: ['Browse Menu', 'Request Service', 'Learn About Merkaba', 'Get Help']
  },
  {
    id: 'promoter',
    title: 'Event Promoter',
    subtitle: 'Music & Entertainment Events',
    description: 'Create buzz, manage ticket sales, and promote your events to maximum attendance',
    icon: 'megaphone',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E8E'],
    features: [
      'Social Media Marketing',
      'Ticket Sales Management',
      'Artist Booking Tools',
      'Event Analytics',
      'Audience Insights',
      'Promotional Materials'
    ],
    primaryActions: ['Create Event', 'Manage Tickets', 'Social Media', 'Analytics']
  },
  {
    id: 'coordinator',
    title: 'Event Coordinator',
    subtitle: 'Corporate & Private Events',
    description: 'Plan, organize, and execute flawless events with comprehensive management tools',
    icon: 'calendar',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#6ED5CD'],
    features: [
      'Event Planning Timeline',
      'Vendor Management',
      'Guest List Management',
      'Budget Tracking',
      'Timeline Coordination',
      'Post-Event Analysis'
    ],
    primaryActions: ['Plan Event', 'Manage Vendors', 'Track Budget', 'Coordinate Timeline']
  },
  {
    id: 'wedding_planner',
    title: 'Wedding Planner',
    subtitle: 'Wedding & Special Occasions',
    description: 'Create magical moments with specialized wedding planning and coordination tools',
    icon: 'heart',
    color: '#FFB6C1',
    gradient: ['#FFB6C1', '#FFC0CB'],
    features: [
      'Wedding Timeline Builder',
      'Vendor Portfolio',
      'Guest Management',
      'Budget Planning',
      'Design Mood Boards',
      'Day-of Coordination'
    ],
    primaryActions: ['Plan Wedding', 'Manage Vendors', 'Track Budget', 'Create Timeline']
  },
  {
    id: 'venue_owner',
    title: 'Venue Owner',
    subtitle: 'Venue & Space Management',
    description: 'Maximize your venue potential with booking management and client coordination tools',
    icon: 'business',
    color: '#9B59B6',
    gradient: ['#9B59B6', '#B370CF'],
    features: [
      'Booking Management',
      'Space Configuration',
      'Client Communication',
      'Revenue Analytics',
      'Maintenance Scheduling',
      'Staff Coordination'
    ],
    primaryActions: ['Manage Bookings', 'View Calendar', 'Track Revenue', 'Client Portal']
  },
  {
    id: 'performer',
    title: 'Performer/Artist',
    subtitle: 'Entertainment & Performance',
    description: 'Manage bookings, showcase your talent, and grow your entertainment business',
    icon: 'musical-notes',
    color: '#F39C12',
    gradient: ['#F39C12', '#F5B041'],
    features: [
      'Booking Management',
      'Portfolio Showcase',
      'Client Communication',
      'Performance Calendar',
      'Revenue Tracking',
      'Marketing Tools'
    ],
    primaryActions: ['Manage Bookings', 'Update Portfolio', 'Track Earnings', 'Marketing']
  },
  {
    id: 'vendor',
    title: 'Service Vendor',
    subtitle: 'Catering, Photography, etc.',
    description: 'Connect with clients and manage your service business efficiently',
    icon: 'construct',
    color: '#2ECC71',
    gradient: ['#2ECC71', '#58D68D'],
    features: [
      'Service Portfolio',
      'Client Management',
      'Booking System',
      'Quote Generation',
      'Payment Processing',
      'Review Management'
    ],
    primaryActions: ['Manage Services', 'View Bookings', 'Generate Quotes', 'Client Portal']
  }
];

export default function M1APersonalizationScreen({ navigation }) {
  const { theme } = useTheme();
  const { savePersona, savePreferences, completeOnboarding } = useM1APersonalization();
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Persona Selection, 2: Features, 3: Preferences

  const handlePersonaSelect = (persona) => {
    setSelectedPersona(persona);
    setCurrentStep(2);
  };

  const handleContinue = async () => {
    if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      try {
        // Save persona and preferences
        await savePersona(selectedPersona);
        await savePreferences({
          primaryFocus: selectedPersona.primaryActions,
          tutorialCompleted: false, // Will show tutorial on first home screen visit
        });
        await completeOnboarding();
        
        // Onboarding complete - RootNavigation will automatically show AppNavigator
        // No need to navigate manually, the context change will trigger re-render
      } catch (error) {
        console.error('Error saving personalization:', error);
        Alert.alert('Error', 'Failed to save your preferences. Please try again.');
      }
    }
  };

  const renderPersonaCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.personaCard,
        {
          backgroundColor: theme.cardBackground,
          borderColor: selectedPersona?.id === item.id ? item.color : theme.border,
          borderWidth: selectedPersona?.id === item.id ? 3 : 1,
        }
      ]}
      onPress={() => handlePersonaSelect(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.personaIcon, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon} size={32} color={item.color} />
      </View>
      <Text style={[styles.personaTitle, { color: theme.text }]}>{item.title}</Text>
      <Text style={[styles.personaSubtitle, { color: theme.subtext }]}>{item.subtitle}</Text>
      <Text style={[styles.personaDescription, { color: theme.subtext }]}>{item.description}</Text>
      
      {selectedPersona?.id === item.id && (
        <View style={[styles.selectedIndicator, { backgroundColor: item.color }]}>
          <Ionicons name="checkmark" size={20} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFeatures = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>
        Your {selectedPersona?.title} Features
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
        M1A will customize your experience with these specialized tools
      </Text>
      
      <View style={styles.featuresGrid}>
        {selectedPersona?.features.map((feature, index) => (
          <View key={index} style={[styles.featureItem, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="checkmark-circle" size={20} color={selectedPersona.color} />
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>
        Personalize Your Experience
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
        Tell us more about your preferences to get the most out of M1A
      </Text>
      
      <View style={styles.preferencesContainer}>
        <Text style={[styles.preferenceLabel, { color: theme.text }]}>
          Primary Focus Areas:
        </Text>
        <View style={styles.preferenceChips}>
          {selectedPersona?.primaryActions.map((action, index) => (
            <View key={index} style={[styles.chip, { backgroundColor: selectedPersona.color + '20' }]}>
              <Text style={[styles.chipText, { color: selectedPersona.color }]}>{action}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: theme.text }]}>
                How do you use M1A?
              </Text>
              <Text style={[styles.stepSubtitle, { color: theme.subtext }]}>
                Select your role to customize your experience
              </Text>
              <FlatList
                data={userPersonas}
                renderItem={renderPersonaCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.personaRow}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>
          </ScrollView>
        );
      case 2:
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderFeatures()}
          </ScrollView>
        );
      case 3:
        return (
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderPreferences()}
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>M1A Setup</Text>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                {
                  backgroundColor: step <= currentStep ? '#007AFF' : theme.border,
                }
              ]}
            />
          ))}
        </View>
        <Text style={[styles.progressText, { color: theme.subtext }]}>
          Step {currentStep} of 3
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderStepContent()}
      </View>

      {/* Continue Button */}
      {selectedPersona && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: selectedPersona.color }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {currentStep === 3 ? 'Complete Setup' : 'Continue'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    flex: 1,
  },
  stepContainer: {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  personaRow: {
    justifyContent: 'space-between',
  },
  personaCard: {
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  personaIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  personaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  personaSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  personaDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: (width - 60) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  preferencesContainer: {
    marginTop: 20,
  },
  preferenceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  preferenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
