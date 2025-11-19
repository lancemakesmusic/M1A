import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const M1APersonalizationContext = createContext();

export function M1APersonalizationProvider({ children }) {
  const [userPersona, setUserPersona] = useState(null);
  const [preferences, setPreferences] = useState({
    primaryFocus: [],
    notifications: true,
    darkMode: false,
    language: 'en',
    tutorialCompleted: false,
  });
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved data on app start
  useEffect(() => {
    loadPersonalizationData();
  }, []);

  const loadPersonalizationData = async () => {
    try {
      const savedPersona = await AsyncStorage.getItem('m1a_user_persona');
      const savedPreferences = await AsyncStorage.getItem('m1a_preferences');
      const savedOnboarded = await AsyncStorage.getItem('m1a_onboarded');

      if (savedPersona) {
        setUserPersona(JSON.parse(savedPersona));
      }
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
      if (savedOnboarded) {
        setIsOnboarded(JSON.parse(savedOnboarded));
      }
    } catch (error) {
      console.error('Error loading personalization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePersona = async (persona) => {
    try {
      setUserPersona(persona);
      await AsyncStorage.setItem('m1a_user_persona', JSON.stringify(persona));
    } catch (error) {
      console.error('Error saving persona:', error);
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      const updatedPreferences = { ...preferences, ...newPreferences };
      setPreferences(updatedPreferences);
      await AsyncStorage.setItem('m1a_preferences', JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsOnboarded(true);
      await AsyncStorage.setItem('m1a_onboarded', JSON.stringify(true));
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const resetPersonalization = async () => {
    try {
      setUserPersona(null);
      setPreferences({
        primaryFocus: [],
        notifications: true,
        darkMode: false,
        language: 'en',
        tutorialCompleted: false,
      });
      setIsOnboarded(false);
      
      await AsyncStorage.multiRemove([
        'm1a_user_persona',
        'm1a_preferences',
        'm1a_onboarded'
      ]);
    } catch (error) {
      console.error('Error resetting personalization:', error);
    }
  };

  const getPersonalizedFeatures = () => {
    if (!userPersona) return [];
    return userPersona.features || [];
  };

  const getPrimaryActions = () => {
    if (!userPersona) return [];
    return userPersona.primaryActions || [];
  };

  const getPersonaColor = () => {
    if (!userPersona) return '#9C27B0';
    return userPersona.color || '#9C27B0';
  };

  const getPersonaIcon = () => {
    if (!userPersona) return 'rocket';
    return userPersona.icon || 'rocket';
  };

  const shouldShowTutorial = () => {
    return !preferences.tutorialCompleted && isOnboarded;
  };

  const markTutorialComplete = async () => {
    await savePreferences({ tutorialCompleted: true });
  };

  const getTutorialSteps = () => {
    if (!userPersona) return [];
    
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
      guest: [
        {
          title: 'Welcome to Merkaba!',
          description: 'Your personal customer service assistant',
          icon: 'person',
          content: 'M1A is here to help you enjoy your experience at Merkaba. Ask me about drinks, events, or request on-site assistance.',
        },
        {
          title: 'Drink Recommendations',
          description: 'Get personalized drink suggestions',
          icon: 'wine',
          content: 'Tell me what you like, and I\'ll recommend the perfect drinks from our menu.',
        },
        {
          title: 'On-Site Service',
          description: 'Request assistance anytime',
          icon: 'help-circle',
          content: 'Need cleanup, have an accident, or need any assistance? Tap the service request button and we\'ll help right away.',
        },
        {
          title: 'About Merkaba',
          description: 'Learn about our services',
          icon: 'information-circle',
          content: 'Ask me about what we do at Merkaba, our events, services, and how we can make your experience special.',
        },
      ],
    };

    return personaSteps[userPersona.id] || personaSteps.promoter;
  };

  const value = {
    // State
    userPersona,
    preferences,
    isOnboarded,
    loading,
    
    // Actions
    savePersona,
    savePreferences,
    completeOnboarding,
    resetPersonalization,
    
    // Getters
    getPersonalizedFeatures,
    getPrimaryActions,
    getPersonaColor,
    getPersonaIcon,
    shouldShowTutorial,
    markTutorialComplete,
    getTutorialSteps,
  };

  return (
    <M1APersonalizationContext.Provider value={value}>
      {children}
    </M1APersonalizationContext.Provider>
  );
}

export function useM1APersonalization() {
  const context = useContext(M1APersonalizationContext);
  if (!context) {
    throw new Error('useM1APersonalization must be used within a M1APersonalizationProvider');
  }
  return context;
}
