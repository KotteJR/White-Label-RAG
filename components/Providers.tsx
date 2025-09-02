"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { JSX } from "react/jsx-runtime";

export default function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const theme = useUiStore((s) => s.theme);
  const mode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--primary", theme.primaryColor);
    root.style.setProperty("--secondary", theme.secondaryColor);
  }, [theme.primaryColor, theme.secondaryColor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("theme-mode");
    if (saved === "light" || saved === "dark") setThemeMode(saved);
  }, [setThemeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("theme-mode", mode);
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [mode]);

  return children as JSX.Element;
}


