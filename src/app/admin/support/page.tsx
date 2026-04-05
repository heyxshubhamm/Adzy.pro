"use client";
import React from 'react';
import { 
  useGetSupportTicketsQuery, 
  useGetSLABreachesQuery, 
  useAssignTicketMutation 
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge } from '@/components/common/IndustrialUI';

export default function SupportDashboard() {
  const { data: tickets, isLoading: ticketsLoading } = useGetSupportTicketsQuery({});
  const { data: breaches, isLoading: breachesLoading } = useGetSLABreachesQuery();
  const [assignTicket] = useAssignTicketMutation();

  const handleAssign = async (id: string) => {
    await assignTicket(id);
  };

  if (ticketsLoading || breachesLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Synchronizing Support Nodes...</div>;

  const stats = {
    active: tickets?.length || 0,
    breaches: breaches?.length || 0,
    breachRate: tickets?.length ? ((breaches?.length || 0) / tickets.length * 100).toFixed(1) : 0
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Support Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">SLA-Driven Resolution & Dispute Control</p>
        </div>
      </div>

      {stats.breaches > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
             <span className="text-xl">🚨</span>
             <div>
               <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Critical SLA Breaches Detected ({stats.breaches})</h3>
               <p className="text-xs text-rose-700 font-medium italic">Immediate administrative intervention required for overdue disputes.</p>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Active Tickets" value={stats.active} />
        <MetricCard label="SLA Breaches" value={stats.breaches} negative={stats.breaches > 0} />
        <MetricCard label="Breach Rate" value={`${stats.breachRate}%`} positive={Number(stats.breachRate) < 5} />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Support Queue</h2>
        </div>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-50 bg-slate-50/20">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket #</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tickets?.map(ticket => (
              <tr key={ticket.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="p-6 text-[10px] font-black text-slate-400 tracking-tighter uppercase">{ticket.id.slice(0, 8)}</td>
                <td className="p-6">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{ticket.subject}</div>
                  <div className="text-[9px] text-slate-400 uppercase font-black tracking-tight mt-0.5">UID: {ticket.user_id?.slice(0, 8)}</div>
                </td>
                <td className="p-6">
                  <SeverityBadge level={ticket.priority === 'urgent' ? 5 : ticket.priority === 'high' ? 3 : 1} />
                </td>
                <td className="p-6">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="p-6 text-xs font-medium text-slate-500 italic">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="p-6">
                   {ticket.status === 'open' && (
                     <button 
                      onClick={() => handleAssign(ticket.id)}
                      className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                     >
                       Assign Me
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {tickets?.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            Zero queue maintenance. All systems nominal.
          </div>
        )}
      </div>
    </div>
  );
}
