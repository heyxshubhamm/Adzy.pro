"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useGetThreadsQuery } from '@/store/api';
import { motion } from 'framer-motion';

export default function InboxPage() {
  const [archived, setArchived] = useState(false);
  const { data: threads, isLoading } = useGetThreadsQuery({ archived });

  return (
     <div className="min-h-screen bg-slate-950 text-slate-200 font-inter p-6 lg:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden relative">
        <div className="max-w-4xl mx-auto space-y-12 relative z-10">
           {/* High-Fidelity Header */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              <div className="space-y-4">
                 <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                    Intelligence <span className="text-indigo-400">Inbox</span>
                 </h1>
                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-60">
                    {threads?.length || 0} Communication Nodes Active
                 </p>
              </div>
              <button 
                onClick={() => setArchived(!archived)}
                className={`px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${archived ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
              >
                 {archived ? '← Active Operations' : '📦 Archived Logs'}
              </button>
           </div>

           {/* Thread Grid Surface */}
           <div className="space-y-4">
              {isLoading ? (
                 <div className="space-y-4 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-24 bg-slate-900/40 rounded-3xl border border-white/5" />
                    ))}
                 </div>
              ) : threads?.length === 0 ? (
                 <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-24 text-center space-y-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white/5 rounded-[32px] border border-white/10 text-4xl">💬</div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-black text-white uppercase tracking-tight">Zero Activity Detected</h3>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic opacity-60">Initialize your first communication protocol to begin node synchronization.</p>
                    </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 gap-4">
                    {threads?.map((thread: any) => (
                      <Link 
                        key={thread.id} 
                        href={`/messages/${thread.id}`}
                        className="group bg-slate-900/20 hover:bg-slate-900/40 backdrop-blur-3xl border border-white/5 hover:border-indigo-500/30 rounded-[32px] p-8 flex items-center gap-8 transition-all duration-300 relative overflow-hidden"
                      >
                         <div className="relative z-10 w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-xl font-black text-indigo-400 shadow-inner">
                            {thread.other_user_id.slice(0, 1).toUpperCase()}
                         </div>

                         <div className="relative z-10 flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-center">
                               <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-3">
                                  {thread.subject || 'Standard Thread'}
                                  {thread.unread > 0 && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                               </h4>
                               <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{new Date(thread.last_msg_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate opacity-60 italic group-hover:text-slate-200 transition-colors">
                               {thread.last_message || 'Initializing stream...'}
                            </p>
                         </div>

                         <div className="relative z-10 flex items-center gap-6">
                            {thread.order_id && <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-widest">Order Active</span>}
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-4">→</div>
                         </div>
                         
                         {/* Visual Pulse Accents */}
                         <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                      </Link>
                    ))}
                 </div>
              )}
           </div>
        </div>

        {/* Global Abstract Background */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-indigo-600/5 blur-[160px] rounded-full -mr-[400px] -mt-[400px] pointer-events-none -z-10" />
        <div className="fixed bottom-0 left-0 w-96 h-96 bg-emerald-600/5 blur-[120px] rounded-full -ml-32 -mb-32 pointer-events-none -z-10" />
     </div>
  );
}
