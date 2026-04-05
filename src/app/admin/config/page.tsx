"use client";
import React, { useState } from 'react';
import { 
  useGetConfigsQuery, 
  useUpdateConfigMutation, 
  useGetFlagsQuery, 
  useUpdateFlagMutation,
  useGetAuditLogsQuery
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge, ConfirmModal } from '@/components/common/IndustrialUI';

const CATEGORIES = ["fees", "limits", "features", "content", "seo"];
const CAT_LABELS: Record<string, string> = {
  fees: "Fees & pricing", limits: "Platform limits",
  features: "Feature toggles", content: "Content & copy", seo: "SEO defaults",
};

export default function UniversalConfiguration() {
  const [tab, setTab] = useState<"config" | "flags" | "audit">("config");
  const [category, setCategory] = useState("fees");
  
  const { data: configs, isLoading: configLoading } = useGetConfigsQuery({ category });
  const { data: flags, isLoading: flagsLoading } = useGetFlagsQuery();
  const { data: logs, isLoading: logsLoading } = useGetAuditLogsQuery({ limit: 50 });

  const [updateConfig] = useUpdateConfigMutation();
  const [updateFlag] = useUpdateFlagMutation();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Universal Configuration</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter italic tracking-tight">Marketplace Core Protocols & Operational Logic</p>
        </div>
        <div className="flex gap-4">
           <StatusBadge status="LIVE" level="success" />
        </div>
      </div>

      <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl w-fit border border-slate-100">
        {(["config","flags","audit"] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            { t === "config" ? "Core Settings" : t === "flags" ? "Feature Flags" : "Audit Chain" }
          </button>
        ))}
      </div>

      {tab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="space-y-1">
             {CATEGORIES.map(cat => (
               <button 
                key={cat} 
                onClick={() => setCategory(cat)}
                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${category === cat ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
               >
                 {CAT_LABELS[cat]}
               </button>
             ))}
           </div>
           
           <div className="md:col-span-3 space-y-4">
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm divide-y divide-slate-50">
                 {configLoading ? (
                   <div className="p-12 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">Syncing Core Protocols...</div>
                 ) : configs?.length === 0 ? (
                   <div className="p-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest italic">Zero configuration nodes detected. Platform defaults active.</div>
                 ) : configs?.map(cfg => (
                    <ConfigRow key={cfg.key} config={cfg} onSave={(val) => updateConfig({ key: cfg.key, value: val })} />
                 ))}
              </div>
           </div>
        </div>
      )}

      {tab === "flags" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {flagsLoading ? (
              <div className="col-span-full p-12 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">Initializing Feature Vectors...</div>
           ) : flags?.map(flag => (
              <FeatureFlagNode key={flag.key} flag={flag} onUpdate={(patch) => updateFlag({ key: flag.key, ...patch })} />
           ))}
        </div>
      )}

      {tab === "audit" && (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                    <th className="p-5">Time/Admin</th>
                    <th className="p-5">Action Node</th>
                    <th className="p-5">Integrity Vector</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {logsLoading ? (
                   <tr><td className="p-12 text-center text-slate-300 font-black uppercase tracking-widest animate-pulse">Synchronizing Audit Logs...</td></tr>
                 ) : logs?.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                       <td className="p-5">
                          <div className="text-[10px] font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight mb-0.5">{new Date(log.created_at).toLocaleString()}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">ID: {log.admin_id.slice(0, 8)}</div>
                       </td>
                       <td className="p-5">
                          <span className="px-2 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg shadow-xl shadow-slate-900/10 tracking-widest">
                             {log.action}
                          </span>
                       </td>
                       <td className="p-5 max-w-[200px]">
                          <div className="text-[9px] text-slate-400 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                             <span className="text-rose-500 font-bold uppercase mr-1">OLD:</span> {JSON.stringify(log.old_value)}
                          </div>
                          <div className="text-[9px] text-slate-900 font-mono overflow-hidden text-ellipsis whitespace-nowrap mt-1">
                             <span className="text-emerald-500 font-bold uppercase mr-1">NEW:</span> {JSON.stringify(log.new_value)}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}

function ConfigRow({ config, onSave }: { config: any, onSave: (val: any) => void }) {
   const [val, setVal] = useState(config.value);
   const isDirty = JSON.stringify(val) !== JSON.stringify(config.value);

   return (
     <div className="p-6 flex items-center justify-between group">
        <div className="flex-1">
           <div className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{config.label}</div>
           <div className="text-[9px] text-slate-400 font-mono italic mt-0.5">Key: {config.key}</div>
        </div>
        
        <div className="flex items-center gap-4">
           {config.type === "bool" ? (
             <div 
              onClick={() => { setVal(!val); onSave(!val); }}
              className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${val ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}
             >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${val ? 'translate-x-5' : ''}`} />
             </div>
           ) : (
             <div className="flex gap-2">
                <input 
                  type={config.type === "number" ? "number" : "text"}
                  value={val}
                  onChange={e => setVal(config.type === "number" ? Number(e.target.value) : e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-slate-900 transition-all w-32"
                />
                <button 
                  disabled={!isDirty}
                  onClick={() => onSave(val)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${isDirty ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'bg-slate-50 text-slate-300'}`}
                >
                   Save
                </button>
             </div>
           )}
        </div>
     </div>
   );
}

function FeatureFlagNode({ flag, onUpdate }: { flag: any, onUpdate: (patch: any) => void }) {
   return (
      <div className={`p-6 rounded-3xl border border-slate-100 transition-all hover:shadow-xl hover:shadow-slate-200/50 group ${flag.is_enabled ? 'bg-white' : 'bg-slate-50/50 grayscale opacity-60'}`}>
         <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-500">🧪</div>
            <div 
              onClick={() => onUpdate({ is_enabled: !flag.is_enabled })}
              className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${flag.is_enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}
            >
               <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${flag.is_enabled ? 'translate-x-5' : ''}`} />
            </div>
         </div>
         
         <div className="mb-6">
            <div className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{flag.label}</div>
            <div className="text-[9px] text-slate-400 font-mono italic mt-0.5">Key: {flag.key}</div>
         </div>

         {flag.is_enabled && (
            <div className="space-y-4 animate-in slide-in-from-top-2">
               <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Global Rollout</span>
                  <span>{flag.rollout_pct}%</span>
               </div>
               <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${flag.rollout_pct}%` }} />
               </div>
               <input 
                  type="range" min="0" max="100" value={flag.rollout_pct}
                  onChange={e => onUpdate({ rollout_pct: Number(e.target.value) })}
                  className="w-full accent-slate-900 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none"
               />
            </div>
         )}
      </div>
   );
}
