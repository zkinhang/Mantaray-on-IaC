import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "medium";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("rov-theme");
    return (stored === "light" || stored === "dark" || stored === "medium") ? stored as Theme : "dark";
  });

  useEffect(() => {
    localStorage.setItem("rov-theme", theme);
    const root = document.documentElement;
    root.classList.remove("light", "dark", "medium");
    root.classList.add(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
