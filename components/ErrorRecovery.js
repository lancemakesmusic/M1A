// components/ErrorRecovery.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function ErrorRecovery({ 
  error,
  onRetry,
  onDismiss,
  title = 'Something went wrong',
  message,
  retryLabel = 'Try Again',
  dismissLabel = 'Dismiss'
}) {
  const { theme } = useTheme();

  if (!error) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.error + '15', borderColor: theme.error }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.error + '20' }]}>
          <Ionicons name="alert-circle" size={24} color={theme.error} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.error }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.text }]}>
            {message || error.message || 'An unexpected error occurred. Please try again.'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.error }]}
            onPress={onRetry}
          >
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            style={[styles.dismissButton, { borderColor: theme.error }]}
            onPress={onDismiss}
          >
            <Text style={[styles.dismissButtonText, { color: theme.error }]}>{dismissLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

