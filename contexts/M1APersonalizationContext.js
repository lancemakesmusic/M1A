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
