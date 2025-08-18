// App.js
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import RootNavigation from './navigation/RootNavigation';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}
