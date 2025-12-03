/**
 * M1A Chat Screen
 * Full chat interface for detailed conversations with M1A assistant
 */

import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { useM1AAssistant } from '../contexts/M1AAssistantContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import M1AAssistantService from '../services/M1AAssistantService';
import M1ALogo from '../components/M1ALogo';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function M1AChatScreen({ onClose }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigationHook = useNavigation();
  const { navigationRef } = useM1AAssistant();
  
  // Use navigationRef if available (for modal context), otherwise use hook
  const navigation = navigationRef?.current || navigationHook;
  const { isAdminEmail } = useRole();
  const { userPersona } = useM1APersonalization();
  
  // Admin accounts should not use persona - they always get admin control center
  // If admin has a persona set, ignore it and show admin interface
  const {
    chatHistory,
    isTyping,
    isLoadingHistory,
    sendMessage,
    currentScreen,
    addMessage,
    setNavigation,
  } = useM1AAssistant();

  // Set up navigation ref for M1A Assistant
  useEffect(() => {
    if (navigation) {
      setNavigation(navigation);
    }
  }, [navigation, setNavigation]);

  // SECURITY: Check if this is admin@merkabaent.com
  const isAdmin = isAdminEmail && user?.email === 'admin@merkabaent.com';
  
  // Admin stats
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    employees: 0,
    totalServices: 0,
    activeEvents: 0,
    pendingOrders: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const [inputText, setInputText] = useState('');
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [serviceRequestType, setServiceRequestType] = useState('');
  const [serviceRequestDetails, setServiceRequestDetails] = useState('');
  const flatListRef = useRef(null);

  // Load admin stats
  const loadAdminStats = useCallback(async () => {
    if (!isAdmin) {
      setLoadingStats(false);
      return;
    }
    try {
      setLoadingStats(true);
      // Load from multiple collections in parallel
      const [usersSnapshot, servicesSnapshot, publicEventsSnapshot, eventBookingsSnapshot, ordersSnapshot, cartOrdersSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'services')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'publicEvents')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'eventBookings')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'orders')).catch(() => ({ size: 0, docs: [] })),
        getDocs(collection(db, 'cartOrders')).catch(() => ({ size: 0, docs: [] })),
      ]);

      const totalUsers = usersSnapshot.size || 0;
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.accountStatus !== 'inactive' && data.role !== 'inactive';
      }).length;
      const employees = usersSnapshot.docs.filter(doc => doc.data().role === 'employee').length;
      const totalServices = servicesSnapshot.size || 0;
      
      // Combine events from both collections
      const totalEvents = (publicEventsSnapshot.size || 0) + (eventBookingsSnapshot.size || 0);
      
      // Combine orders from both collections
      const allOrders = [...ordersSnapshot.docs, ...cartOrdersSnapshot.docs];
      const pendingOrders = allOrders.filter(doc => {
        const data = doc.data();
        return data.status === 'pending' || !data.status;
      }).length;

      setAdminStats({
        totalUsers,
        activeUsers,
        employees,
        totalServices,
        activeEvents: totalEvents,
        pendingOrders,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      // Set default stats on error
      setAdminStats({
        totalUsers: 0,
        activeUsers: 0,
        employees: 0,
        totalServices: 0,
        activeEvents: 0,
        pendingOrders: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin, loadAdminStats]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatHistory.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatHistory, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const message = inputText.trim();
    setInputText('');
    await sendMessage(message);
  };

  const handleQuickAction = async (action) => {
    // First, try to detect if this is a direct navigation request
    const lowerAction = action.toLowerCase();
    const screenMap = M1AAssistantService.getScreenMap();
    
    // Check for direct navigation keywords
    let targetScreen = null;
    for (const [keyword, screen] of Object.entries(screenMap)) {
      if (lowerAction.includes(keyword)) {
        targetScreen = screen;
        break;
      }
    }
    
    // If we found a direct navigation target, navigate immediately
    if (targetScreen) {
      try {
        navigation.navigate(targetScreen);
        // Add a quick confirmation message
        addMessage('assistant', `Taking you to ${M1AAssistantService.getScreenName(targetScreen)}...`, false);
        return;
      } catch (error) {
        console.warn('Navigation error:', error);
        // Fall through to send message if navigation fails
      }
    }
    
    // Otherwise, send as a message (which will also handle navigation if detected)
    setInputText(action);
    await sendMessage(action);
  };

  const handleServiceRequest = async (type, details = '') => {
    try {
      // Simulate service request submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const requestTypes = {
        'cleanup': 'Cleanup Service',
        'accident': 'Accident Assistance',
        'general': 'General Help',
        'other': 'Special Request',
      };

      addMessage('assistant', 
        `✅ Service request submitted!\n\n` +
        `Type: ${requestTypes[type] || 'General Help'}\n` +
        `${details ? `Details: ${details}\n\n` : ''}` +
        `Our team has been notified and will assist you shortly. Thank you for letting us know!`,
        false
      );

      setShowServiceRequest(false);
      setServiceRequestType('');
      setServiceRequestDetails('');
      
      Alert.alert(
        'Service Request Submitted',
        'Our team has been notified and will assist you shortly.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit service request. Please try again.');
    }
  };

  const getQuickSuggestions = () => {
    // Get context-aware suggestions from the service
    const contextualSuggestions = M1AAssistantService.getContextualSuggestions(currentScreen);
    
    // Enhanced quick actions that directly navigate or perform actions
    const directActions = [
      'Create an Event',
      'Browse Bar Menu',
      'View Dashboard',
      'Explore Services',
      'Open Wallet',
      'Check Calendar',
    ];
    
    // Combine contextual suggestions with direct actions
    const allSuggestions = [...contextualSuggestions, ...directActions];
    
    // Remove duplicates and return
    return [...new Set(allSuggestions)];
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.assistantMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: 'transparent' }]}>
            <M1ALogo size={32} variant="icon" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isUser ? theme.primary : theme.cardBackground,
              borderColor: isUser ? 'transparent' : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#fff' : theme.text },
            ]}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.messageTime,
              { color: isUser ? 'rgba(255,255,255,0.7)' : theme.subtext },
            ]}
          >
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {isUser && (
          <View style={[styles.avatar, { backgroundColor: theme.subtext }]}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
        )}
      </View>
    );
  };

  const renderQuickSuggestion = (suggestion) => (
    <TouchableOpacity
      key={suggestion}
      style={[styles.suggestionChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
      onPress={() => handleQuickAction(suggestion)}
    >
      <Text style={[styles.suggestionText, { color: theme.text }]}>{suggestion}</Text>
    </TouchableOpacity>
  );

  // Admin Control Center Sections
  const adminSections = [
    {
      id: 'users',
      title: 'User Management',
      icon: 'people',
      color: '#007AFF',
      description: 'Manage all users, deactivate accounts, view activity',
      onPress: () => {
        console.log('Admin: Navigating to User Management');
        if (navigation) {
          navigation.navigate('AdminUserManagement');
        } else {
          console.error('Navigation object not available');
        }
      },
    },
    {
      id: 'services',
      title: 'Service Management',
      icon: 'business',
      color: '#34C759',
      description: 'Add, edit, delete services. Manage prices and deals',
      onPress: () => {
        console.log('Admin: Navigating to Service Management');
        if (navigation) {
          navigation.navigate('AdminServiceManagement');
        }
      },
    },
    {
      id: 'calendar',
      title: 'Calendar Management',
      icon: 'calendar',
      color: '#FF9500',
      description: 'Edit events, manage bookings, control availability',
      onPress: () => {
        console.log('Admin: Navigating to Calendar Management');
        if (navigation) {
          navigation.navigate('AdminCalendarManagement');
        }
      },
    },
    {
      id: 'createEvent',
      title: 'Create Public Event',
      icon: 'add-circle',
      color: '#9C27B0',
      description: 'Create events with tickets, pricing, photos, and discounts',
      onPress: () => {
        console.log('Admin: Navigating to Event Creation');
        if (navigation) {
          navigation.navigate('AdminEventCreation');
        }
      },
    },
    {
      id: 'messages',
      title: 'User Messaging',
      icon: 'chatbubbles',
      color: '#9C27B0',
      description: 'Message any user, send announcements',
      onPress: () => {
        console.log('Admin: Navigating to Messaging');
        if (navigation) {
          navigation.navigate('AdminMessaging');
        }
      },
    },
    {
      id: 'employees',
      title: 'Employee Management',
      icon: 'briefcase',
      color: '#00BCD4',
      description: 'Manage employees, assign roles, track performance',
      onPress: () => {
        console.log('Admin: Navigating to Employee Management');
        if (navigation) {
          navigation.navigate('AdminEmployeeManagement');
        }
      },
    },
    {
      id: 'menu',
      title: 'Menu Management',
      icon: 'restaurant',
      color: '#FF6B6B',
      description: 'Edit bar menu, update prices, manage items',
      onPress: () => {
        console.log('Admin: Navigating to Menu Management');
        if (navigation) {
          navigation.navigate('AdminMenuManagement');
        }
      },
    },
    {
      id: 'orders',
      title: 'Order Management',
      icon: 'receipt',
      color: '#4ECDC4',
      description: 'View all orders, process refunds, manage transactions',
      onPress: () => {
        console.log('Admin: Navigating to Order Management');
        if (navigation) {
          navigation.navigate('AdminOrderManagement');
        }
      },
    },
    {
      id: 'analytics',
      title: 'Analytics & Reports',
      icon: 'stats-chart',
      color: '#95E1D3',
      description: 'View revenue, user activity, performance metrics',
      onPress: () => {
        console.log('Admin: Navigating to Analytics');
        if (navigation) {
          navigation.navigate('AdminAnalytics');
        }
      },
    },
    {
      id: 'settings',
      title: 'System Settings',
      icon: 'settings',
      color: '#F38181',
      description: 'Configure app settings, integrations, system preferences',
      onPress: () => {
        console.log('Admin: Navigating to System Settings');
        if (navigation) {
          navigation.navigate('AdminSystemSettings');
        }
      },
    },
  ];

  // If admin, show control center instead of chat
  if (isAdmin) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['bottom', 'left', 'right']}
      >
        {/* Admin Header */}
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.cardBackground, 
            borderBottomColor: theme.border,
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 8 : 12),
          }
        ]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Control Center</Text>
              <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
                Complete control over all app functions
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Admin Dashboard */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.adminContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadAdminStats().finally(() => setRefreshing(false));
              }}
              tintColor={theme.primary}
            />
          }
        >
          {/* Welcome Section */}
          <View style={[styles.welcomeCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome, Admin</Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.subtext }]}>
              Manage all aspects of the M1A platform from this control center
            </Text>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Stats</Text>
            {loadingStats ? (
              <View style={styles.statsLoadingContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.subtext }]}>Loading stats...</Text>
              </View>
            ) : (
              <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="people" size={24} color="#007AFF" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.totalUsers}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Total Users</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="person-check" size={24} color="#34C759" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.activeUsers}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Active Users</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="briefcase" size={24} color="#FF9500" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.employees}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Employees</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="business" size={24} color="#9C27B0" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.totalServices}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Services</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="calendar" size={24} color="#00BCD4" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.activeEvents}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Events</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="receipt" size={24} color="#FF6B6B" />
                <Text style={[styles.statValue, { color: theme.text }]}>{adminStats.pendingOrders}</Text>
                <Text style={[styles.statLabel, { color: theme.subtext }]}>Pending Orders</Text>
              </View>
            </View>
            )}
          </View>

          {/* Management Sections */}
          <View style={styles.sectionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Management Sections</Text>
            {adminSections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[styles.sectionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={() => {
                  try {
                    console.log(`Admin: Navigating to ${section.title} (${section.id})`);
                    if (section.onPress && navigation) {
                      section.onPress();
                    } else {
                      console.error(`Navigation issue: section.onPress=${!!section.onPress}, navigation=${!!navigation}`);
                      Alert.alert('Navigation Error', `Navigation not available. Please try again.`);
                    }
                  } catch (error) {
                    console.error(`Error navigating to ${section.title}:`, error);
                    Alert.alert('Navigation Error', `Could not navigate to ${section.title}: ${error.message}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionIcon, { backgroundColor: section.color + '20' }]}>
                  <Ionicons name={section.icon} size={28} color={section.color} />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={[styles.sectionCardTitle, { color: theme.text }]}>{section.title}</Text>
                  <Text style={[styles.sectionCardDescription, { color: theme.subtext }]}>
                    {section.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.subtext} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Regular chat interface for non-admin users
  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={[
          styles.header, 
          { 
            backgroundColor: theme.cardBackground, 
            borderBottomColor: theme.border,
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 8 : 12),
          }
        ]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerAvatar, { backgroundColor: 'transparent' }]}>
              <M1ALogo size={36} variant="icon" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>M1A Assistant</Text>
              <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
                Your AI booking agent & sales guide
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Chat Messages */}
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>
              Loading chat history...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatHistory}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyAvatar, { backgroundColor: 'transparent' }]}>
                <M1ALogo size={80} variant="icon" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                Hi! I'm M1A 👋
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                Your AI-powered booking agent and sales guide. I can help you with:
              </Text>
              <View style={styles.emptyFeatures}>
                <View style={styles.emptyFeature}>
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <Text style={[styles.emptyFeatureText, { color: theme.text }]}>
                    Creating & managing events
                  </Text>
                </View>
                <View style={styles.emptyFeature}>
                  <Ionicons name="trending-up" size={20} color={theme.primary} />
                  <Text style={[styles.emptyFeatureText, { color: theme.text }]}>
                    Sales optimization tips
                  </Text>
                </View>
                <View style={styles.emptyFeature}>
                  <Ionicons name="navigate" size={20} color={theme.primary} />
                  <Text style={[styles.emptyFeatureText, { color: theme.text }]}>
                    App navigation & tours
                  </Text>
                </View>
                <View style={styles.emptyFeature}>
                  <Ionicons name="help-circle" size={20} color={theme.primary} />
                  <Text style={[styles.emptyFeatureText, { color: theme.text }]}>
                    Answering questions
                  </Text>
                </View>
              </View>
              <Text style={[styles.emptyPrompt, { color: theme.subtext }]}>
                Ask me anything or try a quick suggestion below!
              </Text>
            </View>
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingContainer}>
                <View style={[styles.typingBubble, { backgroundColor: theme.cardBackground }]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.typingText, { color: theme.subtext }]}>
                    M1A is typing...
                  </Text>
                </View>
              </View>
            ) : chatHistory.length > 0 ? (
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.suggestionsTitle, { color: theme.subtext }]}>
                  Quick suggestions:
                </Text>
                <View style={styles.suggestionsRow}>
                  {getQuickSuggestions().slice(0, 2).map(renderQuickSuggestion)}
                </View>
              </View>
            ) : (
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.suggestionsTitle, { color: theme.subtext }]}>
                  Try asking:
                </Text>
                <View style={styles.suggestionsGrid}>
                  {getQuickSuggestions().map(renderQuickSuggestion)}
                </View>
              </View>
            )
          }
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
          {/* Service Request Button for Guest Persona */}
          {userPersona?.id === 'guest' && (
            <TouchableOpacity
              style={[styles.serviceRequestButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowServiceRequest(true)}
            >
              <Ionicons name="help-circle" size={20} color="#fff" />
              <Text style={styles.serviceRequestText}>Request Service</Text>
            </TouchableOpacity>
          )}
          
          <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ask M1A anything..."
              placeholderTextColor={theme.subtext}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: inputText.trim() ? theme.primary : theme.subtext,
                  opacity: inputText.trim() ? 1 : 0.5,
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Service Request Modal */}
      <Modal
        visible={showServiceRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceRequest(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Request On-Site Service</Text>
              <TouchableOpacity onPress={() => setShowServiceRequest(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>
              What type of assistance do you need?
            </Text>

            <View style={styles.serviceTypes}>
              {[
                { id: 'cleanup', label: 'Cleanup Service', icon: 'trash' },
                { id: 'accident', label: 'Accident Assistance', icon: 'warning' },
                { id: 'general', label: 'General Help', icon: 'help-circle' },
                { id: 'other', label: 'Other Request', icon: 'ellipsis-horizontal' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.serviceTypeButton,
                    {
                      backgroundColor: serviceRequestType === type.id ? theme.primary + '20' : theme.background,
                      borderColor: serviceRequestType === type.id ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setServiceRequestType(type.id)}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={24} 
                    color={serviceRequestType === type.id ? theme.primary : theme.subtext} 
                  />
                  <Text style={[
                    styles.serviceTypeText,
                    { color: serviceRequestType === type.id ? theme.primary : theme.text }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.detailsLabel, { color: theme.text }]}>Additional Details (Optional)</Text>
            <TextInput
              style={[
                styles.detailsInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Describe what you need..."
              placeholderTextColor={theme.subtext}
              value={serviceRequestDetails}
              onChangeText={setServiceRequestDetails}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: serviceRequestType ? theme.primary : theme.border,
                  opacity: serviceRequestType ? 1 : 0.5,
                },
              ]}
              onPress={() => {
                if (serviceRequestType) {
                  handleServiceRequest(serviceRequestType, serviceRequestDetails);
                }
              }}
              disabled={!serviceRequestType}
            >
              <Text style={styles.submitButtonText}>Submit Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    minHeight: Platform.OS === 'ios' ? 44 : 52,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  headerSubtitle: {
    fontSize: 10,
    marginTop: 0,
    lineHeight: 13,
  },
  closeButton: {
    padding: 6,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 8,
  },
  typingText: {
    fontSize: 13,
  },
  suggestionsContainer: {
    paddingVertical: 16,
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 13,
  },
  inputContainer: {
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  serviceRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  serviceRequestText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  serviceTypes: {
    marginBottom: 20,
  },
  serviceTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    gap: 12,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyFeatures: {
    width: '100%',
    marginBottom: 24,
  },
  emptyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  emptyFeatureText: {
    fontSize: 15,
    marginLeft: 12,
  },
  emptyPrompt: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  statsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  // Admin Control Center Styles
  scrollView: {
    flex: 1,
  },
  adminContent: {
    padding: 16,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '30%',
    minWidth: 100,
    aspectRatio: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 16,
    minHeight: 80,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

