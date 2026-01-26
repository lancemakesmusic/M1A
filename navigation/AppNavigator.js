// navigation/AppNavigator.js
import Ionicons from '@expo/vector-icons/Ionicons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { useMessageBadge } from '../contexts/MessageBadgeContext';

// Screens
import AdminAnalyticsScreen from '../screens/AdminAnalyticsScreen';
import AdminCalendarManagementScreen from '../screens/AdminCalendarManagementScreen';
import AdminControlCenterScreen from '../screens/AdminControlCenterScreen';
import AdminEmployeeManagementScreen from '../screens/AdminEmployeeManagementScreen';
import AdminEventCreationScreen from '../screens/AdminEventCreationScreen';
import EventAnalyticsScreen from '../screens/EventAnalyticsScreen';
import AdminMenuManagementScreen from '../screens/AdminMenuManagementScreen';
import AdminMessagingScreen from '../screens/AdminMessagingScreen';
import AdminOrderManagementScreen from '../screens/AdminOrderManagementScreen';
import AdminServiceManagementScreen from '../screens/AdminServiceManagementScreen';
import AdminSetupScreen from '../screens/AdminSetupScreen';
import AdminSystemSettingsScreen from '../screens/AdminSystemSettingsScreen';
import AdminUserManagementScreen from '../screens/AdminUserManagementScreen';
import AutoPosterScreen from '../screens/AutoPosterScreen';
import BarCategoryScreen from '../screens/BarCategoryScreen';
import BarMenuCategoryScreen from '../screens/BarMenuCategoryScreen';
import BarMenuScreen from '../screens/BarMenuScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import EventBookingScreen from '../screens/EventBookingScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FollowersListScreen from '../screens/FollowersListScreen';
import HelpScreen from '../screens/HelpScreen';
import HomeScreen from '../screens/HomeScreen';
import M1ADashboardScreen from '../screens/M1ADashboardScreen';
import M1APersonalizationScreen from '../screens/M1APersonalizationScreen';
import M1ASettingsScreen from '../screens/M1ASettingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProfileViewsScreen from '../screens/ProfileViewsScreen';
import ServiceBookingScreen from '../screens/ServiceBookingScreen';
import UserProfileViewScreen from '../screens/UserProfileViewScreen';
import WalletScreen from '../screens/WalletScreen';

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
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminControlCenter"
        component={AdminControlCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminUserManagement"
        component={AdminUserManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminServiceManagement"
        component={AdminServiceManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminCalendarManagement"
        component={AdminCalendarManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminEventCreation"
        component={AdminEventCreationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventAnalytics"
        component={EventAnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminMessaging"
        component={AdminMessagingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminEmployeeManagement"
        component={AdminEmployeeManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminMenuManagement"
        component={AdminMenuManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminOrderManagement"
        component={AdminOrderManagementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminAnalytics"
        component={AdminAnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminSystemSettings"
        component={AdminSystemSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminSetup"
        component={AdminSetupScreen}
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
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="FollowersList"
        component={FollowersListScreen}
        options={{ title: 'Followers' }}
      />
      <Stack.Screen
        name="ProfileViews"
        component={ProfileViewsScreen}
        options={{ title: 'Profile Views' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{ title: 'Create Post' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();
  const messageBadge = useMessageBadge(); // Get unread count from context
  const unreadCount = messageBadge?.unreadCount || 0; // Safely get unreadCount with fallback
  
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
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen}
        options={() => ({
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
            minWidth: 18,
            height: 18,
            borderRadius: 9,
          },
        })}
      />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
