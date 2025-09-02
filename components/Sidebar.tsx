"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { usePathname } from "next/navigation";
import classNames from "classnames";
import { useEffect, useState } from "react";

const NavItem = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={classNames(
        "block rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      {label}
    </Link>
  );
};

export default function Sidebar() {
  const { role, isAuthenticated, loginAs, logout } = useAuthStore();
  const { sidebarOpen } = useUiStore();
  const pathname = usePathname();

  const adminLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/documents", label: "Documents" },
  ];
  const sharedLinks = [{ href: "/chat", label: "Chat" }];

  return (
    <aside className={classNames("h-screen border-r border-gray-200 p-4 hidden sm:block w-64 bg-white")}> 
      <div className="mb-6">
        <div className="text-base font-semibold text-gray-900">Portal</div>
        <div className="text-xs text-gray-500">{role ?? "guest"}</div>
      </div>
      <nav className="space-y-1">
        {isAuthenticated && role === "admin" && adminLinks.map((l) => (
          <NavItem key={l.href} href={l.href} label={l.label} />
        ))}

        {/* Single Chat link only; history handled inside the chat UI */}
        <NavItem href="/chat" label="Chat" />
      </nav>
      <div className="mt-6 space-x-2">
        {!isAuthenticated ? (
          <>
            <Link href="/login" className="inline-block rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700">Login</Link>
            <Link href="/signup" className="inline-block rounded-md border px-3 py-1 text-sm hover:bg-gray-50">Sign up</Link>
          </>
        ) : (
          <button onClick={() => logout()} className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700">
            Logout
          </button>
        )}
      </div>
    </aside>
  );
}


