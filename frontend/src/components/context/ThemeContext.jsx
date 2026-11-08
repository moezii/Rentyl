import React from 'react';
import { createContext, useState, useEffect, useContext } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(false);

  // Function to force dark mode for dashboard
  const setDarkMode = () => {
    setDarkModeState(true);
    document.documentElement.classList.add('dark');
  };

  // Update document class when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Toggle dark mode (only for dashboard use)
  const toggleDarkMode = () => {
    setDarkModeState(prevMode => !prevMode);
  };

  // Set specific mode
  const setMode = isDark => {
    setDarkModeState(isDark);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        setMode,
        setDarkMode: () => setMode(true),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
