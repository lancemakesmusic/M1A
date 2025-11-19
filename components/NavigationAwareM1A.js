/**
 * Navigation-Aware M1A Context Wrapper
 * This component wraps the M1A Assistant to provide navigation context
 */

import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useM1AAssistant } from '../contexts/M1AAssistantContext';

export default function NavigationAwareM1A() {
  const navigation = useNavigation();
  const { updateCurrentScreen, setNavigation } = useM1AAssistant();
  const [currentRoute, setCurrentRoute] = useState('Home');
  
  // Set navigation reference in context
  useEffect(() => {
    setNavigation(navigation);
  }, [navigation, setNavigation]);
  
  // Listen to navigation state changes using navigation listener
  useEffect(() => {
    // Helper function to get current screen name
    const getCurrentScreenName = (navState) => {
      if (!navState) return 'Home';
      const route = navState.routes[navState.index];
      if (!route) return 'Home';
      
      // Handle nested navigators (tabs with stacks)
      if (route.state) {
        const nestedRoute = route.state.routes[route.state.index];
        return nestedRoute?.name || route?.name || 'Home';
      }
      return route?.name || 'Home';
    };

    // Get initial state
    try {
      const state = navigation.getState();
      if (state) {
        const screenName = getCurrentScreenName(state);
        setCurrentRoute(screenName);
        updateCurrentScreen(screenName);
      }
    } catch (error) {
      // Navigation state not ready yet, will be set by listener
      console.log('Navigation state not ready yet');
    }

    // Listen for navigation state changes
    const unsubscribe = navigation.addListener('state', (e) => {
      try {
        const navState = e.data?.state || navigation.getState();
        if (navState) {
          const screenName = getCurrentScreenName(navState);
          setCurrentRoute(prev => {
            if (prev !== screenName) {
              updateCurrentScreen(screenName);
              return screenName;
            }
            return prev;
          });
        }
      } catch (error) {
        console.warn('Error getting navigation state:', error);
      }
    });

    return unsubscribe;
  }, [navigation, updateCurrentScreen]);

  return null; // This is just a wrapper component
}

