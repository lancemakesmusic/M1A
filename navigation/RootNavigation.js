// navigation/RootNavigation.js
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import DrawerNavigator from './DrawerNavigator';
import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';

export default function RootNavigation() {
  const { user, loading: authLoading } = useAuth();
  const { isOnboarded, loading: personalizationLoading } = useM1APersonalization();

  // Show loading while checking auth and personalization
  if (authLoading || personalizationLoading) {
    return (
      <View
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        accessibilityLabel="Loading"
        accessible
      >
        <ActivityIndicator size="large" />
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
