"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";

export default function SignupPage() {
  const signup = useAuthStore((s) => s.signup);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-semibold">Create account</h1>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          await signup(email, username, password);
        }}
      >
        <label className="block text-sm">
          <div>Email</div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-2" />
        </label>
        <label className="block text-sm">
          <div>Username</div>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-2" />
        </label>
        <label className="block text-sm">
          <div>Password</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-2" />
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full rounded-md bg-gray-900 px-3 py-2 text-white hover:bg-gray-700" type="submit">Sign up</button>
      </form>
      <div className="mt-3 text-sm text-gray-600">
        Have an account? <Link className="underline" href="/login">Sign in</Link>
      </div>
    </div>
  );
}


