/**
 * ChatGPT Service
 * Handles AI-powered chat responses using OpenAI API via backend
 * Optimized for fast responses with caching and pre-loaded answers
 */

import { Platform } from 'react-native';
import ChatResponseCache from './ChatResponseCache';

// Get API base URL
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  if (Platform.OS === 'web') {
    return 'http://localhost:8001';
  }
  
  if (__DEV__) {
    console.warn('⚠️ EXPO_PUBLIC_API_BASE_URL not set. Using localhost fallback (development only).');
    return 'http://localhost:8001';
  }
  
  throw new Error('EXPO_PUBLIC_API_BASE_URL must be set in production.');
};

class ChatGPTService {
  constructor() {
    this.baseURL = getApiBaseUrl();
  }

  /**
   * Generate AI chat response
   * Optimized with instant responses for common questions and caching
   * @param {string} message - User's message
   * @param {Object} context - Context including chat history, user persona, current screen
   * @returns {Promise<Object>} AI response with message and metadata
   */
  async generateChatResponse(message, context = {}) {
    if (!message || typeof message !== 'string') {
      return this.getFallbackResponse();
    }

    // Step 1: Check for instant pre-loaded response (0ms delay)
    const instantResponse = ChatResponseCache.getInstantResponse(message);
    if (instantResponse) {
      return instantResponse;
    }

    // Step 2: Try API call with timeout and retry logic
    try {
      const { chatHistory = [], userPersona, currentScreen, userBehavior = {} } = context;
      
      // Build conversation history for context
      const conversationHistory = chatHistory.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.message || msg.content || '',
      }));

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(userPersona, currentScreen, userBehavior);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${this.baseURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          system_prompt: systemPrompt,
          context: {
            user_persona: userPersona?.id || 'client',
            current_screen: currentScreen || 'Home',
            user_behavior: userBehavior,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      
      const aiResponse = {
        message: data.message || data.response || 'I apologize, but I encountered an error generating a response.',
        metadata: { ...data.metadata, instant: false, cached: false, source: 'api' },
        suggestions: data.suggestions || [],
        action: data.action || null,
      };

      // Cache the response for future use
      ChatResponseCache.cacheResponse(message, aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('ChatGPT API error:', error);
      
      // Check if we have a cached response as fallback
      const cachedResponse = ChatResponseCache.getInstantResponse(message);
      if (cachedResponse && cachedResponse.metadata?.cached) {
        return cachedResponse;
      }

      // Return intelligent fallback based on query
      return this.getIntelligentFallback(message, context);
    }
  }

  /**
   * Get intelligent fallback response based on query intent
   * Enhanced with better context awareness and conversation flow
   */
  getIntelligentFallback(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    const { userPersona, conversationContext, chatHistory = [] } = context;
    
    // Enhanced: Use conversation context if available
    if (conversationContext) {
      // If user mentioned a screen recently, reference it
      if (conversationContext.mentionedScreens && conversationContext.mentionedScreens.length > 0) {
        const lastScreen = conversationContext.mentionedScreens[conversationContext.mentionedScreens.length - 1];
        const screenNames = {
          'EventBooking': 'Event Booking',
          'BarMenu': 'Bar Menu',
          'Wallet': 'Wallet',
          'Explore': 'Explore Services',
        };
        return {
          message: `Based on our conversation, I can help you with ${screenNames[lastScreen] || lastScreen}. Would you like me to take you there or answer questions about it?`,
          metadata: { error: true, fallback: true, source: 'contextual-fallback' },
          suggestions: [`Take me to ${screenNames[lastScreen] || lastScreen}`, 'Tell me more', 'What can I do there?'],
          action: { type: 'navigate', screen: lastScreen },
        };
      }
      
      // Use user preferences if detected
      if (conversationContext.userPreferences && conversationContext.userPreferences.drinkType) {
        const drinkType = conversationContext.userPreferences.drinkType;
        return {
          message: `I remember you like ${drinkType}! Let me show you our ${drinkType} selection.`,
          metadata: { error: true, fallback: true, source: 'preference-fallback' },
          suggestions: [`Show me ${drinkType}`, 'What else do you have?', 'Recommend something'],
          action: { type: 'navigate', screen: 'BarMenu' },
        };
      }
    }

    // Event-related fallbacks (enhanced)
    if (lowerMessage.includes('event') || lowerMessage.includes('booking') || lowerMessage.includes('create') || lowerMessage.includes('schedule')) {
      return {
        message: 'I can help you create an event! Go to Event Booking to get started. You\'ll need to choose an event type, set the date and time, configure pricing, and optionally add a bar package. Weekend events typically perform better!',
        metadata: { error: true, fallback: true, source: 'fallback' },
        suggestions: ['Take me to Event Booking', 'What information do I need?', 'Pricing tips'],
        action: { type: 'navigate', screen: 'EventBooking' },
      };
    }

    // Bar/Menu fallbacks
    if (lowerMessage.includes('menu') || lowerMessage.includes('drink') || lowerMessage.includes('bar') || lowerMessage.includes('order')) {
      return {
        message: 'I\'ll take you to our bar menu! You can browse premium cocktails, wine, beer, spirits, and food. Add items to your cart and checkout securely.',
        metadata: { error: true, fallback: true, source: 'fallback' },
        suggestions: ['Show me the menu', 'What are popular items?', 'Do you have specials?'],
        action: { type: 'navigate', screen: 'BarMenu' },
      };
    }

    // Wallet fallbacks
    if (lowerMessage.includes('wallet') || lowerMessage.includes('payment') || lowerMessage.includes('funds') || lowerMessage.includes('money')) {
      return {
        message: 'Your Wallet manages all payments and transactions. You can add funds, send money, view transaction history, and track your balance. All payments are secure through Stripe.',
        metadata: { error: true, fallback: true, source: 'fallback' },
        suggestions: ['Add funds', 'View transactions', 'How do I send money?'],
        action: { type: 'navigate', screen: 'Wallet' },
      };
    }

    // Service fallbacks
    if (lowerMessage.includes('service') || lowerMessage.includes('vendor') || lowerMessage.includes('book')) {
      return {
        message: 'Explore Services lets you discover vendors and professionals. Browse by category, read reviews, and book services for your events. Find photographers, caterers, DJs, and more.',
        metadata: { error: true, fallback: true, source: 'fallback' },
        suggestions: ['Show me services', 'How do I book?', 'What vendors are available?'],
        action: { type: 'navigate', screen: 'Explore' },
      };
    }

    // Guest-specific fallbacks
    if (userPersona?.id === 'guest') {
      if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('drink')) {
        return {
          message: 'I\'d love to recommend something! Our Merkaba Mule is our signature cocktail ($14), or try our Cosmic Old Fashioned ($16). Check out the bar menu for the full selection!',
          metadata: { error: true, fallback: true, source: 'fallback' },
          suggestions: ['Show me the menu', 'What cocktails do you have?', 'Tell me about specials'],
          action: { type: 'navigate', screen: 'BarMenu' },
        };
      }
    }

    // Default fallback
    return this.getFallbackResponse();
  }

  /**
   * Get generic fallback response
   */
  getFallbackResponse() {
    return {
      message: 'I\'m here to help! I can assist with event creation, bar menu ordering, wallet management, service bookings, and navigating the app. What would you like help with?',
      metadata: { error: true, fallback: true, source: 'fallback' },
      suggestions: [
        'How do I create an event?',
        'Show me the menu',
        'What can you help me with?',
      ],
      action: null,
    };
  }

  /**
   * Build system prompt with context about M1A and user
   */
  buildSystemPrompt(userPersona, currentScreen, userBehavior) {
    const personaInfo = this.getPersonaContext(userPersona);
    const screenInfo = this.getScreenContext(currentScreen);
    
    return `You are M1A, an intelligent AI assistant for Merkaba Entertainment, a premier event venue and entertainment space. You help users navigate the M1A app, book events, order from the bar menu, manage their wallet, and access various services.

${personaInfo}

${screenInfo}

Your capabilities:
- Navigate users to any screen in the app (Event Booking, Bar Menu, Wallet, Explore Services, M1A Dashboard, Auto Poster, Profile, Settings, Help, etc.)
- Provide detailed information about services and features
- Guide users through purchase flows (events, bar orders, service bookings)
- Answer questions about Merkaba Entertainment and M1A features
- Offer sales tips and optimization advice
- Help with customer service requests

Guidelines:
- Be conversational, helpful, and friendly
- Provide detailed, in-depth responses (not just brief answers)
- When users ask about features, explain them thoroughly
- If a user wants to navigate somewhere, acknowledge it and confirm the action
- For purchase/booking flows, provide step-by-step guidance
- Always be specific and actionable
- Use emojis sparingly and appropriately
- Keep responses informative but not overly long (aim for 2-4 sentences for most responses, longer when explaining complex features)

Available screens to navigate to:
- EventBooking: Create and manage events
- BarMenu: Order drinks and food
- Wallet: Manage payments and transactions
- Explore: Browse services and vendors
- ServiceBooking: Book professional services
- M1ADashboard: Analytics and insights
- AutoPoster: Social media automation
- ProfileMain: User profile
- M1ASettings: App settings
- Help: Help center
- Calendar: Event calendar
- Messages: Direct messages

When users want to navigate, respond naturally and confirm you're taking them there.`;
  }

  getPersonaContext(userPersona) {
    if (!userPersona) {
      return 'User Context: General user (client/artist/vendor)';
    }

    const personas = {
      guest: `User Context: Guest persona - This is a customer/patron at Merkaba. Focus on customer service, drink recommendations, menu information, event information, and on-site assistance. Be friendly and helpful with a hospitality focus.`,
      artist: `User Context: Artist persona - This user creates and hosts events. Focus on event creation, ticket sales optimization, bar package revenue, social media promotion, and business growth.`,
      vendor: `User Context: Vendor persona - This user provides services. Focus on service booking, client management, and business tools.`,
      fan: `User Context: Fan persona - This user attends events. Focus on event discovery, ticket booking, and engagement.`,
      professional: `User Context: Professional persona - This user manages corporate events. Focus on corporate event planning, professional services, and business solutions.`,
      creator: `User Context: Creator persona - This user creates content and events. Focus on content creation, event management, and creative tools.`,
    };

    return personas[userPersona.id] || personas.artist;
  }

  getScreenContext(currentScreen) {
    if (!currentScreen) {
      return 'Current Screen: Home';
    }

    const screenContexts = {
      Home: 'Current Screen: Home - Main dashboard with access to all features',
      EventBooking: 'Current Screen: Event Booking - User is creating or managing events',
      BarMenu: 'Current Screen: Bar Menu - User is browsing or ordering drinks/food',
      Wallet: 'Current Screen: Wallet - User is managing payments or transactions',
      Explore: 'Current Screen: Explore Services - User is browsing services and vendors',
      M1ADashboard: 'Current Screen: M1A Dashboard - User is viewing analytics and insights',
      AutoPoster: 'Current Screen: Auto Poster - User is managing social media automation',
      ProfileMain: 'Current Screen: Profile - User is viewing their profile',
    };

    return screenContexts[currentScreen] || `Current Screen: ${currentScreen}`;
  }
}

export default new ChatGPTService();

