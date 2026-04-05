"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function Admin2FAVerify() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        router.push("/admin");
      } else {
        const data = await res.json();
        setError(data.detail || "Invalid 2FA protocol code.");
      }
    } catch (err) {
      setError("Neutral link failure. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Abstract Grid Background */}
      <div className="absolute inset-0 opacity-10">
         <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-12 shadow-2xl shadow-indigo-500/10 text-center animate-in zoom-in-95 fade-in duration-700">
           <div className="mb-10 inline-flex items-center justify-center w-20 h-20 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 shadow-inner">
             <span className="text-4xl">🔐</span>
           </div>
           
           <h1 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase">Security Gate</h1>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-12 opacity-60">
              Identity Verification Required for <br/> 
              <span className="text-indigo-400">Industrial Admin Control</span>
           </p>

           <form onSubmit={handleVerify} className="space-y-8">
              <div className="relative group">
                 <input
                   type="text"
                   placeholder="000000"
                   maxLength={6}
                   value={code}
                   onChange={(e) => setCode(e.target.value)}
                   className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-4xl text-center text-white font-black tracking-[0.4em] outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-white/5 uppercase"
                   required
                   autoFocus
                 />
                 <div className="absolute inset-0 rounded-2xl bg-indigo-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest animate-in slide-in-from-top-2">
                   {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-xl ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] shadow-white/5'}`}
              >
                {loading ? 'Authenticating...' : 'Verify Protocol'}
              </button>
           </form>

           <div className="mt-12 pt-8 border-t border-white/5 space-y-2">
              <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                 <span>System Integrity</span>
                 <span className="text-emerald-500">Verified</span>
              </div>
              <div className="flex justify-between items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                 <span>Encryption</span>
                 <span className="text-indigo-400">AES-256 GCM</span>
              </div>
           </div>
        </div>
      </div>

      {/* Abstract Visuals */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
