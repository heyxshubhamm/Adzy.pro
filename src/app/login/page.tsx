"use client";
import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLoginMutation } from '@/store/api';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 animate-pulse" />}>
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
  
  const [login, { isLoading: loading }] = useLoginMutation();

  const from = searchParams.get("from") || "/dashboard";
  const verified = searchParams.get("verified") === "1";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const data = await login({ email, password }).unwrap();
      
      if (data?.user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push(from);
      }
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || "Authentication sequence failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Background Neural Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-12 shadow-2xl shadow-indigo-500/10 transition-all">
           <div className="text-center mb-12">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-3">Identity Access</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60">
                 Secure Entrance to <span className="text-indigo-400">Adzy Intelligence</span>
              </p>
           </div>

           {verified && (
             <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center animate-in fade-in zoom-in-95">
                Protocol Verified. Access Granted.
             </div>
           )}

           <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest text-center animate-in slide-in-from-top-2">
                   {error}
                </div>
              )}

              <div className="space-y-4">
                 <div className="relative group">
                    <label className="absolute -top-2 left-6 px-2 bg-slate-900 text-[8px] font-black text-slate-400 uppercase tracking-widest z-20">Identity Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="name@agency.com"
                    />
                 </div>
                 <div className="relative group">
                    <label className="absolute -top-2 left-6 px-2 bg-slate-900 text-[8px] font-black text-slate-400 uppercase tracking-widest z-20">Access Pin</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-xl ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] shadow-white/5'}`}
              >
                {loading ? 'Synchronizing...' : 'Initialize Session'}
              </button>
           </form>

           <div className="relative my-10">
              <div className="absolute inset-0 flex items-center">
                 <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest">
                 <span className="px-4 bg-slate-900 text-slate-600">Cross-Protocol Auth</span>
              </div>
           </div>

           <button
             onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/google`}
             className="w-full flex items-center justify-center py-5 border border-white/10 rounded-2xl bg-white/5 text-[9px] font-black text-white hover:bg-white/10 transition-all gap-3 uppercase tracking-widest shadow-inner shadow-white/5"
           >
             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
             </svg>
             Secure with Google
           </button>

           <div className="mt-12 text-center text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500">New Protocol Node? </span>
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Initialize Signup
              </Link>
           </div>
        </div>
      </motion.div>

      {/* Abstract Visual Nodes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
