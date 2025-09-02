"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export default function SignupPage() {
  const signup = useAuthStore((s) => s.signup);
  const error = useAuthStore((s) => s.error);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 subtle-gradient-bg"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Signup card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>

            {/* Title and subtitle */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Join the platform</h1>
              <p className="text-gray-600">Create your account to start chatting<br />and managing documents</p>
            </div>

            {/* Form */}
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                await signup(email, username, password);
                setBusy(false);
                router.push("/chat");
              }}
            >
              {/* Email field */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-gray-100 transition-all duration-200"
                />
              </div>

              {/* Username field */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-gray-100 transition-all duration-200"
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-gray-100 transition-all duration-200"
                />
              </div>

              {/* Error message */}
              {error && <div className="text-sm text-red-600 text-center bg-red-50 py-2 px-3 rounded-lg">{error}</div>}

              {/* Submit button */}
              <button
                disabled={busy}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500/20 disabled:opacity-60 transition-all"
                type="submit"
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>

            {/* Login link */}
            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .subtle-gradient-bg {
          background: linear-gradient(-45deg, #ffffff, #f8fafc, #f1f5f9, #e2e8f0, #d1d5db, #f8fafc, #ffffff);
          background-size: 400% 400%;
          animation: gradientFlow 8s ease infinite;
        }
        
        @keyframes gradientFlow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}