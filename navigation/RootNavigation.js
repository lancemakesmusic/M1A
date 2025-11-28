// navigation/RootNavigation.js
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import DrawerNavigator from './DrawerNavigator';
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import M1ALogo from '../components/M1ALogo';
import { useTheme } from '../contexts/ThemeContext';

export default function RootNavigation() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: personalizationLoading } = useM1APersonalization();
  const { theme } = useTheme();

  // Show loading while checking auth and personalization
  if (authLoading || personalizationLoading) {
    return (
      <View
        style={[styles.loadingContainer, { backgroundColor: theme.background }]}
        accessibilityLabel="Loading"
        accessible
      >
        <M1ALogo size={100} variant="full" style={styles.loadingLogo} />
        <ActivityIndicator size="large" color={theme.primary} style={styles.loader} />
      </View>
    );
  }

  // If not logged in, show auth
  if (!user) {
    return <AuthNavigator />;
  }

  // If logged in but not onboarded, force persona selection
  if (!isOnboarded) {
    return <OnboardingNavigator />;
  }

  // User is logged in and onboarded, show main app
    return <DrawerNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
});
