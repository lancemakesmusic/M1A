import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const NotificationPreferencesContext = createContext();

const DEFAULT_PREFERENCES = {
  // Master toggle
  enabled: true,
  
  // Message notifications
  messages: {
    enabled: true,
    newMessage: true,
    messageRead: false,
    mentions: true,
  },
  
  // Event notifications
  events: {
    enabled: true,
    reminders: true,
    newEvents: true,
    eventUpdates: true,
    cancellations: true,
  },
  
  // Discount/Promotion notifications
  discounts: {
    enabled: true,
    newDeals: true,
    priceDrops: true,
    flashSales: true,
    personalizedOffers: true,
  },
};

export function NotificationPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new preferences
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences) => {
    try {
      setPreferences(newPreferences);
      await AsyncStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const updatePreference = async (category, key, value) => {
    const updated = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [key]: value,
      },
    };
    await savePreferences(updated);
  };

  const updateMasterToggle = async (enabled) => {
    await savePreferences({
      ...preferences,
      enabled,
    });
  };

  const canSendNotification = (category, type) => {
    if (!preferences.enabled) return false;
    if (!preferences[category]?.enabled) return false;
    return preferences[category]?.[type] !== false;
  };

  return (
    <NotificationPreferencesContext.Provider
      value={{
        preferences,
        loading,
        updatePreference,
        updateMasterToggle,
        savePreferences,
        canSendNotification,
      }}
    >
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext);
  if (!context) {
    throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
  }
  return context;
}

