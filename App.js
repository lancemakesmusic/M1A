// App.js
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';

import RootNavigation from './navigation/RootNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <UserProvider>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" />
              <RootNavigation />
            </NavigationContainer>
          </UserProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
