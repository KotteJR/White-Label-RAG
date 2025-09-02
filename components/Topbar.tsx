"use client";

import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function Topbar() {
  const { themeMode, setThemeMode } = useUiStore();
  const { email, role } = useAuthStore();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-end border-b border-gray-200 dark:border-gray-800 bg-background px-4 py-2">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        {email ? `${email} (${role ?? "guest"})` : "Not signed in"}
        <button
          aria-label="Toggle theme"
          onClick={() => setThemeMode(themeMode === "dark" ? "light" : "dark")}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 hover:bg-gray-100"
        >
          {themeMode === "dark" ? (
            <SunIcon className="h-4 w-4" />
          ) : (
            <MoonIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}


