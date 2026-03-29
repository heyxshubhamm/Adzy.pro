"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ResendButton } from "@/components/ResendButton";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b]" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);

  const from = searchParams.get("from") || "/dashboard";
  const verified = searchParams.get("verified") === "1";

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403 && data.detail?.code === "EMAIL_NOT_VERIFIED") {
          setIsUnverified(true);
          throw new Error(data.detail.message);
        }
        throw new Error(data.detail || "Login failed");
      }

      router.push(from);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/google`;
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
            Welcome back to Adzy
          </h2>
          {verified && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium"
            >
              Email verified successfully! You can now sign in.
            </motion.div>
          )}
          <p className="mt-2 text-sm text-gray-400">
            Securely access your marketplace intelligence dashboard.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              <p>{error}</p>
              {isUnverified && (
                <div className="mt-4 pt-4 border-t border-red-500/10">
                  <ResendButton />
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 bg-[#1e1e21] border border-white/5 placeholder-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 bg-[#1e1e21] border border-white/5 placeholder-gray-500 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#161618] text-gray-500">Or continue with</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center py-3 px-4 border border-white/10 rounded-xl bg-white/5 text-sm font-medium text-white hover:bg-white/10 transition-all"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </button>
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-500">Don't have an account? </span>
          <Link href="/signup" className="font-semibold text-blue-500 hover:text-blue-400">
            Sign up
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
