"use client";

import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { useState } from "react";
import Button from "@mui/material/Button";

export default function ProfilePage() {
  const { isAuthenticated, email, role, loginAs, logout } = useAuthStore();
  const { theme, setTheme } = useUiStore();
  const [newEmail, setNewEmail] = useState(email ?? "");

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
              <Button variant="contained" color="primary" size="small" onClick={() => loginAs("user", newEmail || undefined)}>
                Login as User
              </Button>
              <Button variant="contained" color="primary" size="small" onClick={() => loginAs("admin", newEmail || undefined)}>
                Login as Admin
              </Button>
              <input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="ml-2 rounded border border-gray-300 bg-transparent px-2 py-1 text-sm"
              />
            </>
          ) : (
            <Button variant="outlined" color="primary" size="small" onClick={() => logout()}>
              Logout
            </Button>
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


