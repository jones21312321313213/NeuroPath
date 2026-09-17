import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "neuropath_theme";

const defaultThemeContext = {
  theme: "default",
  isClaymorphism: false,
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext(defaultThemeContext);

export function ThemeProvider({ children, initialTheme }) {
  const [theme, setTheme] = useState(() => {
    if (initialTheme) return initialTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "claymorphism" || stored === "default") {
        return stored;
      }
    } catch {
      // Ignore local storage errors in sandboxed / test environments
    }
    return "default";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage write errors
    }

    if (theme === "claymorphism") {
      document.documentElement.setAttribute("data-theme", "claymorphism");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "claymorphism" ? "default" : "claymorphism"));
  };

  const value = {
    theme,
    isClaymorphism: theme === "claymorphism",
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  return context || defaultThemeContext;
}

export default ThemeProvider;
