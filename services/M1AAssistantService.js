/**
 * M1A Assistant Service
 * Top-tier AI communicator with navigation and purchase assistance
 * Provides context-aware tips, sales guidance, and intelligent routing
 */

import { useM1APersonalization } from '../contexts/M1APersonalizationContext';
import ChatGPTService from './ChatGPTService';

class M1AAssistantService {
  /**
   * Screen mapping for navigation - comprehensive service coverage
   */
  getScreenMap() {
    return {
      // Home & Main
      'home': 'HomeMain',
      'main': 'HomeMain',
      'dashboard': 'HomeMain',
      
      // Event Booking
      'event': 'EventBooking',
      'events': 'EventBooking',
      'booking': 'EventBooking',
      'book event': 'EventBooking',
      'create event': 'EventBooking',
      'schedule': 'EventBooking',
      'schedule event': 'EventBooking',
      'new event': 'EventBooking',
      'plan event': 'EventBooking',
      'event planning': 'EventBooking',
      'ticket': 'EventBooking',
      'tickets': 'EventBooking',
      
      // Bar Menu
      'bar': 'BarMenu',
      'menu': 'BarMenu',
      'drinks': 'BarMenu',
      'drink': 'BarMenu',
      'order': 'BarMenu',
      'order drinks': 'BarMenu',
      'bar menu': 'BarMenu',
      'food': 'BarMenu',
      'cocktail': 'BarMenu',
      'cocktails': 'BarMenu',
      'wine': 'BarMenu',
      'beer': 'BarMenu',
      'spirits': 'BarMenu',
      
      // Wallet & Payments
      'wallet': 'Wallet',
      'money': 'Wallet',
      'funds': 'Wallet',
      'payment': 'Wallet',
      'payments': 'Wallet',
      'transaction': 'Wallet',
      'transactions': 'Wallet',
      'balance': 'Wallet',
      'add funds': 'Wallet',
      'send money': 'Wallet',
      
      // Explore & Services
      'explore': 'Explore',
      'services': 'Explore',
      'service': 'Explore',
      'browse': 'Explore',
      'browse services': 'Explore',
      'find services': 'Explore',
      'vendors': 'Explore',
      'vendor': 'Explore',
      'service providers': 'Explore',
      
      // Service Booking
      'book service': 'ServiceBooking',
      'service booking': 'ServiceBooking',
      'hire': 'ServiceBooking',
      'book vendor': 'ServiceBooking',
      'reserve service': 'ServiceBooking',
      
      // M1A Dashboard
      'm1a dashboard': 'M1ADashboard',
      'm1a': 'M1ADashboard',
      'analytics': 'M1ADashboard',
      'insights': 'M1ADashboard',
      'stats': 'M1ADashboard',
      'statistics': 'M1ADashboard',
      
      // Auto Poster
      'autoposter': 'AutoPoster',
      'auto poster': 'AutoPoster',
      'social media': 'AutoPoster',
      'posting': 'AutoPoster',
      'automation': 'AutoPoster',
      'schedule post': 'AutoPoster',
      'social posts': 'AutoPoster',
      
      // Profile
      'profile': 'ProfileMain',
      'my profile': 'ProfileMain',
      'account': 'ProfileMain',
      'edit profile': 'ProfileEdit',
      'update profile': 'ProfileEdit',
      'change profile': 'ProfileEdit',
      'followers': 'FollowersList',
      'following': 'FollowersList',
      'profile views': 'ProfileViews',
      'views': 'ProfileViews',
      
      // Messages
      'messages': 'Messages',
      'message': 'Messages',
      'chat': 'Messages',
      'conversation': 'Messages',
      'inbox': 'Messages',
      'dm': 'Messages',
      'direct message': 'Messages',
      
      // Settings
      'settings': 'M1ASettings',
      'setting': 'M1ASettings',
      'preferences': 'M1ASettings',
      'configuration': 'M1ASettings',
      'options': 'M1ASettings',
      
      // Help & Support
      'help': 'Help',
      'support': 'Help',
      'faq': 'Help',
      'questions': 'Help',
      'guide': 'Help',
      'tutorial': 'Help',
      'feedback': 'Feedback',
      'send feedback': 'Feedback',
      'report': 'Feedback',
      
      // Calendar
      'calendar': 'Calendar',
      'schedule': 'Calendar',
      'events calendar': 'Calendar',
      'upcoming events': 'Calendar',
      
      // Users
      'users': 'Users',
      'people': 'Users',
      'find users': 'Users',
      'search users': 'Users',
      'explore users': 'Users',
      
      // Create Post
      'create post': 'CreatePost',
      'new post': 'CreatePost',
      'post': 'CreatePost',
      'share': 'CreatePost',
      
      // Notifications
      'notifications': 'Notifications',
      'notification': 'Notifications',
      'alerts': 'Notifications',
      
      // Personalization
      'persona': 'M1APersonalization',
      'personalization': 'M1APersonalization',
      'setup': 'M1APersonalization',
      'onboarding': 'M1APersonalization',
    };
  }

  /**
   * Detect user intent from query - enhanced with service inquiry detection
   */
  detectIntent(query) {
    if (!query || typeof query !== 'string') {
      return { type: 'question', confidence: 0.5, query: '' };
    }
    
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return { type: 'question', confidence: 0.5, query: '' };
    }
    
    // Service inquiry patterns - check first for better accuracy
    const serviceInquiryPatterns = [
      { pattern: /(what|tell me about|info about|information about|details about|learn about|know about)/i, type: 'service-inquiry' },
      { pattern: /(how do i|how can i|how to|how does|how to use|how to access)/i, type: 'service-inquiry' },
      { pattern: /(where is|where can i|where do i|where to find|where to access)/i, type: 'service-inquiry' },
      { pattern: /(show me|take me to|open|go to|navigate to|bring me to)/i, type: 'navigate' },
    ];
    
