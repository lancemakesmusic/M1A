import React, { createContext, useState, useContext } from 'react';

// Your DAW/brand color schemes
const themes = {
  dawGold: {
    background: '#181818',
    bubbleMe: '#FFD700',
    bubbleOther: '#232323',
    text: '#F8F8F8',
    accent: '#8C8C8C',
    avatarBorder: '#FFD700',
    header: '#FFD700',
    input: '#232323',
    emoji: '#FFD700',
  },
  dawEmerald: {
    background: '#1b2920',
    bubbleMe: '#2DE179',
    bubbleOther: '#223323',
    text: '#E0FFE7',
    accent: '#37FF8B',
    avatarBorder: '#37FF8B',
    header: '#37FF8B',
    input: '#223323',
    emoji: '#37FF8B',
  },
  dawAmethyst: {
    background: '#201B2C',
    bubbleMe: '#8F5AFF',
    bubbleOther: '#28204C',
    text: '#F8F6FF',
    accent: '#C0A6FF',
    avatarBorder: '#8F5AFF',
    header: '#8F5AFF',
    input: '#28204C',
    emoji: '#8F5AFF',
  },
  dawLight: {
    background: '#fff',
    bubbleMe: '#FFD700',
    bubbleOther: '#ECECEC',
    text: '#181818',
    accent: '#FFC700',
    avatarBorder: '#FFD700',
    header: '#FFD700',
    input: '#fafafa',
    emoji: '#FFD700',
  },
  dawDark: {
    background: '#101010',
    bubbleMe: '#555',
    bubbleOther: '#232323',
    text: '#fff',
    accent: '#FFD700',
    avatarBorder: '#FFD700',
    header: '#FFD700',
    input: '#232323',
    emoji: '#FFD700',
  },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('dawGold');
  const value = { theme: themes[themeName], themeName, setThemeName };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
