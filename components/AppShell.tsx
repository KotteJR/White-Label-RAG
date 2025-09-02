"use client";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAuthStore } from "@/store/authStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuthStore();
  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAuthenticated) return <main className="min-h-screen">{children}</main>;
  return (
    <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] min-h-screen">
      <div className="row-span-2"><Sidebar /></div>
      <div className="col-start-2 row-start-1"><Topbar /></div>
      <main className="col-start-2 row-start-2 p-4">{children}</main>
    </div>
  );
}


