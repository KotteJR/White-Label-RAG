"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

type MockAuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
};

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cachedClient = createClient(url, anon);
  return cachedClient;
}

export function getMockUser(): MockAuthUser | null {
  if (typeof window === "undefined") return null;
  const auth = document.cookie
    .split("; ")
    .find((row) => row.startsWith("authenticated="))
    ?.split("=")[1];
  if (auth !== "true") return null;
  const role = (document.cookie
    .split("; ")
    .find((row) => row.startsWith("role="))
    ?.split("=")[1] || "user") as "admin" | "user";
  const email =
    decodeURIComponent(
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("email="))
        ?.split("=")[1] || "user@example.com"
    ) || "user@example.com";
  return { id: "mock-user-id", email, role };
}

export function setMockAuth(user: MockAuthUser | null) {
  if (typeof document === "undefined") return;
  if (user) {
    document.cookie = `authenticated=true; path=/`;
    document.cookie = `role=${user.role}; path=/`;
    document.cookie = `email=${encodeURIComponent(user.email)}; path=/`;
  } else {
    document.cookie = `authenticated=; Max-Age=0; path=/`;
    document.cookie = `role=; Max-Age=0; path=/`;
    document.cookie = `email=; Max-Age=0; path=/`;
  }
}