    for (const { pattern, type } of serviceInquiryPatterns) {
      if (pattern.test(lowerQuery)) {
        // If it's a service inquiry, still try to extract the service
        const screenMap = this.getScreenMap();
        for (const [keyword, screen] of Object.entries(screenMap)) {
          if (lowerQuery.includes(keyword)) {
            return {
              type: type === 'service-inquiry' ? 'service-inquiry' : 'navigate',
              screen,
              confidence: 0.95,
              query: lowerQuery,
            };
          }
        }
        // Service inquiry without specific service - return as inquiry
        if (type === 'service-inquiry') {
          return {
            type: 'service-inquiry',
            confidence: 0.9,
            query: lowerQuery,
          };
        }
      }
    }
    
    // Navigation intent - check for direct navigation keywords
    const screenMap = this.getScreenMap();
    for (const [keyword, screen] of Object.entries(screenMap)) {
      if (lowerQuery.includes(keyword)) {
        return {
          type: 'navigate',
          screen,
          confidence: 0.9,
          query: lowerQuery,
        };
      }
    }

    // Purchase intent
    const purchaseKeywords = ['buy', 'purchase', 'order', 'checkout', 'pay', 'payment', 'cart', 'add to cart'];
    if (purchaseKeywords.some(kw => lowerQuery.includes(kw))) {
      return {
        type: 'purchase',
        confidence: 0.85,
        query: lowerQuery,
      };
    }

    // Booking intent
    const bookingKeywords = ['book', 'reserve', 'schedule', 'create event', 'ticket'];
    if (bookingKeywords.some(kw => lowerQuery.includes(kw))) {
      return {
        type: 'booking',
        screen: 'EventBooking',
        confidence: 0.9,
        query: lowerQuery,
      };
    }

    // Help/Question intent
    const questionKeywords = ['how', 'what', 'where', 'when', 'why', 'help', 'guide', 'tutorial'];
    if (questionKeywords.some(kw => lowerQuery.includes(kw))) {
      return {
        type: 'question',
        confidence: 0.8,
        query: lowerQuery,
      };
    }

    // Sales/Revenue intent
    if (lowerQuery.includes('sell') || lowerQuery.includes('sales') || lowerQuery.includes('revenue') || lowerQuery.includes('profit')) {
      return {
        type: 'sales',
        confidence: 0.85,
        query: lowerQuery,
      };
    }

