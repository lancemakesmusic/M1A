// components/DrawerSectionHeader.js
// Custom section header component for drawer navigation

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function DrawerSectionHeader({ title, icon }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
          {icon}
        </View>
      )}
      <Text style={[styles.sectionTitle, { color: theme.subtext }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

