import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ScrollIndicator Component
 * Shows an animated arrow and bounce effect to indicate scrollable content
 * Automatically hides after 3 seconds or when user starts scrolling
 */
export default function ScrollIndicator({ 
  visible = true, 
  onScrollStart,
  style 
}) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(visible);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isVisible) return;

    // Bounce animation (up and down)
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse animation for attention
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Fade out after 3 seconds
    const fadeOutTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }, 3000);

    bounceAnimation.start();
    pulseAnimation.start();

    return () => {
      bounceAnimation.stop();
      pulseAnimation.stop();
      clearTimeout(fadeOutTimer);
    };
  }, [isVisible, bounceAnim, fadeAnim, pulseAnim]);

  // Slide animation for arrow
  useEffect(() => {
    if (!isVisible) return;

    const slideAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    slideAnimation.start();

    return () => {
      slideAnimation.stop();
    };
  }, [isVisible, slideAnim]);

  if (!isVisible) return null;

  const bounceTranslate = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const slideTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 4],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: bounceTranslate }],
        },
      ]}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          transform: [
            { translateY: slideTranslate },
            { scale: pulseAnim }
          ],
        }}
      >
        <Ionicons name="chevron-down" size={28} color={theme.primary} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});

