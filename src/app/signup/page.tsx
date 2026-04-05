"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRegisterMutation } from "@/store/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", is_seller: false });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [register, { isLoading: loading }] = useRegisterMutation();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await register(form).unwrap();
      setSuccess(true);
      // Protocol: Redirect to verification gate after a delay
      setTimeout(() => router.push("/login?verified=0"), 3000);
    } catch (err: any) {
      setError(err?.data?.detail || err?.message || "Registration protocol failure.");
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
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-3">Node Initialization</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60">
                 Join the <span className="text-indigo-400">Adzy Marketplace Ecosystem</span>
              </p>
           </div>

           {success ? (
             <div className="space-y-6 text-center animate-in zoom-in-95 fade-in duration-700">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 shadow-inner mb-4">
                   <span className="text-4xl">📩</span>
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Verification Sent</h3>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60 px-6">
                   Check your terminal for the activation link. Redirecting to access gate...
                </p>
             </div>
           ) : (
             <form onSubmit={handleSignup} className="space-y-6">
                {error && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-black text-rose-400 uppercase tracking-widest text-center animate-in slide-in-from-top-2">
                     {error}
                  </div>
                )}

                <div className="space-y-4">
                   <div className="relative group">
                      <label className="absolute -top-2 left-6 px-2 bg-slate-900 text-[8px] font-black text-slate-400 uppercase tracking-widest z-20">Identity Username</label>
                      <input
                        type="text"
                        required
                        value={form.username}
                        onChange={(e) => setForm({...form, username: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="jmiller_adzy"
                      />
                   </div>
                   <div className="relative group">
                      <label className="absolute -top-2 left-6 px-2 bg-slate-900 text-[8px] font-black text-slate-400 uppercase tracking-widest z-20">Identity Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({...form, email: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="name@agency.com"
                      />
                   </div>
                   <div className="relative group">
                      <label className="absolute -top-2 left-6 px-2 bg-slate-900 text-[8px] font-black text-slate-400 uppercase tracking-widest z-20">Secure Access Pin</label>
                      <input
                        type="password"
                        required
                        value={form.password}
                        onChange={(e) => setForm({...form, password: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                   </div>
                </div>

                <div className="p-6 bg-indigo-500/5 rounded-3xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-indigo-500/10 transition-colors"
                     onClick={() => setForm({...form, is_seller: !form.is_seller})}
                >
                   <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Seller Protocol?</h4>
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-tighter mt-1">Unlock merchant-tier dashboard</p>
                   </div>
                   <div className={`w-10 h-5 rounded-full transition-all relative ${form.is_seller ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${form.is_seller ? 'translate-x-5' : ''}`} />
                   </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-xl ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98] shadow-white/5'}`}
                >
                  {loading ? 'Initializing...' : 'Confirm Registration'}
                </button>
             </form>
           )}

           <div className="mt-12 text-center text-[9px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Already Initialized? </span>
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Identity Access
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
