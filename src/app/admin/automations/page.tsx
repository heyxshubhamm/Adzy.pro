"use client";
import React, { useState } from 'react';
import { 
  useGetAutomationsQuery, 
  useUpdateAutomationMutation, 
  useDeleteAutomationMutation,
  useCreateAutomationMutation
} from '@/store/api';
import { MetricCard, StatusBadge, ConfirmModal } from '@/components/common/IndustrialUI';

export default function AutomationCommand() {
  const [activeModal, setActiveModal] = useState<any>(null); // "CREATE" or rule object
  const { data: rules, isLoading } = useGetAutomationsQuery();
  const [updateRule] = useUpdateAutomationMutation();
  const [deleteRule] = useDeleteAutomationMutation();

  const toggleStatus = async (rule: any) => {
    await updateRule({ id: rule.id, is_active: !rule.is_active });
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse font-inter">Synchronizing Automation Micro-Kernels...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Automation Command</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter italic tracking-tight">No-Code AI Workflows & Autonomous Ops</p>
        </div>
        <button 
          onClick={() => setActiveModal("CREATE")}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
        >
          + New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Active Workflows" value={rules?.filter(r => r.is_active).length || 0} positive={true} />
        <MetricCard label="Total Executions" value={rules?.reduce((acc, r) => acc + (r.run_count || 0), 0) || 0} />
        <MetricCard label="Est. Hours Saved" value={(rules?.reduce((acc, r) => acc + (r.run_count || 0), 0) || 0) * 0.5} delta="+12% MoM" positive={true} />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-6">Status</th>
              <th className="p-6">Workflow Pattern</th>
              <th className="p-6 text-center">Trigger</th>
              <th className="p-6 text-center">Execution Logic</th>
              <th className="p-6 text-right">Telemetry</th>
              <th className="p-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-neutral-800">
            {rules?.map(rule => {
              const isRecentlyActive = rule.last_run_at && (new Date().getTime() - new Date(rule.last_run_at).getTime() < 300000);
              return (
                <tr key={rule.id} className="group hover:bg-slate-50/30 transition-colors">
                  <td className="p-6">
                    <div 
                      onClick={() => toggleStatus(rule)}
                      className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${rule.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${rule.is_active ? 'translate-x-5' : ''}`} />
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{rule.name}</div>
                    <div className="text-[9px] text-slate-400 font-black uppercase mt-0.5 tracking-widest">ID: {rule.id.slice(0, 8)}</div>
                  </td>
                  <td className="p-6 text-center">
                     <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-lg border border-amber-100/50">
                        {rule.trigger.event}
                     </span>
                  </td>
                  <td className="p-6 text-center">
                     <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-lg border border-indigo-100/50 shadow-sm shadow-indigo-100">
                        {rule.action.type}
                     </span>
                  </td>
                  <td className="p-6 text-right">
                     <div className="text-xs font-bold text-slate-900">{rule.run_count || 0} <span className="text-[9px] text-slate-400 font-medium">runs</span></div>
                     <div className="text-[9px] text-slate-400 italic">Last: {rule.last_run_at ? new Date(rule.last_run_at).toLocaleDateString() : 'Never'}</div>
                     {isRecentlyActive && <div className="text-[8px] text-emerald-500 font-bold uppercase animate-pulse mt-0.5">Execution Active</div>}
                  </td>
                  <td className="p-6 text-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { if(confirm("Confirm deletion of this automation workflow?")) deleteRule(rule.id); }}
                        className="p-2 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors shadow-sm"
                        title="Delete Rule"
                      >
                         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {rules?.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            Zero automation workflows detected. Marketplace operations manual.
          </div>
        )}
      </div>

      {activeModal === "CREATE" && (
        <AutomationModal 
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}

function AutomationModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [event, setEvent] = useState("order.disputed");
  const [hours, setHours] = useState(48);
  const [actionType, setActionType] = useState("notify_admin");
  const [actionArg, setActionArg] = useState("dispute_escalate");

  const [createRule] = useCreateAutomationMutation();

  const submit = async () => {
    if (!name) return;
    const payload = {
      name,
      trigger: {
        event: event,
        condition: event === "order.disputed" ? { hours_open: hours } : { days: hours }
      },
      action: {
        type: actionType,
        template: actionType === "notify_admin" || actionType === "send_email" ? actionArg : undefined,
        status: actionType === "force_order_status" ? actionArg : undefined
      },
      is_active: true
    };
    await createRule(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
           <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Workflow Builder</h2>
           <p className="text-slate-500 text-sm font-medium mt-1">Design autonomous marketplace logic nodes.</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Workflow Name</label>
            <input 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Escalate dormant disputes..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
               <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4">1. Neural Trigger</h3>
               <select 
                value={event}
                onChange={e => setEvent(e.target.value)}
                className="w-full bg-white border border-amber-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-amber-500"
               >
                 <option value="order.disputed">Order Disputed</option>
                 <option value="seller.inactive">Seller Inactivity</option>
               </select>
               <div className="mt-4 flex items-center gap-2">
                 <span className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest">Wait</span>
                 <input type="number" value={hours} onChange={e => setHours(Number(e.target.value))} className="w-12 bg-white border border-amber-100 rounded-lg px-2 py-1 text-[10px] font-bold outline-none" />
                 <span className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest">{event==='order.disputed'?'HRS':'DAYS'}</span>
               </div>
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
               <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">2. Autonomous Action</h3>
               <select 
                value={actionType}
                onChange={e => setActionType(e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
               >
                 <option value="notify_admin">Send Admin Alert</option>
                 <option value="send_email">Dispatch Email</option>
                 <option value="force_order_status">Override Order</option>
               </select>
               <input 
                value={actionArg}
                onChange={e => setActionArg(e.target.value)}
                placeholder="Target Pattern..."
                className="w-full mt-4 bg-white border border-indigo-100 rounded-lg px-3 py-2 text-[10px] font-bold outline-none placeholder:text-slate-300"
               />
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 flex gap-4 justify-end">
          <button onClick={onClose} className="px-6 py-2.5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
          <button 
            onClick={submit}
            className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 rounded-xl transition-all shadow-xl shadow-slate-900/10"
          >
            Deploy Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
