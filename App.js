// App.js
import { NavigationContainer } from '@react-navigation/native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Platform, StatusBar, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import './polyfills';

import { AuthProvider } from './contexts/AuthContext';
import { CartBubbleProvider } from './contexts/CartBubbleContext';
import { M1APersonalizationProvider } from './contexts/M1APersonalizationContext';
import { M1AAssistantProvider } from './contexts/M1AAssistantContext';
import { MessageBadgeProvider } from './contexts/MessageBadgeContext';
import { NotificationPreferencesProvider } from './contexts/NotificationPreferencesContext';
import { RoleProvider } from './contexts/RoleContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { WalletProvider } from './contexts/WalletContext';

import RootNavigation from './navigation/RootNavigation';
import M1AChatBubble from './components/M1AChatBubble';
import NavigationAwareM1A from './components/NavigationAwareM1A';
import ErrorBoundary from './components/ErrorBoundary';

// Analytics
import { initAnalytics } from './services/AnalyticsService';
import RetentionService from './services/RetentionService';
import { initNotifications } from './services/NotificationService';
import RatingPromptService, { POSITIVE_ACTIONS } from './services/RatingPromptService';

// Web-specific fix: Ensure pointer events work correctly
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  // Inject CSS to ensure all interactive elements are clickable
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-tap-highlight-color: transparent;
    }
    button, a, [role="button"], [onClick], [onPress] {
      cursor: pointer !important;
      pointer-events: auto !important;
      touch-action: manipulation !important;
    }
  `;
  document.head.appendChild(style);
}

// Create navigation ref for root-level navigation
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize analytics
    initAnalytics();
    
    // Initialize notifications (async, but don't block)
    initNotifications().catch(error => {
      console.warn('⚠️ Failed to initialize notifications:', error);
    });
    
    // Track first use and session
    RetentionService.trackSession().then(sessionData => {
      // Record positive action if user has multiple sessions
      if (sessionData && !sessionData.isFirstUse && sessionData.totalSessions > 1) {
        RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.MULTIPLE_SESSIONS, {
          totalSessions: sessionData.totalSessions,
        }).catch(error => {
          console.warn('Error recording multiple sessions action:', error);
        });
      }
    });
    
    // Track app state changes for session management
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        RetentionService.trackSession().then(sessionData => {
          // Record positive action if user has multiple sessions
          if (sessionData && !sessionData.isFirstUse && sessionData.totalSessions > 1) {
            RatingPromptService.recordPositiveAction(POSITIVE_ACTIONS.MULTIPLE_SESSIONS, {
              totalSessions: sessionData.totalSessions,
            }).catch(error => {
              console.warn('Error recording multiple sessions action:', error);
            });
          }
        });
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background
        RetentionService.endSession();
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription?.remove();
      RetentionService.endSession();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <UserProvider>
              <WalletProvider>
                <RoleProvider>
                  <M1APersonalizationProvider>
                  <NotificationPreferencesProvider>
                    <MessageBadgeProvider>
                      <M1AAssistantProvider>
                        <CartBubbleProvider>
                        <NavigationContainer ref={navigationRef}>
                          <StatusBar barStyle="dark-content" />
                          <RootNavigation />
                          <NavigationAwareM1A />
                          <M1AChatBubble />
                        </NavigationContainer>
                      </CartBubbleProvider>
                    </M1AAssistantProvider>
                    </MessageBadgeProvider>
                  </NotificationPreferencesProvider>
                </M1APersonalizationProvider>
                </RoleProvider>
              </WalletProvider>
            </UserProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
