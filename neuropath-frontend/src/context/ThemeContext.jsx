import { createContext, useContext, useEffect, useState } from "react";

const defaultThemeContext = {
  theme: "claymorphism",
  isClaymorphism: true,
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext(defaultThemeContext);

export function ThemeProvider({ children, initialTheme = "claymorphism" }) {
  const [theme, setTheme] = useState(initialTheme || "claymorphism");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "claymorphism");
  }, [theme]);

  const value = {
    theme,
    isClaymorphism: true,
    toggleTheme: () => {},
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
