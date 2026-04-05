"use client";
import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: '📊' },
    { label: 'My Services', href: '/dashboard/gigs', icon: '⚡' },
    { label: 'Orders', href: '/dashboard/orders', icon: '📦' },
    { label: 'Wallet', href: '/dashboard/wallet', icon: '💰' },
    { label: 'KYC Node', href: '/dashboard/kyc', icon: '🛡️' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-inter flex overflow-hidden">
      {/* High-Fidelity Sidebar */}
      <aside className="w-80 bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-30 transition-all duration-500">
        <div className="p-10">
           <Link href="/" className="inline-block mb-16 group">
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase group-hover:text-indigo-400 transition-colors">Adzy Pro</h2>
              <div className="h-1 w-8 bg-indigo-500 mt-1 group-hover:w-full transition-all duration-500" />
           </Link>

           <nav className="space-y-2">
              {navItems.map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${pathname === item.href ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}
                >
                  <span className="text-sm opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
           </nav>
        </div>

        <div className="mt-auto p-10 space-y-6">
           <div className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl relative overflow-hidden group">
              <div className="relative z-10">
                 <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2 italic">Node Status</p>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Verified Identity Active</span>
                 </div>
              </div>
              <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700" />
           </div>

           <button className="w-full py-4 bg-slate-800/50 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all">
              Initialize Logoff
           </button>
        </div>
        
        {/* Background Gradients */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      </aside>

      {/* Main Mission Control Surface */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-20 px-12 py-8 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center">
           <div>
              <h1 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] italic mb-1">Sector Navigation</h1>
              <div className="flex items-center gap-2 text-white">
                 <span className="text-xs opacity-40">/</span>
                 <span className="text-xs font-black uppercase tracking-widest">{pathname.split('/').filter(Boolean).pop() || 'overview'}</span>
              </div>
           </div>

           <div className="flex items-center gap-8">
              <div className="flex -space-x-2">
                 {[...Array(3)].map((_, i) => (
                   <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black font-mono">A{i+1}</div>
                 ))}
              </div>
              <div className="h-8 w-px bg-white/10" />
              <button className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all text-xs">🔔</button>
           </div>
        </header>

        <section className="p-12 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<div className="h-screen bg-slate-950 animate-pulse rounded-[40px]" />}>
                {children}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Global Abstract Nodes */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full -mr-[400px] -mt-[400px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none -z-10" />
      </main>
    </div>
  );
}
