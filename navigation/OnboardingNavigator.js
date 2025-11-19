// navigation/OnboardingNavigator.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import M1APersonalizationScreen from '../screens/M1APersonalizationScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent back navigation during onboarding
      }}
    >
      <Stack.Screen
        name="PersonaSelection"
        component={M1APersonalizationScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}

