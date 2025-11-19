import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

/**
 * ScreenBounceWrapper Component
 * Wraps scrollable content and applies a subtle bounce animation on mount
 * to indicate that the screen is scrollable
 */
export default function ScreenBounceWrapper({ 
  children, 
  enabled = true,
  style 
}) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled) return;

    // Initial bounce animation when screen loads
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enabled, bounceAnim]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Subtle upward bounce
  });

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        style,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});

