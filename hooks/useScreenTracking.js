/**
 * Hook to automatically track screen views
 */

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { trackScreenView } from '../services/AnalyticsService';

export const useScreenTracking = (screenName) => {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      trackScreenView(screenName);
    });

    // Track initial screen view
    trackScreenView(screenName);

    return unsubscribe;
  }, [navigation, screenName]);
};

export default useScreenTracking;

