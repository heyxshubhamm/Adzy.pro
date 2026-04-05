"use client";
import React, { useState } from 'react';
import { 
  useGetAnalyticsDashboardQuery, 
  useGetSellerChurnQuery, 
  useGetBuyerLTVQuery, 
  useGetTopSellersAnalyticsQuery 
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge } from '@/components/common/IndustrialUI';

export default function AnalyticsIntelligence() {
  const [tab, setTab] = useState<"sellers" | "churn" | "ltv">("sellers");
  
  const { data: dashboard, isLoading: dashLoading } = useGetAnalyticsDashboardQuery();
  const { data: churn, isLoading: churnLoading } = useGetSellerChurnQuery({ days_inactive: 30 });
  const { data: ltv, isLoading: ltvLoading } = useGetBuyerLTVQuery();
  const { data: topSellers, isLoading: topSellersLoading } = useGetTopSellersAnalyticsQuery({ limit: 20 });

  if (dashLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse font-inter">Calibrating Economic Sensors...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter italic tracking-tight">Global GMV Telemetry & User Lifecycle Scoring</p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <StatusBadge status="LIVE" />
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Sync: {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      {/* KPI Sensor Array */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          label="GMV Today" 
          value={`$${(dashboard?.gmv_today ?? 0).toLocaleString()}`} 
          positive={(dashboard?.gmv_delta_pct ?? 0) >= 0} 
          delta={`${(dashboard?.gmv_delta_pct ?? 0).toFixed(1)}% vs prev`} 
        />
        <MetricCard label="Active Supply Chain" value={dashboard?.active_orders ?? 0} positive={true} />
        <MetricCard label="Escrow Conflicts" value={dashboard?.disputed ?? 0} negative={(dashboard?.disputed ?? 0) > 0} />
        <MetricCard label="Inflow (24h)" value={dashboard?.new_users ?? 0} delta="Protocol baseline: 12" />
      </div>

      {/* GMV Spark & Category Topology */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">GMV — 7D Execution Pulse</h3>
            <div className="h-48 flex items-end gap-2 px-2">
               {dashboard?.gmv_7d?.map((d: any, idx: number) => {
                 const max = Math.max(...dashboard.gmv_7d.map((x: any) => x.gmv), 1);
                 return (
                   <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                      <div 
                        className="w-full bg-slate-900/5 group-hover:bg-indigo-600 transition-all rounded-xl relative" 
                        style={{ height: `${(d.gmv / max) * 100}%` }}
                        title={`$${d.gmv}`}
                      >
                         <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] px-2 py-1 rounded font-black">
                            ${d.gmv}
                         </div>
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter transform -rotate-45">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                   </div>
                 );
               })}
            </div>
         </div>
         
         <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl border border-white/5 relative overflow-hidden">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6 relative z-10">Revenue by Category</h3>
            <div className="space-y-4 relative z-10">
               {dashboard?.by_category?.map((c: any) => (
                 <div key={c.name} className="flex justify-between items-center group">
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{c.name}</span>
                    <span className="text-xs font-black text-white">${c.revenue.toLocaleString()}</span>
                 </div>
               ))}
               {!dashboard?.by_category?.length && <div className="text-[10px] text-slate-500 italic">No telemetry detected.</div>}
            </div>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
         </div>
      </div>

      {/* Deep Intelligence Tabs */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-slate-50 bg-slate-50/50 p-2 gap-2">
           {(["sellers","churn","ltv"] as const).map(t => (
             <button 
                key={t} 
                onClick={() => setTab(t)}
                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
             >
                {t === 'sellers' ? 'Prime Sellers' : t === 'churn' ? 'Churn Risk Nodes' : 'Economic LTV'}
             </button>
           ))}
        </div>

        <div className="p-0">
           {tab === 'sellers' && (
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="p-5">#</th>
                    <th className="p-5">Entity</th>
                    <th className="p-5 text-right">Throughput</th>
                    <th className="p-5 text-right">Net Yield</th>
                    <th className="p-5 text-right">Trust Score</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {topSellersLoading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-300 animate-pulse uppercase font-black text-[10px]">Syncing Prime Data...</td></tr>
                  ) : topSellers?.map((s: any, idx: number) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="p-5 text-[10px] font-black text-slate-300 italic">{idx + 1}</td>
                       <td className="p-5 font-black text-slate-900 uppercase text-xs tracking-tight">{s.username}</td>
                       <td className="p-5 text-right font-bold text-slate-500 text-xs">{s.order_count} <span className="text-[9px] opacity-60">ops</span></td>
                       <td className="p-5 text-right font-black text-emerald-600 text-xs">${s.earnings.toLocaleString()}</td>
                       <td className="p-5 text-right">
                          <span className="text-xs font-black text-amber-500">★ {s.avg_rating?.toFixed(1) || '0.0'}</span>
                       </td>
                    </tr>
                  ))}
               </tbody>
             </table>
           )}

           {tab === 'churn' && (
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                     <th className="p-5">Entity</th>
                     <th className="p-5">Connectivity</th>
                     <th className="p-5">Last Transaction</th>
                     <th className="p-5 text-right">Dormancy Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {churnLoading ? (
                     <tr><td colSpan={4} className="p-12 text-center text-slate-300 animate-pulse uppercase font-black text-[10px]">Scanning Churn Nodes...</td></tr>
                   ) : churn?.map((s: any) => (
                     <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 font-black text-slate-900 uppercase text-xs tracking-tight">{s.username}</td>
                        <td className="p-5 text-[10px] text-slate-400 font-mono italic">{s.email}</td>
                        <td className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.last_order ? new Date(s.last_order).toLocaleDateString() : 'NEVER'}</td>
                        <td className="p-5 text-right">
                           <SeverityBadge 
                              level={s.days_inactive > 60 ? 1 : 2} 
                              text={`${s.days_inactive === 999 ? '∞' : s.days_inactive}d Inactive`} 
                           />
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
           )}

           {tab === 'ltv' && (
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                     <th className="p-5">Entity</th>
                     <th className="p-5 text-right">Throughput</th>
                     <th className="p-5 text-right">Lifetime Economic Value</th>
                     <th className="p-5 text-right">Last Transaction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {ltvLoading ? (
                     <tr><td colSpan={4} className="p-12 text-center text-slate-300 animate-pulse uppercase font-black text-[10px]">Calculating Economic LTV...</td></tr>
                   ) : ltv?.map((b: any) => (
                     <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 font-black text-slate-900 uppercase text-xs tracking-tight">{b.username}</td>
                        <td className="p-5 text-right font-bold text-slate-500 text-xs">{b.order_count} <span className="text-[9px] opacity-60">ops</span></td>
                        <td className="p-5 text-right font-black text-indigo-600 text-xs">${b.ltv.toLocaleString()}</td>
                        <td className="p-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(b.last_order).toLocaleDateString()}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
           )}
        </div>
      </div>
    </div>
  );
}
