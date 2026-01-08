// contexts/ThemeContext.js
import { createContext, useContext, useState } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

const lightTheme = {
  mode: 'light',
  isDark: false,
  background: '#ffffff',
  cardBackground: '#f8f9fa',
  text: '#000000',
  subtext: '#6c757d',
  primary: '#007AFF', // Standard blue
  secondary: '#8E8E93', // Standard gray
  accent: '#FF3B30', // Standard red accent
  border: '#e9ecef',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  placeholder: '#6c757d',
  shadow: 'rgba(0,0,0,0.1)',
};

const darkTheme = {
  mode: 'dark',
  isDark: true,
  background: '#0a0a0a', // Very dark gray (softer than pure black)
  cardBackground: '#1c1c1e', // iOS-style dark gray
  text: '#ffffff', // Pure white for better contrast
  subtext: '#98989d', // Light gray for secondary text
  primary: '#0a84ff', // iOS blue (better than gold)
  secondary: '#8e8e93', // Standard iOS gray
  accent: '#ff3b30', // iOS red accent
  border: '#38383a', // Subtle border
  success: '#30d158', // iOS green
  warning: '#ff9500', // iOS orange
  error: '#ff3b30', // iOS red
  info: '#5ac8fa', // iOS blue info
  placeholder: '#6e6e73', // Medium gray placeholder
  shadow: 'rgba(0,0,0,0.3)', // Dark shadow
};

export function ThemeProvider({ children }) {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);

  const toggleTheme = () =>
    setTheme((t) => (t.mode === 'dark' ? lightTheme : darkTheme));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  
  // If context is not available, return default light theme
  if (!context) {
    return {
      theme: lightTheme,
      toggleTheme: () => {},
    };
  }
  
  return context;
}
