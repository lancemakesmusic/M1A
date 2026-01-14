/**
 * Chat Response Cache
 * Pre-loads and caches responses for common questions to provide instant answers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'm1a_chat_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Pre-loaded responses for common questions
// Enhanced with more variations and better responses
const PRELOADED_RESPONSES = {
  // Event-related (enhanced with more variations)
  'how do i create an event': {
    message: 'Creating an event is easy! Here\'s how:\n\n1. Go to Event Booking from the home screen\n2. Choose your event type (concert, party, corporate, etc.)\n3. Set the date, time, and expected guest count\n4. Configure pricing tiers (I recommend multiple tiers for better sales)\n5. Add a bar package to increase revenue per guest\n6. Review and submit\n\nPro tip: Weekend events typically sell 3x more tickets, and early bird pricing can increase sales by 40%!',
    action: { type: 'navigate', screen: 'EventBooking' },
    suggestions: ['Take me to Event Booking', 'What pricing should I use?', 'Tell me about bar packages'],
  },
  'i want to create an event': {
    message: 'Great! I\'ll help you create an event. Let me take you to Event Booking where you can set everything up. You\'ll need to choose an event type, set the date and time, configure pricing, and optionally add a bar package.',
    action: { type: 'navigate', screen: 'EventBooking' },
    suggestions: ['What information do I need?', 'Pricing tips', 'How do bar packages work?'],
  },
  'i need to schedule an event': {
    message: 'Perfect! I can help you schedule an event. Weekend events typically perform 3x better, so consider Fridays or Saturdays. Let me take you to Event Booking to get started!',
    action: { type: 'navigate', screen: 'EventBooking' },
    suggestions: ['What dates work best?', 'How do I set pricing?', 'Tell me about packages'],
  },
  'how to create an event': {
    message: 'Creating an event is easy! Here\'s how:\n\n1. Go to Event Booking from the home screen\n2. Choose your event type (concert, party, corporate, etc.)\n3. Set the date, time, and expected guest count\n4. Configure pricing tiers (I recommend multiple tiers for better sales)\n5. Add a bar package to increase revenue per guest\n6. Review and submit\n\nPro tip: Weekend events typically sell 3x more tickets, and early bird pricing can increase sales by 40%!',
    action: { type: 'navigate', screen: 'EventBooking' },
    suggestions: ['Take me to Event Booking', 'What pricing should I use?', 'Tell me about bar packages'],
  },
  'create event': {
    message: 'I\'ll take you to Event Booking right away! From there you can create your event, set pricing, and add bar packages.',
    action: { type: 'navigate', screen: 'EventBooking' },
    suggestions: ['What information do I need?', 'Pricing tips', 'How do bar packages work?'],
  },
  
  // Bar/Menu-related
  'show me the menu': {
    message: 'I\'ll take you to our bar menu! You can browse drinks, cocktails, spirits, beer, and mixers. Add items to your cart and checkout securely.',
    action: { type: 'navigate', screen: 'BarMenu' },
    suggestions: ['What are popular items?', 'Do you have specials?', 'How do I order?'],
  },
  'bar menu': {
    message: 'Our bar menu features premium cocktails, wine, beer, spirits, and food items. Browse our selection, add items to your cart, and checkout securely. Perfect for ordering drinks during events or adding bar packages to your bookings.',
    action: { type: 'navigate', screen: 'BarMenu' },
    suggestions: ['Show me cocktails', 'What beers do you have?', 'Tell me about specials'],
  },
  'what drinks do you have': {
    message: 'We have a great selection! Premium cocktails like Margaritas and Old Fashioneds, wine, craft beers, spirits (Buffalo Trace, Jameson, Jack Daniel\'s, Tito\'s, Espolon, Jose Cuervo), and mixers. Check out the Bar Menu to see everything!',
    action: { type: 'navigate', screen: 'BarMenu' },
    suggestions: ['Show me the menu', 'What are your specials?', 'Recommend a drink'],
  },
  
  // Wallet/Payment-related
  'how do i add funds': {
    message: 'Adding funds to your wallet is simple:\n\n1. Go to Wallet from the home screen\n2. Tap "Add Funds"\n3. Enter the amount you want to add\n4. Select your payment method\n5. Confirm the transaction\n\nYour funds will be available immediately for purchases!',
    action: { type: 'navigate', screen: 'Wallet' },
    suggestions: ['Take me to Wallet', 'How do I send money?', 'View my balance'],
  },
  'wallet': {
    message: 'Your Wallet manages all payments and transactions. You can add funds, send money to other users, view transaction history, and track your balance. All payments are processed securely through Stripe.',
    action: { type: 'navigate', screen: 'Wallet' },
    suggestions: ['Add funds', 'View transactions', 'How do I send money?'],
  },
  
  // Service-related
  'how do i book a service': {
    message: 'Booking a service is easy:\n\n1. Go to Explore Services to browse vendors and professionals\n2. Select a service provider (photographers, caterers, DJs, etc.)\n3. Read reviews and check pricing\n4. Tap "Book Now" to start the booking process\n5. Fill in your event details and preferences\n6. Confirm your booking\n\nYou\'ll receive a confirmation and the provider will contact you!',
    action: { type: 'navigate', screen: 'ServiceBooking' },
    suggestions: ['Show me services', 'What vendors are available?', 'How do reviews work?'],
  },
  'explore services': {
    message: 'Explore Services lets you discover vendors, service providers, and professionals. Browse by category, read reviews, and book services for your events. Find photographers, caterers, DJs, and more.',
    action: { type: 'navigate', screen: 'Explore' },
    suggestions: ['Show me photographers', 'What caterers do you have?', 'How do I book?'],
  },
  
  // General help
  'what can you help me with': {
    message: 'I\'m M1A, your AI booking agent and sales guide! I can help you with:\n\n• 🎯 Creating and managing events\n• 💰 Optimizing sales and pricing\n• 🧭 Navigating the app\n• 🛒 Completing purchases\n• 📊 Finding features and services\n• ❓ Answering questions\n\nJust tell me what you need, and I\'ll take you there or guide you through it!',
    suggestions: ['How do I create an event?', 'Show me the menu', 'What are sales tips?'],
  },
  'help': {
    message: 'I\'m here to help! I can assist with:\n\n• Event creation and management\n• Bar menu and ordering\n• Wallet and payments\n• Service bookings\n• Navigation throughout the app\n• Sales tips and optimization\n\nWhat would you like help with?',
    suggestions: ['How do I create an event?', 'Show me the menu', 'How do I add funds?'],
  },
  
  // Guest-specific
  'recommend a drink': {
    message: 'I\'d love to recommend something! Here are some great options:\n\n• Merkaba Mule - Our signature cocktail with premium vodka, ginger beer, and lime ($14)\n• Cosmic Old Fashioned - Bourbon, bitters, and orange ($16)\n• Stellar Mojito - White rum, mint, lime, and soda ($13)\n\nWhat type of drink do you prefer? Cocktails, wine, or beer?',
    action: { type: 'navigate', screen: 'BarMenu' },
    suggestions: ['Show me cocktails', 'What wines do you have?', 'I like beer'],
  },
  'what are your specials': {
    message: 'We have great specials today!\n\n• Happy Hour: 20% off all cocktails (5PM - 7PM)\n• Wine Wednesday: Half-price wine by the glass (All Day)\n• Weekend Special: Buy 2 get 1 free on select beers (Fri-Sun)\n\nCheck out the M1A Dashboard to see all current specials and deals!',
    action: { type: 'navigate', screen: 'M1ADashboard' },
    suggestions: ['Show me the menu', 'What\'s on happy hour?', 'Tell me about deals'],
  },
  'about merkaba': {
    message: 'Merkaba is a premier event venue and entertainment space dedicated to creating unforgettable experiences. We host concerts, parties, corporate events, and special occasions.\n\nOur services include:\n• Event Hosting & Management\n• Premium Bar & Catering\n• Live Entertainment\n• Private Event Spaces\n• Corporate Functions\n• Wedding Celebrations\n\nOur team is here to make your experience exceptional!',
    suggestions: ['What events do you host?', 'Tell me about your bar', 'How do I book an event?'],
  },
};

class ChatResponseCache {
  constructor() {
    this.cache = new Map();
    this.loadCache();
  }

  async loadCache() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        // Only keep non-expired entries
        for (const [key, value] of Object.entries(parsed)) {
          if (value.expiry > now) {
            this.cache.set(key, value.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading chat cache:', error);
    }
  }

  async saveCache() {
    try {
      const now = Date.now();
      const toSave = {};
      for (const [key, value] of this.cache.entries()) {
        toSave[key] = {
          data: value,
          expiry: now + CACHE_EXPIRY,
        };
      }
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving chat cache:', error);
    }
  }

  /**
   * Get instant response for common questions
   */
  getInstantResponse(query) {
    if (!query || typeof query !== 'string') {
      return null;
    }

    const normalizedQuery = query.toLowerCase().trim();
    
    // Check pre-loaded responses first (instant)
    for (const [pattern, response] of Object.entries(PRELOADED_RESPONSES)) {
      if (normalizedQuery.includes(pattern)) {
        return {
          ...response,
          metadata: { instant: true, cached: false, source: 'preloaded' },
        };
      }
    }

    // Check cache
    if (this.cache.has(normalizedQuery)) {
      const cached = this.cache.get(normalizedQuery);
      return {
        ...cached,
        metadata: { instant: true, cached: true, source: 'cache' },
      };
    }

    return null;
  }

  /**
   * Cache a response for future use
   */
  cacheResponse(query, response) {
    if (!query || !response) return;
    
    const normalizedQuery = query.toLowerCase().trim();
    this.cache.set(normalizedQuery, response);
    
    // Save to AsyncStorage (async, don't wait)
    this.saveCache().catch(err => console.error('Error saving cache:', err));
  }

  /**
   * Clear expired cache entries
   */
  clearExpired() {
    // This is handled in loadCache, but can be called manually
    this.loadCache();
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    this.cache.clear();
    await AsyncStorage.removeItem(CACHE_KEY);
  }
}

export default new ChatResponseCache();















