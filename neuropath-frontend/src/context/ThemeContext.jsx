/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useMemo } from "react";

const THEME_STORAGE_KEY = "neuropath_theme";

export const THEMES = {
  MINIMALIST: "minimalist",
  DEFAULT: "default",
};

export const ThemeContext = createContext(null);

export function ThemeProvider({ children, initialTheme = THEMES.MINIMALIST }) {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === THEMES.DEFAULT || stored === THEMES.MINIMALIST) {
          return stored;
        }
      }
    } catch {
      // ignore storage access errors
    }
    return initialTheme;
  });

  useEffect(() => {
    try {
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme);
      }
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    } catch {
      // ignore storage access errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === THEMES.MINIMALIST ? THEMES.DEFAULT : THEMES.MINIMALIST));
  };

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isMinimalist: theme === THEMES.MINIMALIST,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context) return context;
  return {
    theme: THEMES.MINIMALIST,
    setTheme: () => {},
    toggleTheme: () => {},
    isMinimalist: true,
  };
}

export default ThemeProvider;
