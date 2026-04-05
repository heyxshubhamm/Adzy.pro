"use client";
import React from 'react';
import { useGetDashboardQuery, useGetAuditLogsQuery } from '@/store/api';
import { MetricCard } from '@/components/common/IndustrialUI';
import { useDashboardWebSocket } from '@/hooks/useDashboardWebSocket';

export default function MissionControl() {
  const { status: wsStatus } = useDashboardWebSocket();
  const { data: metrics, isLoading: metricsLoading } = useGetDashboardQuery(undefined, {
    pollingInterval: 30000 
  });
  const { data: logs, isLoading: logsLoading } = useGetAuditLogsQuery({ limit: 6 });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Mission Control</h1>
          <p className="text-slate-500 text-sm mt-1 font-black uppercase tracking-widest opacity-60">Universal Marketplace Intelligence Node</p>
        </div>
        <div className="flex gap-3">
           <div className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-all ${wsStatus === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-lg shadow-emerald-500/10' : 'bg-rose-50 text-rose-600 border-rose-100 shadow-lg shadow-rose-500/10'}`}>
             <span className={`w-2 h-2 rounded-full ${wsStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
             {wsStatus === 'open' ? 'Neural Link Active' : 'Neural Link Lost'}
           </div>
        </div>
      </div>

      {/* Industrial Metrics Sensor Array */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Global Volume" value={`$${(metrics?.volume_today ?? 0).toLocaleString()}`} positive={true} delta="+14.2% MoM" />
        <MetricCard label="Operational Users" value={(metrics?.total_users ?? 0).toLocaleString()} delta={`${metrics?.new_users_today ?? 0} new today`} />
        <MetricCard label="Risk Heuristics" value={metrics?.open_fraud_alerts ?? 0} negative={(metrics?.open_fraud_alerts ?? 0) > 0} delta="Real-time scan active" />
        <MetricCard label="Asset Moderation" value={metrics?.pending_gigs ?? 0} positive={metrics?.pending_gigs === 0} delta="SLA: 12m" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Audit Trace */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex justify-between items-center px-1">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Live Audit Trace</h2>
             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded">Immutable</span>
           </div>
           <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
             <table className="w-full text-left border-collapse">
               <tbody className="divide-y divide-slate-50">
                 {logsLoading ? (
                   <tr><td className="p-12 text-center text-slate-300 text-xs font-black uppercase tracking-widest animate-pulse">Scanning Audit Chain...</td></tr>
                 ) : logs?.slice(0, 6).map(log => (
                   <tr key={log.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="p-5">
                       <div className="flex items-center gap-4">
                         <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                           {log.action.includes('user') ? '👤' : log.action.includes('gig') ? '📦' : log.action.includes('payment') ? '💳' : '⚙️'}
                         </div>
                         <div>
                           <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{log.action.replace('.', ' ')}</div>
                           <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Target: {log.target_id.slice(0, 12)}</div>
                         </div>
                       </div>
                     </td>
                     <td className="p-5 text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase">{new Date(log.created_at).toLocaleTimeString()}</div>
                        <div className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Admin Node {log.admin_id.slice(0, 4)}</div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* System Topology Node */}
        <div className="space-y-4">
           <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-1">System Topology</h2>
           <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden h-[360px] border border-white/5 shadow-2xl">
              <div className="relative z-10 space-y-6">
                 <TopologyItem label="API Core v2" status={wsStatus === 'open' ? 'active' : 'reconnecting'} />
                 <TopologyItem label="Fraud ML Engine" status="active" />
                 <TopologyItem label="Worker Cluster" status="active" />
                 <TopologyItem label="PostgreSQL Node" status="active" />
                 <TopologyItem label="Redis Cache" status="active" />
              </div>
              
              {/* Visual Effects */}
              <div className="absolute inset-0 opacity-20">
                 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent animate-pulse" />
              </div>
              <div className="absolute bottom-6 left-8 right-8 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Health Index</div>
                 <div className="text-xl font-black text-emerald-400 tracking-tighter">99.98%</div>
              </div>
           </div>
        </div>
      </div>

      {/* Control Surface Expansion */}
      <div className="p-10 bg-indigo-600 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-xl">
               <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">Industrial Integrity Active</h3>
               <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                  Every administrative node on Adzy.pro is cryptographically linked to the immutable audit chain. 
                  Real-time ML heuristics are scanning for high-frequency anomalies across all transaction nodes.
               </p>
            </div>
            <div className="flex gap-4">
               <div className="px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Verification</div>
                  <div className="text-lg font-black text-emerald-400">SECURE</div>
               </div>
               <div className="px-6 py-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Latency</div>
                  <div className="text-lg font-black text-sky-400">12ms</div>
               </div>
            </div>
         </div>
         {/* Abstract Accents */}
         <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 blur-[80px] rounded-full" />
      </div>
    </div>
  );
}

function TopologyItem({ label, status }: { label: string; status: 'active' | 'reconnecting' | 'failed' }) {
  const colors = {
    active: 'bg-emerald-400 text-emerald-400',
    reconnecting: 'bg-amber-400 text-amber-400 font-pulse',
    failed: 'bg-rose-400 text-rose-400'
  };
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
         <div className={`w-1.5 h-1.5 rounded-full ${colors[status]} shadow-[0_0_8px_currentColor]`} />
         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
      </div>
      <div className={`text-[8px] font-black uppercase tracking-tighter ${colors[status]} opacity-60`}>{status}</div>
    </div>
  );
}
