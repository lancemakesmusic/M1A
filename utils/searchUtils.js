// utils/searchUtils.js
// Enhanced search utilities for HomeScreen

/**
 * Enhanced search with fuzzy matching and keyword expansion
 */
export const searchFeatures = (query, features) => {
  if (!query || !query.trim()) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  const results = [];

  // Keyword synonyms and expansions
  const keywordMap = {
    'event': ['calendar', 'schedule', 'booking', 'performance', 'show', 'concert'],
    'social': ['facebook', 'instagram', 'twitter', 'post', 'media', 'marketing'],
    'analytics': ['stats', 'statistics', 'insights', 'dashboard', 'data', 'metrics'],
    'wallet': ['money', 'payment', 'balance', 'funds', 'cash', 'transaction'],
    'message': ['chat', 'conversation', 'talk', 'communicate', 'contact'],
    'profile': ['account', 'settings', 'user', 'personal', 'info'],
    'explore': ['search', 'find', 'discover', 'browse', 'services', 'vendors'],
    'bar': ['drink', 'menu', 'food', 'order', 'beverage'],
  };

  // Expand search term with synonyms
  const expandedTerms = [searchTerm];
  Object.keys(keywordMap).forEach(keyword => {
    if (searchTerm.includes(keyword) || keyword.includes(searchTerm)) {
      expandedTerms.push(...keywordMap[keyword]);
    }
    keywordMap[keyword].forEach(synonym => {
      if (searchTerm.includes(synonym) || synonym.includes(searchTerm)) {
        expandedTerms.push(keyword);
        expandedTerms.push(...keywordMap[keyword]);
      }
    });
  });

  features.forEach(feature => {
    let score = 0;
    const titleLower = feature.title.toLowerCase();
    const descLower = feature.description.toLowerCase();
    const iconLower = feature.icon?.toLowerCase() || '';
    const screenLower = feature.screen?.toLowerCase() || '';

    // Check each expanded term
    expandedTerms.forEach(term => {
      // Exact title match (highest priority)
      if (titleLower === term) {
        score += 100;
      }
      // Title contains term
      else if (titleLower.includes(term)) {
        score += 50;
      }
      // Description contains term
      else if (descLower.includes(term)) {
        score += 30;
      }
      // Icon name matches
      else if (iconLower.includes(term)) {
        score += 20;
      }
      // Screen name matches
      else if (screenLower.includes(term)) {
        score += 10;
      }
      // Fuzzy match (partial word match)
      else if (titleLower.split(' ').some(word => word.startsWith(term))) {
        score += 15;
      }
    });

    if (score > 0) {
      results.push({ ...feature, searchScore: score });
    }
  });

  // Sort by score (highest first)
  results.sort((a, b) => b.searchScore - a.searchScore);

  return results;
};

/**
 * Get search suggestions based on partial query
 */
export const getSearchSuggestions = (query, features) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();
  const suggestions = new Set();

  features.forEach(feature => {
    const titleLower = feature.title.toLowerCase();
    const descLower = feature.description.toLowerCase();

    // Check if query matches start of any word in title
    titleLower.split(' ').forEach(word => {
      if (word.startsWith(searchTerm)) {
        suggestions.add(feature.title);
      }
    });

    // Check if query matches start of any word in description
    descLower.split(' ').forEach(word => {
      if (word.startsWith(searchTerm) && word.length > searchTerm.length) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, 5);
};

