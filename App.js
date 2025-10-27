// App.js
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './polyfills';

import { AuthProvider } from './contexts/AuthContext';
import { CartBubbleProvider } from './contexts/CartBubbleContext';
import { M1APersonalizationProvider } from './contexts/M1APersonalizationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';

import RootNavigation from './navigation/RootNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <UserProvider>
            <M1APersonalizationProvider>
              <CartBubbleProvider>
                <NavigationContainer>
                  <StatusBar barStyle="dark-content" />
                  <RootNavigation />
                </NavigationContainer>
              </CartBubbleProvider>
            </M1APersonalizationProvider>
          </UserProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
