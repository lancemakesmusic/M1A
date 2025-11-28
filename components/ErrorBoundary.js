/**
 * Error Boundary Component
 * Catches React errors and displays a user-friendly error screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import M1ALogo from './M1ALogo';

class ErrorBoundaryClass extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service (e.g., Sentry)
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    
    // In production, send to error tracking service
    // Sentry.captureException(error, { extra: errorInfo });
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, errorInfo, onReset }) {
  const { theme } = useTheme();
  const isDev = __DEV__;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <M1ALogo size={80} variant="icon" style={styles.logo} />
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.error} />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          Oops! Something went wrong
        </Text>

        <Text style={[styles.message, { color: theme.subtext }]}>
          We're sorry for the inconvenience. The app encountered an unexpected error.
        </Text>

        {isDev && error && (
          <View style={[styles.errorContainer, { backgroundColor: theme.cardBackground, borderColor: theme.error }]}>
            <Text style={[styles.errorTitle, { color: theme.error }]}>Error Details (Dev Only):</Text>
            <Text style={[styles.errorText, { color: theme.text }]}>
              {error.toString()}
            </Text>
            {errorInfo && (
              <Text style={[styles.errorStack, { color: theme.subtext }]}>
                {errorInfo.componentStack}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.primary }]}
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Resets the app and attempts to recover from the error"
        >
          <Ionicons name="refresh" size={20} color="#fff" style={styles.resetIcon} />
          <Text style={styles.resetButtonText}>Try Again</Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: theme.subtext }]}>
          If the problem persists, please contact support.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    marginBottom: 16,
    opacity: 0.5,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    maxHeight: 300,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
  },
  resetIcon: {
    marginRight: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ErrorBoundaryClass;

