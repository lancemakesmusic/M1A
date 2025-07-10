import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEMES = {
  gold: {
    name: 'Gold',
    primary: '#FFD700',
    background: '#181818',
    text: '#fff',
    // ...add more colors
  },
  green: {
    name: 'Modern Green',
    primary: '#17e37d',
    background: '#172422',
    text: '#fff',
  },
  purple: {
    name: 'Modern Purple',
    primary: '#be6cfb',
    background: '#1e1632',
    text: '#fff',
  },
  dark: {
    name: 'Dark',
    primary: '#444',
    background: '#1a1a1a',
    text: '#fff',
  },
  light: {
    name: 'Light',
    primary: '#181818',
    background: '#f9f9f9',
    text: '#181818',
  },
};

const ThemeContext = createContext({
  theme: THEMES.gold,
  setThemeKey: () => {},
  themeKey: 'gold',
});

export function ThemeProvider({ initialTheme, children }) {
  const [themeKey, setThemeKey] = useState(initialTheme || 'gold');
  const theme = THEMES[themeKey] || THEMES.gold;

  // Save to AsyncStorage on change
  useEffect(() => {
    AsyncStorage.setItem('m1a_theme', themeKey);
  }, [themeKey]);

  return (
    <ThemeContext.Provider value={{ theme, themeKey, setThemeKey, THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
