// navigation/AppNavigator.js
import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';

// Screens
import AutoPosterScreen from '../screens/AutoPosterScreen';
import BarMenuScreen from '../screens/BarMenuScreen';
import EventBookingScreen from '../screens/EventBookingScreen';
import ExploreScreen from '../screens/ExploreScreen';
import HomeScreen from '../screens/HomeScreen';
import M1ADashboardScreen from '../screens/M1ADashboardScreen';
import M1APersonalizationScreen from '../screens/M1APersonalizationScreen';
import M1ASettingsScreen from '../screens/M1ASettingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ServiceBookingScreen from '../screens/ServiceBookingScreen';
import WalletScreen from '../screens/WalletScreen';
import HelpScreen from '../screens/HelpScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import CalendarScreen from '../screens/CalendarScreen';
import UserProfileViewScreen from '../screens/UserProfileViewScreen';
import BarCategoryScreen from '../screens/BarCategoryScreen';
import BarMenuCategoryScreen from '../screens/BarMenuCategoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Home stack to include event booking
function HomeStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventBooking"
        component={EventBookingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AutoPoster"
        component={AutoPosterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BarMenu"
        component={BarMenuScreen}
        options={{ headerShown: false }}
      />
             <Stack.Screen
               name="M1APersonalization"
               component={M1APersonalizationScreen}
               options={{ headerShown: false }}
             />
             <Stack.Screen
               name="M1ADashboard"
               component={M1ADashboardScreen}
               options={{ headerShown: false }}
             />
      <Stack.Screen
        name="M1ASettings"
        component={M1ASettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ServiceBooking"
        component={ServiceBookingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UserProfileView"
        component={UserProfileViewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BarCategory"
        component={BarCategoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BarMenuCategory"
        component={BarMenuCategoryScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Profile stack to avoid nested screen duplication
function ProfileStackNavigator() {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          color: theme.text,
        },
      }}
    >
      <Stack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Explore':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubble' : 'chatbubble-outline';
              break;
            case 'Wallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtext,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
