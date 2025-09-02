"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: "admin" | "user";
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireRole 
}: AuthGuardProps) {
  const { isAuthenticated, role, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !isAuthenticated) {
        router.push("/login");
        return;
      }
      
      if (requireRole && role !== requireRole) {
        // If user doesn't have required role, redirect to appropriate page
        if (isAuthenticated) {
          router.push(role === "admin" ? "/dashboard" : "/chat");
        } else {
          router.push("/login");
        }
        return;
      }
    }
  }, [isAuthenticated, role, loading, requireAuth, requireRole, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  if (requireRole && role !== requireRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}
