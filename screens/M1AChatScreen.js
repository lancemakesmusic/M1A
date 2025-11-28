/**
 * M1A Chat Screen
 * Full chat interface for detailed conversations with M1A assistant
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useM1AAssistant } from '../contexts/M1AAssistantContext';
import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import M1AAssistantService from '../services/M1AAssistantService';
import M1ALogo from '../components/M1ALogo';

export default function M1AChatScreen({ onClose }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { userPersona } = useM1APersonalization();
  const {
    chatHistory,
    isTyping,
    sendMessage,
    currentScreen,
    addMessage,
  } = useM1AAssistant();

  const [inputText, setInputText] = useState('');
  const [showServiceRequest, setShowServiceRequest] = useState(false);
  const [serviceRequestType, setServiceRequestType] = useState('');
  const [serviceRequestDetails, setServiceRequestDetails] = useState('');
  const flatListRef = useRef(null);

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
    const suggestions = [
      'How do I create an event?',
      'What are sales tips?',
      'How to increase revenue?',
      'Show me pricing strategies',
    ];

    // Get context-specific suggestions
    const aiResponse = M1AAssistantService.generateAIResponse('', {
      screen: currentScreen,
    });

    return aiResponse.suggestions || suggestions;
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
            <M1ALogo size={32} variant="minimal" color="primary" />
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
              <M1ALogo size={36} variant="minimal" color="primary" />
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
        <FlatList
          ref={flatListRef}
          data={chatHistory}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyAvatar, { backgroundColor: 'transparent' }]}>
                <M1ALogo size={80} variant="icon" color="primary" />
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
});

