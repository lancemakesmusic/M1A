// utils/personaFilters.js
// Persona-based filtering and personalization utilities

/**
 * Get persona-specific service categories that should be prioritized
 */
export const getPersonaServiceCategories = (personaId) => {
  const personaCategories = {
    guest: ['Bar', 'Events', 'Services'], // Guests see everything
    promoter: ['Events', 'Services'], // Promoters focus on events and services
    coordinator: ['Services', 'Events'], // Coordinators need services and events
    wedding_planner: ['Services', 'Events'], // Wedding planners need vendors and events
    venue_owner: ['Services', 'Events'], // Venue owners see services and events
    performer: ['Services', 'Events'], // Performers see services and events
    vendor: ['Services', 'Events'], // Vendors see services and events
  };
  
  return personaCategories[personaId] || ['Services', 'Events'];
};

/**
 * Get persona-specific recommended features
 */
export const getPersonaRecommendedFeatures = (personaId) => {
  const recommendations = {
    guest: [
      { id: 'bar-menu', title: 'Bar Menu', description: 'Browse drinks and order', icon: 'wine', screen: 'BarMenu' },
      { id: 'events', title: 'Upcoming Events', description: 'See what\'s happening', icon: 'calendar', screen: 'Explore' },
      { id: 'messages', title: 'Contact Support', description: 'Get help anytime', icon: 'chatbubbles', screen: 'Messages' },
    ],
    promoter: [
      { id: 'event-booking', title: 'Create Event', description: 'Schedule your next event', icon: 'calendar', screen: 'EventBooking' },
      { id: 'auto-poster', title: 'Auto Poster', description: 'AI social media management', icon: 'rocket', screen: 'AutoPoster' },
      { id: 'm1a-dashboard', title: 'Analytics', description: 'Track event performance', icon: 'analytics', screen: 'M1ADashboard' },
    ],
    coordinator: [
      { id: 'event-booking', title: 'Plan Event', description: 'Coordinate your event', icon: 'calendar', screen: 'EventBooking' },
      { id: 'explore', title: 'Find Vendors', description: 'Discover service providers', icon: 'search', screen: 'Explore' },
      { id: 'messages', title: 'Communicate', description: 'Contact vendors and clients', icon: 'chatbubbles', screen: 'Messages' },
    ],
    wedding_planner: [
      { id: 'event-booking', title: 'Plan Wedding', description: 'Create wedding timeline', icon: 'heart', screen: 'EventBooking' },
      { id: 'explore', title: 'Vendor Portfolio', description: 'Find trusted vendors', icon: 'search', screen: 'Explore' },
      { id: 'messages', title: 'Client Portal', description: 'Communicate with couples', icon: 'chatbubbles', screen: 'Messages' },
    ],
    venue_owner: [
      { id: 'event-booking', title: 'Manage Bookings', description: 'View venue calendar', icon: 'calendar', screen: 'EventBooking' },
      { id: 'm1a-dashboard', title: 'Revenue Analytics', description: 'Track venue performance', icon: 'trending-up', screen: 'M1ADashboard' },
      { id: 'messages', title: 'Client Portal', description: 'Communicate with clients', icon: 'chatbubbles', screen: 'Messages' },
    ],
    performer: [
      { id: 'event-booking', title: 'Manage Bookings', description: 'Track performances', icon: 'musical-notes', screen: 'EventBooking' },
      { id: 'profile', title: 'Portfolio', description: 'Showcase your work', icon: 'camera', screen: 'ProfileTab' },
      { id: 'wallet', title: 'Earnings', description: 'Track performance income', icon: 'wallet', screen: 'Wallet' },
    ],
    vendor: [
      { id: 'explore', title: 'Service Listings', description: 'Manage your services', icon: 'construct', screen: 'Explore' },
      { id: 'messages', title: 'Client Management', description: 'Communicate with clients', icon: 'chatbubbles', screen: 'Messages' },
      { id: 'wallet', title: 'Payments', description: 'Track payments and quotes', icon: 'wallet', screen: 'Wallet' },
    ],
  };
  
  return recommendations[personaId] || recommendations.promoter;
};

/**
 * Filter items based on persona relevance
 */
