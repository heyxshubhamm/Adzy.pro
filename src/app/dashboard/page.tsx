"use client";
import React from 'react';
import { useGetUserStatsQuery } from '@/store/api';
import { motion } from 'framer-motion';

export default function DashboardOverview() {
  const { data: stats, isLoading } = useGetUserStatsQuery();

  if (isLoading) return <div className="h-96 bg-slate-900 animate-pulse rounded-[40px]" />;

  const buyerStats = stats?.buyer || { total_orders: 0, total_spent: 0 };
  const sellerStats = stats?.seller || { total_orders: 0, total_earned: 0, active_gigs: 0 };

  return (
     <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Metric Grid Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <MetricCard label="Investment Sector" value={`$${buyerStats.total_spent.toLocaleString()}`} subValue={`${buyerStats.total_orders} Projects Initiated`} color="indigo" />
           <MetricCard label="Revenue Sector" value={`$${sellerStats.total_earned.toLocaleString()}`} subValue={`${sellerStats.total_orders} Nodes Fulfilled`} color="emerald" />
           <MetricCard label="Node Density" value={sellerStats.active_gigs} subValue="Active Gigs Synchronized" color="blue" />
           <MetricCard label="Trust Score" value="98.2%" subValue="AI Protocols Verified" color="amber" />
        </div>

        {/* Command Center Detail Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 space-y-12">
              <section className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-12 shadow-2xl relative overflow-hidden group">
                 <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Operational Status</h3>
                       <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Mission Control Live</h2>
                       <p className="max-w-md text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60">
                          Sector-level telemetry active. All nodes are functioning with nominal throughput and zero-latency verification.
                       </p>
                    </div>
                    <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all">
                       Initialize Order Scan
                    </button>
                 </div>
                 {/* Visual Pulse */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[100px] rounded-full group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
              </section>

              {/* Activity Node */}
              <div className="bg-white/5 border border-white/5 rounded-[40px] p-12 text-center space-y-6">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-2xl text-xl">⏳</div>
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Activity Streams</h4>
                 <p className="text-[9px] font-black italic text-slate-700 uppercase tracking-[0.3em]">No operational anomalies detected in the current cycle.</p>
              </div>
           </div>

           <div className="lg:col-span-1">
              <aside className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-10 space-y-10 sticky top-12">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic border-b border-white/5 pb-4">Logic Constraints</h4>
                 <div className="space-y-8">
                    <ConstraintNode icon="🛡️" label="Identity" description="Verified Sentinel Active" status="LOCKED" />
                    <ConstraintNode icon="💳" label="Liquidity" description="Instant Settlement Protocol" status="ACTIVE" />
                    <ConstraintNode icon="🤖" label="Governance" description="AI Ranker Integration" status="SYNCED" />
                 </div>
                 <div className="pt-10 border-t border-white/5">
                    <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                       <span>Encrypted Node</span>
                       <span>0.003ms Latency</span>
                    </div>
                 </div>
              </aside>
           </div>
        </div>
     </div>
  );
}

function MetricCard({ label, value, subValue, color }: { label: string, value: any, subValue: string, color: string }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-600 to-indigo-500 shadow-indigo-500/10',
    emerald: 'from-emerald-600 to-emerald-500 shadow-emerald-500/10',
    blue: 'from-blue-600 to-blue-500 shadow-blue-500/10',
    amber: 'from-amber-600 to-amber-500 shadow-amber-500/10',
  };

  return (
    <div className={`p-8 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden group`}>
       <div className="relative z-10 space-y-4">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
          <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
          <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 italic opacity-60 leading-tight">{subValue}</p>
       </div>
       <div className={`absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br ${colors[color]} blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />
    </div>
  );
}

function ConstraintNode({ icon, label, description, status }: { icon: string, label: string, description: string, status: string }) {
   return (
      <div className="flex gap-6 group">
         <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300 shadow-lg">{icon}</div>
         <div className="space-y-1">
            <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
               <span className="text-[7px] font-black px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">{status}</span>
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter italic leading-none">{description}</p>
         </div>
      </div>
   );
}
