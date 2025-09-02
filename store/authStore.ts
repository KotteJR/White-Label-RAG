"use client";

import { create } from "zustand";
import { getMockUser, getSupabaseClient, setMockAuth } from "@/lib/supabaseClient";

export type UserRole = "admin" | "user" | null;

export interface AuthState {
  isAuthenticated: boolean;
  email: string | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  loginAs: (role: Exclude<UserRole, null>, email?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  signup: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  email: null,
  role: null,
  loading: false,
  error: null,
  hydrate: () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      const mock = getMockUser();
      if (mock) set({ isAuthenticated: true, email: mock.email, role: mock.role });
      return;
    }
    set({ loading: true });
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        set({ isAuthenticated: false, email: null, role: null, loading: false, error: error?.message || null });
        return;
      }
      const role = (data.user.app_metadata?.role as UserRole) || "user";
      set({ isAuthenticated: true, email: data.user.email ?? null, role, loading: false, error: null });
    });
  },
  loginAs: async (role, email) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMockAuth({ id: "mock", email: email || `${role}@example.com`, role });
      set({ isAuthenticated: true, email: email || `${role}@example.com`, role });
      return;
    }
    set({ loading: true });
    try {
      // Implement real login with Supabase UI/redirect in a real app
      set({ isAuthenticated: true, email: email || `${role}@example.com`, role, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
  login: async (username, password) => {
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", username, password }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({ isAuthenticated: true, email: data.email, role: data.role, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  signup: async (email, username, password) => {
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signup", email, username, password }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      set({ isAuthenticated: true, email: data.email, role: data.role, error: null });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    } finally {
      set({ isAuthenticated: false, email: null, role: null });
    }
  },
}));


