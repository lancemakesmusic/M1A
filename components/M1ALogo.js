// components/M1ALogo.js
// M1A Brand Logo Component - Geometric M with Hexagram Design
// Based on marketing best practices for brand recognition and consistency

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * M1A Logo Component
 * 
 * Marketing Strategy:
 * - First impression: Splash screens, login screens
 * - Consistent presence: Navigation headers, loading states
 * - Brand reinforcement: Empty states, error screens
 * - Trust building: Settings, About screens
 * - Subtle presence: Profile screens, footers
 * 
 * UX Considerations:
 * - Scalable: Works at any size (16px to 200px+)
 * - Accessible: High contrast, clear shapes
 * - Theme-aware: Adapts to light/dark modes
 * - Performance: SVG-based, lightweight
 */

const M1ALogo = ({ 
  size = 80, 
  variant = 'full', // 'full', 'icon', 'minimal'
  style,
  color = 'auto', // 'auto', 'gold', 'silver', 'primary', or custom hex
  showText = false, // Show "M1A" text below logo
  animated = false // Future: Add subtle animations
}) => {
  // Calculate dimensions based on size
  const width = size;
  const height = size;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Scale factors for different elements
  const hexagramRadius = size * 0.35; // Radius of outer circles
  const triangleSize = size * 0.4; // Size of triangles
  const mSize = size * 0.3; // Size of central M
  
  // Color calculations
  const getGoldColor = () => {
    if (color === 'auto') return '#D4AF37'; // Classic gold
    if (color === 'gold') return '#D4AF37';
    if (color === 'primary') return '#9C27B0'; // App primary color
    return color;
  };
  
  const getSilverColor = () => {
    if (color === 'auto') return '#C0C0C0'; // Classic silver
    if (color === 'silver') return '#C0C0C0';
    if (color === 'primary') return '#9C27B0';
    return color;
  };
  
  const goldColor = getGoldColor();
  const silverColor = getSilverColor();
  
  // Calculate hexagram points (6 points of a star)
  const getHexagramPoint = (index, radius) => {
    const angle = (index * 60 - 90) * (Math.PI / 180); // Start at top
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };
  
  // Generate points for triangles
  const topTriangle = [
    getHexagramPoint(0, hexagramRadius),
    getHexagramPoint(2, hexagramRadius),
    getHexagramPoint(4, hexagramRadius)
  ];
  
  const bottomTriangle = [
    getHexagramPoint(1, hexagramRadius),
    getHexagramPoint(3, hexagramRadius),
    getHexagramPoint(5, hexagramRadius)
  ];
  
  // Central M path
  const mPath = `
    M ${centerX - mSize * 0.3} ${centerY + mSize * 0.2}
    L ${centerX - mSize * 0.3} ${centerY - mSize * 0.3}
    L ${centerX - mSize * 0.1} ${centerY - mSize * 0.3}
    L ${centerX} ${centerY + mSize * 0.1}
    L ${centerX + mSize * 0.1} ${centerY - mSize * 0.3}
    L ${centerX + mSize * 0.3} ${centerY - mSize * 0.3}
    L ${centerX + mSize * 0.3} ${centerY + mSize * 0.2}
    Z
  `;
  
  // Connecting lines between hexagram points
  const connectingLines = [];
  for (let i = 0; i < 6; i++) {
    const point1 = getHexagramPoint(i, hexagramRadius);
    const point2 = getHexagramPoint((i + 1) % 6, hexagramRadius);
    connectingLines.push(
      <Line
        key={`line-${i}`}
        x1={point1.x}
        y1={point1.y}
        x2={point2.x}
        y2={point2.y}
        stroke={silverColor}
        strokeWidth={size * 0.015}
        strokeLinecap="round"
      />
    );
  }
  
  // Lines from center to hexagram points
  const centerLines = [];
  for (let i = 0; i < 6; i++) {
    const point = getHexagramPoint(i, hexagramRadius);
    centerLines.push(
      <Line
        key={`center-line-${i}`}
        x1={centerX}
        y1={centerY}
        x2={point.x}
        y2={point.y}
        stroke={silverColor}
        strokeWidth={size * 0.01}
        strokeLinecap="round"
        opacity={0.6}
      />
    );
  }
  
  if (variant === 'minimal') {
    // Minimal version: Just the M
    return (
      <View style={[styles.container, style]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Path
            d={mPath}
            fill={goldColor}
            stroke={goldColor}
            strokeWidth={size * 0.02}
          />
        </Svg>
      </View>
    );
  }
  
  if (variant === 'icon') {
    // Icon version: M with simplified hexagram
    return (
      <View style={[styles.container, style]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D4AF37" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#E8E8E8" stopOpacity="1" />
              <Stop offset="100%" stopColor="#C0C0C0" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          {/* Outer circles */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const point = getHexagramPoint(i, hexagramRadius);
            return (
              <Circle
                key={`circle-${i}`}
                cx={point.x}
                cy={point.y}
                r={size * 0.08}
                fill="none"
                stroke="url(#goldGradient)"
                strokeWidth={size * 0.02}
              />
            );
          })}
          
          {/* Triangles */}
          <Path
            d={`M ${topTriangle[0].x} ${topTriangle[0].y} L ${topTriangle[1].x} ${topTriangle[1].y} L ${topTriangle[2].x} ${topTriangle[2].y} Z`}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth={size * 0.02}
          />
          <Path
            d={`M ${bottomTriangle[0].x} ${bottomTriangle[0].y} L ${bottomTriangle[1].x} ${bottomTriangle[1].y} L ${bottomTriangle[2].x} ${bottomTriangle[2].y} Z`}
            fill="none"
            stroke="url(#goldGradient)"
            strokeWidth={size * 0.02}
          />
          
          {/* Central M */}
          <Path
            d={mPath}
            fill="url(#silverGradient)"
            stroke={silverColor}
            strokeWidth={size * 0.015}
          />
        </Svg>
      </View>
    );
  }
  
  // Full version: Complete design with all elements
  return (
    <View style={[styles.container, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <Stop offset="50%" stopColor="#D4AF37" stopOpacity="1" />
            <Stop offset="100%" stopColor="#B8860B" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F5F5F5" stopOpacity="1" />
            <Stop offset="50%" stopColor="#C0C0C0" stopOpacity="1" />
            <Stop offset="100%" stopColor="#A8A8A8" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Connecting lines (silver) */}
        {centerLines}
        {connectingLines}
        
        {/* Outer circles (gold) */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const point = getHexagramPoint(i, hexagramRadius);
          return (
            <Circle
              key={`circle-${i}`}
              cx={point.x}
              cy={point.y}
              r={size * 0.08}
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth={size * 0.02}
            />
          );
        })}
        
        {/* Triangles (gold) */}
        <Path
          d={`M ${topTriangle[0].x} ${topTriangle[0].y} L ${topTriangle[1].x} ${topTriangle[1].y} L ${topTriangle[2].x} ${topTriangle[2].y} Z`}
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth={size * 0.02}
        />
        <Path
          d={`M ${bottomTriangle[0].x} ${bottomTriangle[0].y} L ${bottomTriangle[1].x} ${bottomTriangle[1].y} L ${bottomTriangle[2].x} ${bottomTriangle[2].y} Z`}
          fill="none"
          stroke="url(#goldGradient)"
          strokeWidth={size * 0.02}
        />
        
        {/* Central M (silver) */}
        <Path
          d={mPath}
          fill="url(#silverGradient)"
          stroke={silverColor}
          strokeWidth={size * 0.015}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default M1ALogo;

