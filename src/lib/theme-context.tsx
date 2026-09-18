'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeName, ColorMode } from './types';
import { usePlanner } from './storage';

interface ThemeContextType {
  theme: ThemeName;
  colorMode: ColorMode;
  setTheme: (theme: ThemeName) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile, updateProfile } = usePlanner();
  const [theme, setThemeState] = useState<ThemeName>(profile.theme || 'blush');
  const [colorMode, setColorModeState] = useState<ColorMode>(profile.colorMode || 'light');

  useEffect(() => {
    if (profile.theme) setThemeState(profile.theme);
    if (profile.colorMode) setColorModeState(profile.colorMode);
  }, [profile.theme, profile.colorMode]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-mode', colorMode);

    if (colorMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, colorMode]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    updateProfile({ theme: newTheme });
  };

  const setColorMode = (newMode: ColorMode) => {
    setColorModeState(newMode);
    updateProfile({ colorMode: newMode });
  };

  const toggleColorMode = () => {
    const nextMode = colorMode === 'dark' ? 'light' : 'dark';
    setColorMode(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorMode,
        setTheme,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
