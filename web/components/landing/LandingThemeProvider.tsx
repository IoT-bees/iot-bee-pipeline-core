"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AppTheme = "light" | "dark";

const AppThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
} | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("iot-bees-theme");
    if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
  }, []);

  const setTheme = (nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem("iot-bees-theme", nextTheme);
  };

  return (
    <AppThemeContext.Provider value={{ theme, setTheme }}>
      <div data-app-theme={theme} className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-fg-1)]">
        {children}
      </div>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) throw new Error("useAppTheme debe usarse dentro de AppThemeProvider");
  return context;
}
