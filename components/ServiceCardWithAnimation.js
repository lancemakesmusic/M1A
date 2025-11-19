import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import AnimatedCard from './AnimatedCard';

/**
 * ServiceCardWithAnimation - Provides smooth sequential entrance animation
 * Cards are ALWAYS fully visible and in position - animation is non-intrusive.
 */
export default function ServiceCardWithAnimation({ 
  children, 
  index = 0,
  delay = 0,
  style,
  onPress,
  ...props 
}) {
  // Start at 0 (fully visible, in position) - cards never leave screen
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Only animate once on mount
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    
    // Small delay to ensure component is fully rendered and visible
    const timer = setTimeout(() => {
      // Calculate stagger delay
      const animationDelay = delay + (index * 100);
      
      // Set initial state (slightly offset and transparent) - but do it instantly
      // so cards are visible immediately, then animate
      slideAnim.setValue(-30);
      opacityAnim.setValue(0.8);
      
      // Animate to final state (no offset, fully visible) - smooth slide in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          delay: animationDelay,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          delay: animationDelay,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Lock to final state - ensure permanence
        slideAnim.setValue(0);
        opacityAnim.setValue(1);
      });
    }, 50); // Very short delay
    
    return () => clearTimeout(timer);
  }, []); // Empty deps - only run once on mount

  return (
    <View
      style={{ flex: 1 }}
      collapsable={false}
      removeClippedSubviews={false}
      needsOffscreenAlphaCompositing={false}
    >
      <Animated.View
        style={{
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        }}
        collapsable={false}
        removeClippedSubviews={false}
        needsOffscreenAlphaCompositing={false}
      >
        <AnimatedCard 
          style={style}
          onPress={onPress} 
          {...props}
        >
          {children}
        </AnimatedCard>
      </Animated.View>
    </View>
  );
}