    return {
      type: 'general',
      confidence: 0.5,
      query: lowerQuery,
    };
  }

  /**
   * Get purchase flow guidance
   */
  getPurchaseFlowGuidance(purchaseType, step = 1) {
    if (!purchaseType || typeof purchaseType !== 'string') {
      throw new Error('Invalid purchase type');
    }
    if (!step || typeof step !== 'number' || step < 1) {
      throw new Error('Invalid step number');
    }
    const flows = {
      event: {
        steps: [
          {
            step: 1,
            title: 'Step 1: Choose Event Type',
            message: 'Select the type of event you want to create. Popular options include concerts, parties, workshops, and corporate events.',
            action: { type: 'navigate', screen: 'EventBooking' },
          },
          {
            step: 2,
            title: 'Step 2: Set Date & Time',
            message: 'Choose your event date and time. Pro tip: Weekend events typically sell 3x more tickets!',
            action: { type: 'focus', target: 'datePicker' },
          },
          {
            step: 3,
            title: 'Step 3: Set Pricing',
            message: 'Set your ticket prices. Consider creating multiple tiers (VIP, General, Early Bird) to maximize revenue.',
            action: { type: 'focus', target: 'pricing' },
          },
          {
            step: 4,
            title: 'Step 4: Add Bar Package (Optional)',
            message: 'Add a bar package to increase revenue per guest. Events with bar packages generate 2x more revenue!',
            action: { type: 'scroll', target: 'barPackage' },
          },
          {
            step: 5,
            title: 'Step 5: Review & Submit',
            message: 'Review all your event details and submit. You\'ll receive a confirmation and agreement within 24 hours.',
            action: { type: 'focus', target: 'submit' },
          },
        ],
      },
      bar: {
        steps: [
          {
            step: 1,
            title: 'Step 1: Browse Menu',
            message: 'Browse our selection of drinks and food. Tap on any item to see details.',
            action: { type: 'navigate', screen: 'BarMenu' },
          },
          {
            step: 2,
            title: 'Step 2: Add to Cart',
            message: 'Tap the + button on any item to add it to your cart. You can adjust quantities in the cart.',
            action: { type: 'show', type: 'cart' },
          },
          {
            step: 3,
            title: 'Step 3: Review Cart',
            message: 'Review your items and quantities. Tap the cart icon to see your order total.',
            action: { type: 'navigate', screen: 'BarMenu' },
          },
          {
            step: 4,
            title: 'Step 4: Checkout',
            message: 'Tap "Checkout" to proceed to secure payment. We use Stripe for safe, encrypted transactions.',
            action: { type: 'focus', target: 'checkout' },
          },
          {
            step: 5,
            title: 'Step 5: Complete Payment',
            message: 'Enter your payment details. Your order will be confirmed immediately after payment.',
            action: { type: 'focus', target: 'payment' },
          },
        ],
      },
      service: {
        steps: [
          {
            step: 1,
            title: 'Step 1: Explore Services',
            message: 'Browse our curated selection of services. Use filters to find exactly what you need.',
            action: { type: 'navigate', screen: 'Explore' },
          },
          {
            step: 2,
            title: 'Step 2: Select Service',
            message: 'Tap on a service to see details, pricing, and reviews. Read reviews to find the best fit.',
            action: { type: 'focus', target: 'serviceDetails' },
          },
          {
            step: 3,
            title: 'Step 3: Book Service',
            message: 'Tap "Book Now" to start the booking process. Fill in your event details and preferences.',
            action: { type: 'focus', target: 'bookButton' },
          },
          {
            step: 4,
            title: 'Step 4: Confirm Details',
            message: 'Review your booking details, date, time, and total cost. Make any adjustments needed.',
            action: { type: 'focus', target: 'confirm' },
          },
          {
            step: 5,
            title: 'Step 5: Complete Booking',
            message: 'Submit your booking request. You\'ll receive a confirmation and the provider will contact you.',
            action: { type: 'focus', target: 'submit' },
          },
        ],
      },
    };

    const flow = flows[purchaseType] || flows.event;
    return flow.steps[step - 1] || flow.steps[0];
  }

  /**
   * Get context-aware tips based on current screen and user behavior
   */
  getContextualTips(currentScreen, userPersona, userBehavior = {}) {
    const tips = {
      Home: [
        {
          id: 'home-1',
          title: '🎯 Quick Start',
          message: 'Tap "Schedule an Event" to create your first event and start selling tickets!',
          priority: 'high',
          action: { type: 'navigate', screen: 'EventBooking' },
        },
        {
          id: 'home-2',
          title: '💰 Boost Sales',
          message: 'Use M1A to promote your events on social media automatically!',
          priority: 'medium',
          action: { type: 'navigate', screen: 'M1ADashboard' },
        },
        {
          id: 'home-3',
          title: '🍹 Bar Service',
          message: 'Add bar packages to your events to increase revenue per guest!',
          priority: 'low',
          action: { type: 'navigate', screen: 'BarMenu' },
        },
      ],
      EventBooking: [
        {
          id: 'booking-1',
          title: '💡 Pro Tip',
          message: 'Weekend events typically sell 3x more tickets. Consider scheduling on Fridays or Saturdays!',
          priority: 'high',
        },
        {
          id: 'booking-2',
          title: '📊 Pricing Strategy',
          message: 'Early bird pricing can increase ticket sales by 40%. Add a tier with 20% discount!',
          priority: 'medium',
        },
        {
          id: 'booking-3',
          title: '🎨 Add Bar Package',
          message: 'Events with bar packages generate 2x more revenue. Add one to boost profits!',
          priority: 'medium',
          action: { type: 'scroll', target: 'barPackage' },
        },
      ],
      BarMenu: [
        {
          id: 'bar-1',
          title: '🍷 Upsell Tip',
          message: 'Premium cocktails have 60% higher profit margins. Highlight them to guests!',
          priority: 'high',
        },
        {
          id: 'bar-2',
          title: '📦 Package Deals',
          message: 'Create bundle packages (e.g., 3 drinks + appetizer) to increase average order value!',
          priority: 'medium',
        },
        {
          id: 'bar-3',
          title: '💳 Quick Checkout',
          message: 'Your cart is ready! Complete your order with secure Stripe payment.',
          priority: 'high',
          condition: (behavior) => behavior.hasItemsInCart,
        },
      ],
      Wallet: [
        {
          id: 'wallet-1',
          title: '💵 Add Funds',
          message: 'Add funds to your wallet for faster checkout on future purchases!',
          priority: 'medium',
        },
        {
          id: 'wallet-2',
          title: '📈 Track Spending',
          message: 'View your transaction history to track event-related expenses and revenue.',
          priority: 'low',
        },
      ],
      Explore: [
        {
          id: 'explore-1',
          title: '🔍 Discover Services',
          message: 'Browse our curated selection of services to enhance your events!',
          priority: 'medium',
        },
        {
          id: 'explore-2',
          title: '⭐ Popular Items',
          message: 'Check out our most popular services - they\'re customer favorites!',
          priority: 'low',
        },
      ],
      M1ADashboard: [
        {
          id: 'm1a-1',
          title: '🚀 Maximize Your Reach',
          message: 'Connect your social media accounts to automatically promote events!',
          priority: 'high',
        },
        {
          id: 'm1a-2',
          title: '📊 Analytics Insight',
          message: 'Track your event performance and optimize based on real data!',
          priority: 'medium',
        },
      ],
      Profile: [
        {
          id: 'profile-1',
          title: '👤 Complete Your Profile',
          message: 'Add a profile photo and bio to build trust with potential clients!',
          priority: 'high',
          action: { type: 'navigate', screen: 'ProfileEdit' },
        },
        {
          id: 'profile-2',
          title: '🔗 Social Links',
          message: 'Connect your social media profiles to showcase your work!',
          priority: 'medium',
        },
      ],
    };

    // Guest-specific tips (customer service focused)
    if (userPersona?.id === 'guest') {
      tips.Home = [
        {
          id: 'guest-1',
          title: '🍹 Drink Recommendations',
          message: 'Tell me what you like, and I\'ll recommend the perfect drinks!',
          priority: 'high',
          action: { type: 'navigate', screen: 'BarMenu' },
        },
        {
          id: 'guest-2',
          title: 'ℹ️ About Merkaba',
          message: 'Learn about our events, services, and what makes Merkaba special!',
          priority: 'medium',
        },
        {
          id: 'guest-3',
          title: '🆘 Need Assistance?',
          message: 'Request on-site service for cleanup, accidents, or any help you need!',
          priority: 'high',
          action: { type: 'show', target: 'service-request' },
        },
      ];
    }

    const screenTips = tips[currentScreen] || [];
    
    // Filter tips based on conditions
    return screenTips.filter(tip => {
      if (tip.condition && !tip.condition(userBehavior)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get sales guidance based on context
   */
  getSalesGuidance(context) {
    const guidance = {
      eventBooking: {
        title: 'Event Booking Sales Tips',
        tips: [
          'Price your tickets competitively - research similar events in your area',
          'Offer early bird discounts to drive early sales',
          'Create multiple ticket tiers (VIP, General, Student) to maximize revenue',
          'Add bar packages to increase revenue per guest',
          'Promote on social media at least 2 weeks before the event',
        ],
        nextSteps: [
          'Complete event details',
          'Set up ticket tiers',
          'Add bar package (optional)',
          'Review and publish',
        ],
      },
      barMenu: {
        title: 'Bar Sales Optimization',
        tips: [
          'Highlight premium items - they have higher profit margins',
          'Create bundle deals to increase average order value',
          'Suggest popular items to first-time customers',
          'Offer happy hour specials during slow periods',
        ],
        nextSteps: [
          'Browse menu items',
          'Add items to cart',
          'Complete checkout',
        ],
      },
      general: {
        title: 'General Sales Tips',
        tips: [
          'Build relationships with customers - personalized service drives repeat business',
          'Use data analytics to understand customer preferences',
          'Offer loyalty programs to encourage repeat purchases',
          'Respond quickly to inquiries - speed builds trust',
        ],
      },
    };

    return guidance[context] || guidance.general;
  }

  /**
   * Get tour steps for a specific screen
   */
  getTourSteps(screenName, userPersona) {
    const tours = {
      Home: [
        {
          step: 1,
          title: 'Welcome to M1A!',
          description: 'This is your home screen. From here you can access all features.',
          target: 'home-header',
        },
        {
          step: 2,
          title: 'Schedule Events',
          description: 'Tap here to create and manage your events.',
          target: 'event-booking-button',
        },
        {
          step: 3,
          title: 'M1A Dashboard',
          description: 'Access your AI-powered booking agent and automation tools.',
          target: 'm1a-button',
        },
        {
          step: 4,
          title: 'Bar Menu',
          description: 'Order drinks and food, or add bar packages to your events.',
          target: 'bar-button',
        },
      ],
      EventBooking: [
        {
          step: 1,
          title: 'Event Details',
          description: 'Fill in your event information. Be specific to attract the right audience.',
          target: 'event-type',
        },
        {
          step: 2,
          title: 'Date & Time',
          description: 'Choose optimal dates - weekends typically perform better.',
          target: 'date-picker',
        },
        {
          step: 3,
          title: 'Pricing',
          description: 'Set competitive prices and create multiple tiers for maximum revenue.',
          target: 'pricing-section',
        },
        {
          step: 4,
          title: 'Bar Packages',
          description: 'Add bar packages to increase revenue per guest.',
          target: 'bar-package',
        },
      ],
      BarMenu: [
        {
          step: 1,
          title: 'Browse Menu',
          description: 'Explore our selection of drinks and food items.',
          target: 'menu-items',
        },
        {
          step: 2,
          title: 'Add to Cart',
          description: 'Tap the + button to add items to your cart.',
          target: 'add-button',
        },
        {
          step: 3,
          title: 'Checkout',
          description: 'Review your order and complete payment securely.',
          target: 'cart-button',
        },
      ],
    };

    return tours[screenName] || [];
  }

  /**
   * Get drink recommendations based on preferences
   */
  getDrinkRecommendations(preferences = {}) {
    // Validate preferences
    if (preferences && typeof preferences !== 'object') {
      preferences = {};
    }
    const drinks = {
      cocktails: [
        { name: 'Merkaba Mule', description: 'Premium vodka, ginger beer, lime - Our signature cocktail!', price: 14 },
        { name: 'Cosmic Old Fashioned', description: 'Bourbon, bitters, orange - Classic with a twist', price: 16 },
        { name: 'Stellar Mojito', description: 'White rum, mint, lime, soda - Refreshing and light', price: 13 },
      ],
      wine: [
        { name: 'House Red', description: 'Smooth and full-bodied - Perfect for any occasion', price: 10 },
        { name: 'House White', description: 'Crisp and refreshing - Great with appetizers', price: 10 },
        { name: 'Champagne', description: 'Celebrate in style with our premium selection', price: 18 },
      ],
      beer: [
        { name: 'Craft IPA', description: 'Hoppy and bold - For beer enthusiasts', price: 8 },
        { name: 'Light Lager', description: 'Smooth and easy-drinking - Always popular', price: 7 },
        { name: 'Stout', description: 'Rich and creamy - Perfect for evening', price: 9 },
      ],
      nonAlcoholic: [
        { name: 'Fresh Lemonade', description: 'Made fresh daily with real lemons', price: 5 },
        { name: 'Craft Soda', description: 'Artisan flavors - Try our seasonal selection', price: 6 },
        { name: 'Premium Coffee', description: 'Locally roasted - Hot or iced', price: 6 },
      ],
    };

    if (preferences.type) {
      return drinks[preferences.type] || drinks.cocktails;
    }

    // Default recommendations
    return [
      ...drinks.cocktails.slice(0, 2),
      ...drinks.wine.slice(0, 1),
      ...drinks.beer.slice(0, 1),
    ];
  }

  /**
   * Get Merkaba information
   */
  getMerkabaInfo() {
    return {
      about: 'Merkaba is a premier event venue and entertainment space dedicated to creating unforgettable experiences. We host concerts, parties, corporate events, and special occasions.',
      services: [
        'Event Hosting & Management',
        'Premium Bar & Catering',
        'Live Entertainment',
        'Private Event Spaces',
        'Corporate Functions',
        'Wedding Celebrations',
      ],
      features: [
        'State-of-the-art sound and lighting',
        'Multiple event spaces',
        'Professional event coordination',
        'Premium bar service',
        'Custom catering options',
        'On-site support staff',
      ],
      contact: 'Our team is here to make your experience exceptional. Use the service request button for immediate assistance!',
    };
  }

  /**
   * Generate intelligent AI response with navigation and purchase assistance
   * Enhanced with better fallback, context awareness, and proactive suggestions
   * Checks cache first for instant responses, falls back gracefully when API unavailable
   */
  async generateAIResponse(query, context = {}) {
    if (!query || typeof query !== 'string') {
      return {
        type: 'question',
        response: {
          title: 'I need more information',
          message: 'Could you please rephrase your question? I\'m here to help!',
        },
        metadata: { instant: false },
      };
    }
    
    const intent = this.detectIntent(query);
    const lowerQuery = query.toLowerCase();
    const userPersona = context?.userPersona;
    const chatHistory = context.chatHistory || [];
    
    // Enhanced: Check for conversation context (remember previous messages)
    const conversationContext = this.extractConversationContext(query, chatHistory);
    
    // For navigation and simple actions, use rule-based (fast and reliable)
    if (intent.type === 'navigate' && intent.screen) {
      return {
        type: 'navigate',
        intent,
        response: {
          title: `Taking you to ${this.getScreenName(intent.screen)}`,
          message: `I'll take you there right away! You're being navigated to ${this.getScreenName(intent.screen)}.`,
          action: { type: 'navigate', screen: intent.screen },
        },
        suggestions: this.getEnhancedContextualSuggestions(intent.screen, conversationContext),
        metadata: { instant: true, source: 'rule-based' },
      };
    }
    
    // Enhanced: Try ChatGPT with better error handling and fallback
    try {
      const aiResponse = await ChatGPTService.generateChatResponse(query, {
        chatHistory,
        userPersona,
        currentScreen: context.screen || 'Home',
        userBehavior: context.userBehavior || {},
        conversationContext, // Pass conversation context
      });
      
      // Enhanced: Merge AI response with navigation capabilities and context
      const response = {
        type: intent.type || 'general',
        intent,
        response: {
          title: aiResponse.metadata?.title || 'M1A Assistant',
          message: aiResponse.message,
          action: aiResponse.action || (intent.screen ? { type: 'navigate', screen: intent.screen } : null),
        },
        suggestions: aiResponse.suggestions || this.getEnhancedContextualSuggestions(context.screen, conversationContext),
        metadata: aiResponse.metadata || { instant: false },
        conversationContext, // Include context in response
      };
      
      // If AI detected navigation, ensure it's included
      if (aiResponse.action && aiResponse.action.type === 'navigate') {
        response.response.action = aiResponse.action;
      }
      
      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Enhanced: Better fallback with conversation context
      const fallback = this.generateEnhancedFallbackResponse(query, intent, lowerQuery, context, conversationContext);
      return {
        ...fallback,
        metadata: { instant: false, fallback: true, error: error.message, source: 'enhanced-fallback' },
      };
    }
  }
  
  /**
   * Extract conversation context from chat history
   * Enhanced: Better context extraction for more natural conversations
   */
  extractConversationContext(currentQuery, chatHistory) {
    if (!chatHistory || chatHistory.length === 0) {
      return null;
    }
    
    // Get last 5 messages for context
    const recentMessages = chatHistory.slice(-5);
    const context = {
      recentTopics: [],
      mentionedScreens: [],
      userPreferences: {},
      ongoingTasks: [],
    };
    
    // Extract topics and screens mentioned
    recentMessages.forEach(msg => {
      const message = (msg.message || '').toLowerCase();
      
      // Detect mentioned screens
      const screenMap = this.getScreenMap();
      for (const [keyword, screen] of Object.entries(screenMap)) {
        if (message.includes(keyword)) {
          if (!context.mentionedScreens.includes(screen)) {
            context.mentionedScreens.push(screen);
          }
        }
      }
      
      // Detect preferences (e.g., "I like cocktails", "I prefer weekends")
      if (message.includes('like') || message.includes('prefer') || message.includes('favorite')) {
        // Extract preference
        if (message.includes('cocktail')) context.userPreferences.drinkType = 'cocktails';
        if (message.includes('wine')) context.userPreferences.drinkType = 'wine';
        if (message.includes('beer')) context.userPreferences.drinkType = 'beer';
        if (message.includes('weekend')) context.userPreferences.eventTiming = 'weekend';
        if (message.includes('weekday')) context.userPreferences.eventTiming = 'weekday';
      }
      
      // Detect ongoing tasks
      if (message.includes('creating') || message.includes('booking') || message.includes('planning')) {
        if (message.includes('event')) context.ongoingTasks.push('event-creation');
        if (message.includes('service')) context.ongoingTasks.push('service-booking');
      }
    });
    
    return context;
  }
  
  /**
   * Enhanced fallback response with conversation context
   */
  generateEnhancedFallbackResponse(query, intent, lowerQuery, context, conversationContext) {
    // Use conversation context if available
    if (conversationContext) {
      // If user mentioned a screen recently, reference it
      if (conversationContext.mentionedScreens.length > 0) {
        const lastScreen = conversationContext.mentionedScreens[conversationContext.mentionedScreens.length - 1];
        return {
          type: 'contextual',
          intent,
          response: {
            title: 'Continuing our conversation',
            message: `Based on our conversation, I can help you with ${this.getScreenName(lastScreen)}. Would you like me to take you there or answer questions about it?`,
            action: { type: 'navigate', screen: lastScreen },
          },
          suggestions: this.getEnhancedContextualSuggestions(lastScreen, conversationContext),
        };
      }
      
      // Use user preferences if detected
      if (conversationContext.userPreferences.drinkType) {
        const drinkType = conversationContext.userPreferences.drinkType;
        return {
          type: 'preference-based',
          intent,
          response: {
            title: 'Based on your preferences',
            message: `I remember you like ${drinkType}! Let me show you our ${drinkType} selection.`,
            action: { type: 'navigate', screen: 'BarMenu' },
          },
          suggestions: [`Show me ${drinkType}`, 'What else do you have?', 'Recommend something'],
        };
      }
    }
    
    // Fall back to original fallback logic
    return this.generateFallbackResponse(query, intent, lowerQuery, context);
  }
  
  /**
   * Enhanced contextual suggestions with conversation awareness
   */
  getEnhancedContextualSuggestions(screen, conversationContext) {
    const baseSuggestions = this.getContextualSuggestions(screen);
    
    // Add context-aware suggestions
    if (conversationContext) {
      if (conversationContext.ongoingTasks.includes('event-creation')) {
        return [
          'Continue creating event',
          'What pricing should I use?',
          'Tell me about bar packages',
          ...baseSuggestions,
        ];
      }
      
      if (conversationContext.userPreferences.drinkType) {
        return [
          `Show me ${conversationContext.userPreferences.drinkType}`,
          'What else do you recommend?',
          ...baseSuggestions,
        ];
      }
    }
    
    return baseSuggestions;
  }
  
  /**
   * Fallback response generator (original rule-based logic)
   */
  generateFallbackResponse(query, intent, lowerQuery, context) {
    const userPersona = context?.userPersona;
    
    // Guest persona - Customer service mode
    if (userPersona?.id === 'guest') {
      return this.generateGuestResponse(query, intent, lowerQuery, context);
    }
    
    // Handle service inquiry intent
    if (intent.type === 'service-inquiry') {
      // Try to extract service from query
      const screenMap = this.getScreenMap();
      let detectedScreen = null;
      for (const [keyword, screen] of Object.entries(screenMap)) {
        if (lowerQuery.includes(keyword)) {
          detectedScreen = screen;
          break;
        }
      }
      
      if (detectedScreen) {
        return {
          type: 'service-inquiry',
          intent,
          response: {
            title: `About ${this.getScreenName(detectedScreen)}`,
            message: this.getServiceDescription(detectedScreen, lowerQuery),
            action: { type: 'navigate', screen: detectedScreen },
          },
          suggestions: [
            `Take me to ${this.getScreenName(detectedScreen)}`,
            'Tell me more',
            'How do I use this?',
          ],
        };
      }
      
      // General service inquiry
      return {
        type: 'service-inquiry',
        intent,
        response: {
          title: 'Service Information',
          message: this.getGeneralServiceInfo(lowerQuery),
        },
        suggestions: [
          'Tell me about events',
          'What is the bar menu?',
          'How do I book a service?',
        ],
      };
    }

    // Handle navigation intent - terminate at destination
    if (intent.type === 'navigate' && intent.screen) {
      return {
        type: 'navigate',
        intent,
        response: {
          title: `Taking you to ${this.getScreenName(intent.screen)}`,
          message: `I'll take you there right away! You're being navigated to ${this.getScreenName(intent.screen)}.`,
          action: { type: 'navigate', screen: intent.screen },
        },
        suggestions: this.getContextualSuggestions(intent.screen),
      };
    }

    // Handle purchase intent - provide step-by-step guidance
    if (intent.type === 'purchase') {
      let purchaseType = 'bar';
      if (lowerQuery.includes('event') || lowerQuery.includes('booking')) {
        purchaseType = 'event';
      } else if (lowerQuery.includes('service')) {
        purchaseType = 'service';
      }

      const flowStep = this.getPurchaseFlowGuidance(purchaseType, 1);
      return {
        type: 'purchase',
        intent,
        purchaseType,
        currentStep: 1,
        response: {
          title: 'Purchase Assistance',
          message: `I'll guide you through the ${purchaseType} purchase process step by step!\n\n${flowStep.message}\n\nWould you like me to take you to the first step?`,
          action: flowStep.action,
        },
        suggestions: [
          'Take me to step 1',
          'Show me all steps',
          'What do I need?',
        ],
      };
    }

    // Handle booking intent
    if (intent.type === 'booking') {
      const flowStep = this.getPurchaseFlowGuidance('event', 1);
      return {
        type: 'booking',
        intent,
        response: {
          title: 'Event Booking Guide',
          message: `I'll help you create an event! Here's how it works:\n\n${flowStep.message}\n\nLet me take you to the booking screen to get started!`,
          action: { type: 'navigate', screen: 'EventBooking' },
        },
        suggestions: [
          'Start booking',
          'What information do I need?',
          'Pricing tips',
        ],
      };
    }

    // Sales-related queries
    if (intent.type === 'sales' || lowerQuery.includes('sell') || lowerQuery.includes('sales') || lowerQuery.includes('revenue')) {
      return {
        type: 'sales',
        intent,
        response: this.getSalesGuidance(context.screen || 'general'),
        suggestions: [
          'How to price my events?',
          'What packages should I offer?',
          'How to increase ticket sales?',
        ],
      };
    }

    // Event-related queries
    if (lowerQuery.includes('event') || lowerQuery.includes('ticket')) {
      return {
        type: 'event',
        intent,
        response: {
          title: 'Event Booking Help',
          message: 'I can help you create and manage events! Here are some tips:\n\n' +
            '• Choose a catchy event name and description\n' +
            '• Set competitive pricing with multiple tiers\n' +
            '• Add bar packages to increase revenue\n' +
            '• Promote on social media 2 weeks before\n' +
            '• Use M1A dashboard for automated promotion\n\n' +
            'Would you like me to take you to the booking screen?',
          action: { type: 'navigate', screen: 'EventBooking' },
          tips: [
            'Weekend events sell 3x more tickets',
            'Early bird pricing increases sales by 40%',
            'Events with bar packages generate 2x revenue',
          ],
        },
        suggestions: [
          'Take me to booking',
          'How do I create an event?',
          'What pricing should I use?',
        ],
      };
    }

    // Bar-related queries
    if (lowerQuery.includes('bar') || lowerQuery.includes('drink') || lowerQuery.includes('menu')) {
      return {
        type: 'bar',
        intent,
        response: {
          title: 'Bar Menu Help',
          message: 'Our bar offers premium drinks and food! Here\'s how to order:\n\n' +
            '• Browse our menu items\n' +
            '• Add items to your cart\n' +
            '• Review and checkout securely\n' +
            '• Payment via Stripe (safe & encrypted)\n\n' +
            'Would you like me to take you to the menu?',
          action: { type: 'navigate', screen: 'BarMenu' },
        },
        suggestions: [
          'Show me the menu',
          'What are your popular items?',
          'How do I checkout?',
        ],
      };
    }

    // Question/Help queries
    if (intent.type === 'question') {
      if (lowerQuery.includes('how') && (lowerQuery.includes('create') || lowerQuery.includes('make'))) {
        return {
          type: 'help',
          intent,
          response: {
            title: 'How to Create an Event',
            message: 'Creating an event is easy! Here\'s the process:\n\n' +
              '1. Go to Event Booking\n' +
              '2. Choose your event type\n' +
              '3. Set date, time, and guest count\n' +
              '4. Set pricing tiers\n' +
              '5. Add bar package (optional)\n' +
              '6. Review and submit\n\n' +
              'I can take you there now!',
            action: { type: 'navigate', screen: 'EventBooking' },
          },
          suggestions: [
            'Take me to booking',
            'What information do I need?',
            'Pricing tips',
          ],
        };
      }

      if (lowerQuery.includes('where') || lowerQuery.includes('find')) {
        return {
          type: 'navigation',
          intent,
          response: {
            title: 'I can help you find anything!',
            message: 'Tell me what you\'re looking for and I\'ll take you there:\n\n' +
              '• Events → Event Booking\n' +
              '• Bar/Menu → Bar Menu\n' +
              '• Services → Explore\n' +
              '• Wallet → Wallet\n' +
              '• Settings → Settings\n' +
              '• Profile → Profile',
          },
          suggestions: [
            'Take me to events',
            'Show me the menu',
            'Where is my wallet?',
          ],
        };
      }
    }

    // General help
    return {
      type: 'general',
      intent,
      response: {
        title: 'How can I help?',
        message: 'I\'m M1A, your AI booking agent and sales guide! I can help you with:\n\n' +
          '• 🎯 Creating and managing events\n' +
          '• 💰 Optimizing sales and pricing\n' +
          '• 🧭 Navigating the app\n' +
          '• 🛒 Completing purchases\n' +
          '• 📊 Finding features and services\n' +
          '• ❓ Answering questions\n\n' +
          'Just tell me what you need, and I\'ll take you there or guide you through it!',
      },
      suggestions: [
        'How do I create an event?',
        'Take me to the menu',
        'What are sales tips?',
      ],
    };
  }

  /**
   * Get screen display name
   */
  getScreenName(screen) {
    const names = {
      'HomeMain': 'Home',
      'EventBooking': 'Event Booking',
      'BarMenu': 'Bar Menu',
      'Wallet': 'Wallet',
      'Explore': 'Explore Services',
      'M1ADashboard': 'M1A Dashboard',
      'AutoPoster': 'Auto Poster',
      'ProfileMain': 'Profile',
      'ProfileEdit': 'Edit Profile',
      'M1ASettings': 'Settings',
      'Help': 'Help Center',
      'Messages': 'Messages',
      'ServiceBooking': 'Service Booking',
      'Calendar': 'Calendar',
      'Users': 'Users',
      'CreatePost': 'Create Post',
      'Notifications': 'Notifications',
      'Feedback': 'Feedback',
      'FollowersList': 'Followers',
      'ProfileViews': 'Profile Views',
    };
    return names[screen] || screen;
  }

  /**
   * Get service description for service inquiries
   */
  getServiceDescription(screen, query = '') {
    const descriptions = {
      'EventBooking': 'Event Booking allows you to create and manage events at Merkaba. You can schedule concerts, parties, corporate events, and more. Set dates, pricing tiers, add bar packages, and manage all your event details in one place.',
      'BarMenu': 'Our Bar Menu features premium cocktails, wine, beer, spirits, and food items. Browse our selection, add items to your cart, and checkout securely. Perfect for ordering drinks during events or adding bar packages to your bookings.',
      'Wallet': 'Your Wallet manages all payments and transactions. Add funds, send money, view transaction history, and track your balance. All payments are processed securely through Stripe.',
      'Explore': 'Explore Services lets you discover vendors, service providers, and professionals. Browse by category, read reviews, and book services for your events. Find photographers, caterers, DJs, and more.',
      'ServiceBooking': 'Service Booking allows you to book professional services for your events. Select a service provider, choose dates, and complete your booking. Perfect for finding vendors and suppliers.',
      'M1ADashboard': 'M1A Dashboard provides analytics, insights, and automation tools. Track event performance, manage social media posting, and optimize your business with AI-powered recommendations.',
      'AutoPoster': 'Auto Poster is an AI-powered social media management tool. Schedule posts, automate content creation, and manage multiple platforms from one place. Save time and increase engagement.',
      'ProfileMain': 'Your Profile displays your information, posts, followers, and activity. Customize your profile to showcase your work and connect with others in the M1A community.',
      'ProfileEdit': 'Edit Profile lets you update your information, photos, bio, and social links. Keep your profile current to build trust and attract clients.',
      'Messages': 'Messages is your communication hub. Chat with clients, vendors, and other users. Send messages, share media, and stay connected.',
      'Calendar': 'Calendar shows all your events, bookings, and scheduled activities. View your schedule, manage dates, and never miss an important event.',
      'M1ASettings': 'Settings lets you customize your app experience. Manage notifications, appearance, language, and account preferences.',
      'Help': 'Help Center provides guides, tutorials, and support. Find answers to common questions and learn how to use M1A features.',
      'Feedback': 'Send Feedback allows you to share your thoughts and suggestions. Help us improve M1A by providing valuable feedback.',
      'Users': 'Users lets you explore and connect with other M1A members. Find professionals, vendors, and collaborators for your events.',
      'CreatePost': 'Create Post lets you share content with the M1A community. Post photos, videos, audio, and updates to engage with your audience.',
      'Notifications': 'Notifications keeps you updated on messages, events, bookings, and important activities. Never miss important updates.',
    };
    return descriptions[screen] || `The ${this.getScreenName(screen)} feature helps you manage and access ${this.getScreenName(screen).toLowerCase()} functionality.`;
  }

  /**
   * Get general service information for inquiries
   */
  getGeneralServiceInfo(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('event') || lowerQuery.includes('booking')) {
      return 'Event Booking lets you create and manage events at Merkaba. You can schedule concerts, parties, corporate events, and more. Set dates, pricing, add bar packages, and manage all details. Would you like me to take you there?';
    }
    
    if (lowerQuery.includes('bar') || lowerQuery.includes('menu') || lowerQuery.includes('drink')) {
      return 'Our Bar Menu features premium cocktails, wine, beer, spirits, and food. Browse, add to cart, and checkout securely. Perfect for ordering during events or adding bar packages. Would you like to see the menu?';
    }
    
    if (lowerQuery.includes('wallet') || lowerQuery.includes('payment') || lowerQuery.includes('money')) {
      return 'Your Wallet manages all payments and transactions. Add funds, send money, view history, and track your balance. All payments are secure through Stripe. Would you like to access your wallet?';
    }
    
    if (lowerQuery.includes('service') || lowerQuery.includes('vendor') || lowerQuery.includes('provider')) {
      return 'Explore Services lets you discover vendors and professionals. Browse by category, read reviews, and book services for your events. Find photographers, caterers, DJs, and more. Would you like to explore?';
    }
    
    return 'M1A offers many services to help you manage events, connect with vendors, and grow your business. I can help you navigate to:\n\n' +
      '• Event Booking - Create and manage events\n' +
      '• Bar Menu - Order drinks and food\n' +
      '• Explore Services - Find vendors and professionals\n' +
      '• Wallet - Manage payments\n' +
      '• M1A Dashboard - Analytics and automation\n' +
      '• Auto Poster - Social media management\n\n' +
      'What would you like to learn about or access?';
  }

  /**
   * Get contextual suggestions based on screen
   */
  getContextualSuggestions(screen) {
    const suggestions = {
      'EventBooking': [
        'How do I set pricing?',
        'What information do I need?',
        'Show me pricing tips',
      ],
      'BarMenu': [
        'What are popular items?',
        'How do I checkout?',
        'Do you have packages?',
      ],
      'Explore': [
        'How do I book a service?',
        'What services are available?',
        'Show me popular services',
      ],
      'Wallet': [
        'How do I add funds?',
        'View transaction history',
        'How do I send money?',
      ],
    };
    return suggestions[screen] || [
      'How can I help?',
      'Show me features',
      'Navigation help',
    ];
  }

  /**
   * Get quick action suggestions
   */
  getQuickActions(currentScreen) {
    const actions = {
      Home: [
        { label: 'Create Event', action: 'navigate', screen: 'EventBooking' },
        { label: 'View Dashboard', action: 'navigate', screen: 'M1ADashboard' },
        { label: 'Browse Services', action: 'navigate', screen: 'Explore' },
      ],
      EventBooking: [
        { label: 'Add Bar Package', action: 'scroll', target: 'barPackage' },
        { label: 'View Pricing Tips', action: 'show', type: 'sales-tips' },
        { label: 'Save Draft', action: 'save' },
      ],
      BarMenu: [
        { label: 'View Cart', action: 'show', type: 'cart' },
        { label: 'Popular Items', action: 'filter', filter: 'popular' },
        { label: 'Checkout', action: 'navigate', screen: 'checkout' },
      ],
    };

    return actions[currentScreen] || [];
  }

  /**
   * Generate customer service response for Guest persona
   */
  generateGuestResponse(query, intent, lowerQuery, context) {
    // Drink recommendations
    if (lowerQuery.includes('drink') || lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || 
        lowerQuery.includes('cocktail') || lowerQuery.includes('wine') || lowerQuery.includes('beer')) {
      const recommendations = this.getDrinkRecommendations();
      const drinkList = recommendations.slice(0, 3).map(d => 
        `• ${d.name} - ${d.description} ($${d.price})`
      ).join('\n');
      
      return {
        type: 'drink-recommendation',
        intent,
        response: {
          title: '🍹 Drink Recommendations',
          message: `Here are some great options from our menu:\n\n${drinkList}\n\nWould you like to see the full menu or order something specific?`,
          action: { type: 'navigate', screen: 'BarMenu' },
        },
        suggestions: [
          'Show me the full menu',
          'I like cocktails',
          'What wines do you have?',
        ],
      };
    }

    // About Merkaba
    if (lowerQuery.includes('merkaba') || lowerQuery.includes('about') || lowerQuery.includes('what do you do') ||
        lowerQuery.includes('services') || lowerQuery.includes('what is this place')) {
      const info = this.getMerkabaInfo();
      const servicesList = info.services.map(s => `• ${s}`).join('\n');
      
      return {
        type: 'merkaba-info',
        intent,
        response: {
          title: 'About Merkaba',
          message: `${info.about}\n\nOur Services:\n${servicesList}\n\n${info.contact}`,
        },
        suggestions: [
          'What events do you host?',
          'Tell me about your bar',
          'How do I book an event?',
        ],
      };
    }

    // Service request
    if (lowerQuery.includes('service') || lowerQuery.includes('help') || lowerQuery.includes('assistance') ||
        lowerQuery.includes('cleanup') || lowerQuery.includes('accident') || lowerQuery.includes('spill') ||
        lowerQuery.includes('request')) {
      return {
        type: 'service-request',
        intent,
        response: {
          title: 'On-Site Service Request',
          message: 'I can help you request on-site assistance! Common requests include:\n\n' +
            '• Cleanup service\n' +
            '• Accident assistance\n' +
            '• General help\n' +
            '• Special requests\n\n' +
            'Tap the "Request Service" button below to submit your request, and our team will assist you right away!',
          action: { type: 'show', target: 'service-request' },
        },
        suggestions: [
          'Request cleanup',
          'I had an accident',
          'Need general help',
        ],
      };
    }

    // Event information
    if (lowerQuery.includes('event') || lowerQuery.includes('what\'s happening') || lowerQuery.includes('tonight')) {
      return {
        type: 'event-info',
        intent,
        response: {
          title: 'Event Information',
          message: 'We host amazing events here at Merkaba! From live concerts to private parties, there\'s always something exciting happening.\n\n' +
            'Check out our events calendar or ask me about upcoming shows. I can also help you book tickets or reserve space for your own event!',
          action: { type: 'navigate', screen: 'Explore' },
        },
        suggestions: [
          'What events are coming up?',
          'How do I book tickets?',
          'Tell me about tonight\'s event',
        ],
      };
    }

    // Menu/Order
    if (lowerQuery.includes('menu') || lowerQuery.includes('order') || lowerQuery.includes('buy') || 
        lowerQuery.includes('purchase') || lowerQuery.includes('bar')) {
      return {
        type: 'menu',
        intent,
        response: {
          title: 'Bar Menu',
          message: 'I\'d be happy to help you with our menu! We have:\n\n' +
            '• Premium cocktails\n' +
            '• Wine selection\n' +
            '• Craft beers\n' +
            '• Non-alcoholic options\n' +
            '• Food items\n\n' +
            'Would you like me to recommend something, or would you prefer to browse the full menu?',
          action: { type: 'navigate', screen: 'BarMenu' },
        },
        suggestions: [
          'Recommend a drink',
          'Show me the menu',
          'What\'s popular?',
        ],
      };
    }

    // General customer service greeting
    return {
      type: 'customer-service',
      intent,
      response: {
        title: 'Welcome to Merkaba!',
        message: 'Hi! I\'m M1A, your personal customer service assistant. I\'m here to help you have an amazing experience!\n\n' +
          'I can help you with:\n' +
          '• 🍹 Drink recommendations\n' +
          '• 📋 Menu and ordering\n' +
          '• ℹ️ Information about Merkaba\n' +
          '• 🆘 On-site service requests\n' +
          '• 🎉 Event information\n\n' +
          'What can I help you with today?',
      },
      suggestions: [
        'Recommend a drink',
        'Tell me about Merkaba',
        'I need assistance',
      ],
    };
  }
}

export default new M1AAssistantService();
