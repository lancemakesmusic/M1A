// contexts/ThemeContext.js
import { createContext, useContext, useState } from 'react';
import { Appearance } from 'react-native';

const ThemeContext = createContext();

const lightTheme = {
  mode: 'light',
  background: '#ffffff',
  text: '#000000',
  primary: '#3D5AFE',
  accent: '#03DAC6',
  placeholder: '#888',
};

const darkTheme = {
  mode: 'dark',
  background: '#121212',
  text: '#ffffff',
  primary: '#BB86FC',
  accent: '#03DAC6',
  placeholder: '#888',
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
  return useContext(ThemeContext);
}