export const filterItemsByPersona = (items, personaId, category) => {
  if (!personaId || category === 'Users' || category === 'Bar') {
    return items; // Don't filter Users or Bar
  }
  
  // Persona-specific filtering logic
  const personaFilters = {
    guest: {
      // Guests see all public events and services
      Events: (item) => item.isPublic !== false,
      Services: (item) => item.available !== false,
    },
    promoter: {
      // Promoters see events they can promote and marketing services
      Events: (item) => true, // All events
      Services: (item) => {
        const serviceName = (item.name || '').toLowerCase();
        return serviceName.includes('marketing') || 
               serviceName.includes('social') || 
               serviceName.includes('promotion') ||
               item.category === 'Marketing';
      },
    },
    coordinator: {
      // Coordinators see vendor services and events
      Events: (item) => true,
      Services: (item) => {
        const serviceName = (item.name || '').toLowerCase();
        return serviceName.includes('catering') || 
               serviceName.includes('photography') || 
               serviceName.includes('vendor') ||
               item.category === 'Vendor';
      },
    },
    wedding_planner: {
      // Wedding planners see wedding-related services
      Events: (item) => {
        const eventName = (item.name || '').toLowerCase();
        return eventName.includes('wedding') || 
               eventName.includes('bridal') ||
               item.eventCategory === 'wedding';
      },
      Services: (item) => {
        const serviceName = (item.name || '').toLowerCase();
        return serviceName.includes('wedding') || 
               serviceName.includes('bridal') ||
               serviceName.includes('photography') ||
               serviceName.includes('catering') ||
               item.category === 'Wedding';
      },
    },
    venue_owner: {
      // Venue owners see booking-related services
      Events: (item) => true, // All events for booking opportunities
      Services: (item) => {
        const serviceName = (item.name || '').toLowerCase();
        return serviceName.includes('booking') || 
               serviceName.includes('venue') ||
               item.category === 'Venue';
      },
    },
    performer: {
      // Performers see performance opportunities and related services
      Events: (item) => {
        const eventName = (item.name || '').toLowerCase();
        return eventName.includes('performance') || 
               eventName.includes('show') ||
               eventName.includes('concert') ||
               item.eventCategory === 'performance';
      },
      Services: (item) => {
        const serviceName = (item.name || '').toLowerCase();
        return serviceName.includes('performance') || 
               serviceName.includes('recording') ||
               item.category === 'Performance';
      },
    },
    vendor: {
      // Vendors see all services and events they can provide for
      Events: (item) => true,
      Services: (item) => item.available !== false, // All available services
    },
  };
  
  const filter = personaFilters[personaId]?.[category];
  if (!filter) {
    return items; // No filter for this persona/category combo
  }
  
  // Apply filter, but always show at least some items
  const filtered = items.filter(filter);
  return filtered.length > 0 ? filtered : items.slice(0, 10); // Fallback to top 10 if filter too restrictive
};

/**
 * Get persona-specific welcome message
 */
export const getPersonaWelcomeMessage = (personaId) => {
  const messages = {
    guest: 'Welcome! Discover events, browse our menu, and enjoy Merkaba.',
    promoter: 'Ready to promote your next event? Let\'s create some buzz!',
    coordinator: 'Plan flawless events with our comprehensive coordination tools.',
    wedding_planner: 'Create magical moments for couples with our wedding planning tools.',
    venue_owner: 'Maximize your venue potential with booking and revenue management.',
    performer: 'Showcase your talent and manage your performance bookings.',
    vendor: 'Connect with clients and grow your service business.',
  };
  
  return messages[personaId] || messages.guest;
};

/**
 * Get persona-specific quick actions
 */
export const getPersonaQuickActions = (personaId) => {
  const actions = {
    guest: [
      { label: 'Browse Menu', icon: 'wine', screen: 'BarMenu' },
      { label: 'View Events', icon: 'calendar', screen: 'Explore' },
      { label: 'Get Help', icon: 'help-circle', screen: 'Messages' },
    ],
    promoter: [
      { label: 'Create Event', icon: 'add-circle', screen: 'EventBooking' },
      { label: 'Auto Poster', icon: 'rocket', screen: 'AutoPoster' },
      { label: 'Analytics', icon: 'analytics', screen: 'M1ADashboard' },
    ],
    coordinator: [
      { label: 'Plan Event', icon: 'calendar', screen: 'EventBooking' },
      { label: 'Find Vendors', icon: 'search', screen: 'Explore' },
      { label: 'Messages', icon: 'chatbubbles', screen: 'Messages' },
    ],
    wedding_planner: [
      { label: 'Plan Wedding', icon: 'heart', screen: 'EventBooking' },
      { label: 'Vendors', icon: 'search', screen: 'Explore' },
      { label: 'Clients', icon: 'people', screen: 'Messages' },
    ],
    venue_owner: [
      { label: 'Bookings', icon: 'calendar', screen: 'EventBooking' },
      { label: 'Analytics', icon: 'trending-up', screen: 'M1ADashboard' },
      { label: 'Clients', icon: 'people', screen: 'Messages' },
    ],
    performer: [
      { label: 'Bookings', icon: 'musical-notes', screen: 'EventBooking' },
      { label: 'Portfolio', icon: 'camera', screen: 'ProfileTab' },
      { label: 'Earnings', icon: 'wallet', screen: 'Wallet' },
    ],
    vendor: [
      { label: 'Services', icon: 'construct', screen: 'Explore' },
      { label: 'Clients', icon: 'people', screen: 'Messages' },
      { label: 'Payments', icon: 'wallet', screen: 'Wallet' },
    ],
  };
  
  return actions[personaId] || actions.guest;
};

