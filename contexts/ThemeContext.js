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
  background: '#000000', // Pure black
  cardBackground: '#1a1a1a', // Dark charcoal
  text: '#FFD700', // Gold text
  subtext: '#C0C0C0', // Silver subtext
  primary: '#FFD700', // Gold primary
  secondary: '#C0C0C0', // Silver secondary
  accent: '#FF6B35', // Orange accent
  border: '#333333', // Dark border
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  placeholder: '#888888',
  shadow: 'rgba(255,215,0,0.1)', // Gold shadow
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
