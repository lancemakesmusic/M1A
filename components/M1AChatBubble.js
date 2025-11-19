/**
 * M1A Chat Bubble Component
 * Context-aware floating chat bubble with tips and full chat interface
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useM1AAssistant } from '../contexts/M1AAssistantContext';
import M1AChatScreen from '../screens/M1AChatScreen';

const { width, height } = Dimensions.get('window');

export default function M1AChatBubble() {
  const { theme } = useTheme();
  const {
    isVisible,
    isExpanded,
    currentTip,
    toggleExpanded,
    hideBubble,
    showBubble,
    handleTipAction,
    markTipAsShown,
    disableAllTips,
  } = useM1AAssistant();
  
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for attention
  useEffect(() => {
    if (currentTip && isVisible && !isExpanded) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [currentTip, isVisible, isExpanded, pulseAnim]);

  // Slide in animation
  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  // Reset checkbox when tip changes
  useEffect(() => {
    setDontShowAgain(false);
  }, [currentTip?.id]);

  if (!isVisible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <>
      {/* Floating Chat Bubble */}
      <Animated.View
        style={[
          styles.bubbleContainer,
          {
            transform: [
              { translateY },
              { scale: pulseAnim },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Tip Card (shown when not expanded) */}
        {currentTip && !isExpanded && (
          <TouchableOpacity
            style={[styles.tipCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
            onPress={toggleExpanded}
            activeOpacity={0.9}
          >
            <View style={styles.tipHeader}>
              <View style={[styles.tipIcon, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="bulb" size={20} color={theme.primary} />
              </View>
              <Text style={[styles.tipTitle, { color: theme.text }]} numberOfLines={1}>
                {currentTip.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  if (dontShowAgain) {
                    disableAllTips();
                  } else {
                    markTipAsShown(currentTip.id);
                  }
                  hideBubble();
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={16} color={theme.subtext} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.tipMessage, { color: theme.subtext }]} numberOfLines={2}>
              {currentTip.message}
            </Text>
            
            {/* Don't show again checkbox */}
            <TouchableOpacity
              style={styles.dontShowContainer}
              onPress={(e) => {
                e.stopPropagation();
                setDontShowAgain(!dontShowAgain);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                { 
                  borderColor: dontShowAgain ? theme.primary : theme.border,
                  backgroundColor: dontShowAgain ? theme.primary : 'transparent',
                }
              ]}>
                {dontShowAgain && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={[styles.dontShowText, { color: theme.subtext }]}>
                Don't show tips again
              </Text>
            </TouchableOpacity>
            
            {currentTip.action && (
              <TouchableOpacity
                style={[styles.tipActionSecondary, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTipAction(currentTip);
                  markTipAsShown(currentTip.id);
                }}
              >
                <Text style={[styles.tipActionTextSecondary, { color: theme.primary }]}>
                  {currentTip.action.type === 'navigate' ? 'Go There' : 'Learn More'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tipAction, { backgroundColor: theme.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                if (dontShowAgain) {
                  disableAllTips();
                } else {
                  markTipAsShown(currentTip.id);
                }
                toggleExpanded();
              }}
            >
              <Text style={styles.tipActionText}>Chat with M1A</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Chat Bubble Button */}
        <TouchableOpacity
          style={[styles.chatBubble, { backgroundColor: theme.primary }]}
          onPress={toggleExpanded}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
          {currentTip && !isExpanded && (
            <View style={styles.notificationBadge}>
              <View style={styles.notificationDot} />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Full Chat Modal */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        transparent={true}
        onRequestClose={toggleExpanded}
      >
        <M1AChatScreen onClose={toggleExpanded} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'flex-end',
    zIndex: 9999,
    ...Platform.select({
      web: {
        position: 'fixed',
      },
    }),
  },
  tipCard: {
    width: width * 0.75,
    maxWidth: 320,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  tipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  tipMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  dontShowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dontShowText: {
    fontSize: 12,
    flex: 1,
  },
  tipAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    marginTop: 8,
  },
  tipActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  tipActionSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  tipActionTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
  },
  chatBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});

