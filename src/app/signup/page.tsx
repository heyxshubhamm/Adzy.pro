"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      router.push("/verify-email");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-[#161618] p-10 rounded-2xl border border-white/5 shadow-2xl"
      >
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
            Create your Adzy account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Join the marketplace. Buy or sell services in minutes.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 bg-[#1e1e21] border border-white/5 placeholder-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all sm:text-sm"
              placeholder="Email address"
            />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 bg-[#1e1e21] border border-white/5 placeholder-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all sm:text-sm"
              placeholder="Username"
              minLength={3}
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-4 py-3 bg-[#1e1e21] border border-white/5 placeholder-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all sm:text-sm"
              placeholder="Password"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="text-center text-sm">
          <span className="text-gray-500">Already have an account? </span>
          <Link href="/login" className="font-semibold text-blue-500 hover:text-blue-400">
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
