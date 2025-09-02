"use client";

import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";

import Link from "next/link";

export default function ProfilePage() {
  const { isAuthenticated, email, role, logout } = useAuthStore();
  const { theme, setTheme } = useUiStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="text-sm">Status: {isAuthenticated ? "Authenticated" : "Guest"}</div>
        <div className="text-sm">Email: {email ?? "-"}</div>
        <div className="text-sm">Role: {role ?? "-"}</div>
        <div className="space-x-2">
          {!isAuthenticated ? (
            <>
              <Link href="/login" className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700">Login</Link>
              <Link href="/signup" className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50">Sign up</Link>
            </>
          ) : (
            <button className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50" onClick={() => logout()}>Logout</button>
          )}
        </div>
      </div>

      <div className="rounded border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="text-lg font-semibold">Theme Preview</div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Primary</label>
          <input
            type="color"
            value={theme.primaryColor}
            onChange={(e) => setTheme({ primaryColor: e.target.value })}
          />
          <label className="text-sm">Secondary</label>
          <input
            type="color"
            value={theme.secondaryColor}
            onChange={(e) => setTheme({ secondaryColor: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}


