/**
 * M1A Assistant Context
 * Manages the state and behavior of the M1A chat assistant
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import M1AAssistantService from '../services/M1AAssistantService';
import TipTrackingService from '../services/TipTrackingService';
import { useM1APersonalization } from './M1APersonalizationContext';

const M1AAssistantContext = createContext();

export function M1AAssistantProvider({ children }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTip, setCurrentTip] = useState(null);
  const [tips, setTips] = useState([]);
  const [currentScreen, setCurrentScreen] = useState('Home');
  const [userBehavior, setUserBehavior] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const { userPersona } = useM1APersonalization();
  
  // Navigation will be set up by NavigationAwareM1A component
  // We'll use a ref to store navigation and update screen via a callback
  const navigationRef = React.useRef(null);
  const setNavigation = useCallback((nav) => {
    navigationRef.current = nav;
  }, []);

  // Function to update current screen (called from NavigationAwareM1A)
  const updateCurrentScreen = useCallback((screenName) => {
    if (screenName && screenName !== currentScreen) {
      setCurrentScreen(screenName);
      updateTipsForScreen(screenName);
    }
  }, [currentScreen, updateTipsForScreen]);

  // Update tips when screen changes
  const updateTipsForScreen = useCallback(async (screenName) => {
    const newTips = M1AAssistantService.getContextualTips(
      screenName,
      userPersona,
      userBehavior
    );
    
    // Filter tips based on tracking
    const filteredTips = [];
    for (const tip of newTips) {
      const shouldShow = await TipTrackingService.shouldShowTip(tip.id);
      if (shouldShow) {
        filteredTips.push(tip);
      }
    }
    
    setTips(filteredTips);
    
    // Show highest priority tip
    if (filteredTips.length > 0) {
      const highPriorityTip = filteredTips.find(t => t.priority === 'high') || filteredTips[0];
      setCurrentTip(highPriorityTip);
    } else {
      setCurrentTip(null);
    }
  }, [userPersona, userBehavior]);

  // Rotate tips periodically
  useEffect(() => {
    if (tips.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentTip(prevTip => {
        const currentIndex = tips.findIndex(t => t.id === prevTip?.id);
        const nextIndex = (currentIndex + 1) % tips.length;
        return tips[nextIndex];
      });
    }, 10000); // Rotate every 10 seconds

    return () => clearInterval(interval);
  }, [tips]);

  // Show tip after delay on screen change
  useEffect(() => {
    if (currentScreen && tips.length > 0) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000); // Show after 2 seconds

      return () => clearTimeout(timer);
    }
  }, [currentScreen, tips]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (!isExpanded) {
      // Add welcome message when opening chat
      if (chatHistory.length === 0) {
        addMessage('assistant', 'Hi! I\'m M1A, your AI booking agent and sales guide. How can I help you today?', true);
      }
    }
  }, [isExpanded, chatHistory.length]);

  const hideBubble = useCallback(() => {
    setIsVisible(false);
    setIsExpanded(false);
  }, []);

  const showBubble = useCallback(() => {
    setIsVisible(true);
  }, []);

  const addMessage = useCallback((role, message, isSystem = false) => {
    const newMessage = {
      id: Date.now().toString(),
      role, // 'user' or 'assistant'
      message,
      timestamp: new Date(),
      isSystem,
    };
    setChatHistory(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (message) => {
    // Add user message
    addMessage('user', message);

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI thinking time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate AI response
    const aiResponse = M1AAssistantService.generateAIResponse(message, {
      screen: currentScreen,
      userPersona,
      userBehavior,
    });

    // Add assistant response
    const responseText = aiResponse.response.message || aiResponse.response.title || '';
    addMessage('assistant', responseText, false);

    // Auto-navigate if response has navigation action
    if (aiResponse.response?.action?.type === 'navigate' && aiResponse.response.action.screen) {
      const nav = navigationRef.current;
      if (nav) {
        // Small delay to let user see the response
        setTimeout(() => {
          try {
            nav.navigate(aiResponse.response.action.screen);
            hideBubble();
          } catch (error) {
            console.warn('Navigation error:', error);
          }
        }, 500);
      }
    }

    // Service request is handled by the chat screen UI button (always visible for Guest persona)

    setIsTyping(false);

    return aiResponse;
  }, [currentScreen, userPersona, userBehavior, addMessage, hideBubble]);

  const handleTipAction = useCallback((tip) => {
    if (!tip.action) return;

    const nav = navigationRef.current;
    if (!nav) {
      console.warn('Navigation not available for tip action');
      return;
    }

    switch (tip.action.type) {
      case 'navigate':
        nav.navigate(tip.action.screen);
        hideBubble();
        break;
      case 'scroll':
        // Scroll to target (would need ref to scroll view)
        console.log('Scroll to:', tip.action.target);
        break;
      case 'show':
        // Show specific content (like service request modal)
        if (tip.action.type === 'service-request') {
          // This will be handled by the chat screen
          console.log('Service request action triggered');
        }
        break;
    }
  }, [hideBubble]);

  const markTipAsShown = useCallback(async (tipId) => {
    await TipTrackingService.markTipAsShown(tipId);
    // Remove tip from current tips
    setTips(prev => prev.filter(t => t.id !== tipId));
    setCurrentTip(prev => prev?.id === tipId ? null : prev);
  }, []);

  const disableAllTips = useCallback(async () => {
    await TipTrackingService.setTipsDisabled(true);
    setCurrentTip(null);
    setTips([]);
    hideBubble();
  }, [hideBubble]);

  const guidePurchaseFlow = useCallback(async (purchaseType, step = 1) => {
    const flowStep = M1AAssistantService.getPurchaseFlowGuidance(purchaseType, step);
    
    // Add guidance message
    addMessage('assistant', `${flowStep.title}\n\n${flowStep.message}`, false);
    
    // Navigate if action is available
    if (flowStep.action?.type === 'navigate') {
      const nav = navigationRef.current;
      if (nav) {
        setTimeout(() => {
          try {
            nav.navigate(flowStep.action.screen);
          } catch (error) {
            console.warn('Navigation error:', error);
          }
        }, 500);
      }
    }
    
    return flowStep;
  }, [addMessage]);

  const startTour = useCallback((screenName) => {
    const tourSteps = M1AAssistantService.getTourSteps(screenName, userPersona);
    // Tour implementation would go here
    console.log('Starting tour:', tourSteps);
    return tourSteps;
  }, [userPersona]);

  const updateUserBehavior = useCallback((behavior) => {
    setUserBehavior(prev => ({ ...prev, ...behavior }));
  }, []);

  const value = {
    // State
    isVisible,
    isExpanded,
    currentTip,
    tips,
    currentScreen,
    chatHistory,
    isTyping,
    
    // Actions
    toggleExpanded,
    hideBubble,
    showBubble,
    sendMessage,
    handleTipAction,
    startTour,
    updateUserBehavior,
    addMessage,
    updateCurrentScreen,
    setNavigation,
    markTipAsShown,
    disableAllTips,
    guidePurchaseFlow,
  };

  return (
    <M1AAssistantContext.Provider value={value}>
      {children}
    </M1AAssistantContext.Provider>
  );
}

export function useM1AAssistant() {
  const context = useContext(M1AAssistantContext);
  if (!context) {
    throw new Error('useM1AAssistant must be used within a M1AAssistantProvider');
  }
  return context;
}

