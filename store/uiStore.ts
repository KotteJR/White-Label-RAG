"use client";

import { create } from "zustand";

export interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  organizationName: string;
}

export interface UiState {
  sidebarOpen: boolean;
  theme: ThemeSettings;
  themeMode: "light" | "dark";
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Partial<ThemeSettings>) => void;
  setThemeMode: (mode: "light" | "dark") => void;
}

const defaultTheme: ThemeSettings = {
  primaryColor: "#3b82f6",
  secondaryColor: "#10b981",
  logoUrl: null,
  organizationName: "Acme Corp",
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  theme: defaultTheme,
  themeMode: "light",
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setTheme: (theme) =>
    set((state) => ({ theme: { ...state.theme, ...theme } })),
  setThemeMode: (mode) => set({ themeMode: mode }),
}));


