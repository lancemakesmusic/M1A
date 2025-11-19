/**
 * M1A Assistant Service
 * Top-tier AI communicator with navigation and purchase assistance
 * Provides context-aware tips, sales guidance, and intelligent routing
 */

import { useM1APersonalization } from '../contexts/M1APersonalizationContext';

class M1AAssistantService {
  /**
   * Screen mapping for navigation
   */
  getScreenMap() {
    return {
      // Navigation keywords to screen names
      'home': 'HomeMain',
      'event': 'EventBooking',
      'booking': 'EventBooking',
      'book event': 'EventBooking',
      'create event': 'EventBooking',
      'schedule': 'EventBooking',
      'bar': 'BarMenu',
      'menu': 'BarMenu',
      'drinks': 'BarMenu',
      'order': 'BarMenu',
      'wallet': 'Wallet',
      'money': 'Wallet',
      'funds': 'Wallet',
      'explore': 'Explore',
      'services': 'Explore',
      'browse': 'Explore',
      'dashboard': 'M1ADashboard',
      'm1a': 'M1ADashboard',
      'autoposter': 'AutoPoster',
      'profile': 'ProfileMain',
      'settings': 'M1ASettings',
      'help': 'Help',
      'messages': 'Messages',
      'chat': 'Messages',
    };
  }

  /**
   * Detect user intent from query
   */
  detectIntent(query) {
    if (!query || typeof query !== 'string') {
      return { type: 'question', confidence: 0.5, query: '' };
    }
    
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) {
      return { type: 'question', confidence: 0.5, query: '' };
    }
    
    // Navigation intent
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
   */
  generateAIResponse(query, context = {}) {
    if (!query || typeof query !== 'string') {
      return {
        type: 'question',
        response: {
          title: 'I need more information',
          message: 'Could you please rephrase your question? I\'m here to help!',
        },
      };
    }
    
    const intent = this.detectIntent(query);
    const lowerQuery = query.toLowerCase();
    const userPersona = context?.userPersona;
    
    // Guest persona - Customer service mode
    if (userPersona?.id === 'guest') {
      return this.generateGuestResponse(query, intent, lowerQuery, context);
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
      'M1ASettings': 'Settings',
      'Help': 'Help Center',
      'Messages': 'Messages',
      'ServiceBooking': 'Service Booking',
    };
    return names[screen] || screen;
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
