"use client";
import React from 'react';
import { 
  useGetHomepageSectionsQuery, 
  useUpdateHomepageSectionMutation, 
  useReorderHomepageSectionsMutation,
  useSyncHomepageMutation
} from '@/store/api';
import { MetricCard } from '@/components/common/IndustrialUI';
import { ConfirmModal } from '@/components/Admin/ConfirmModal';

export default function AdminHomepagePage() {
  const { data: sections, isLoading } = useGetHomepageSectionsQuery();
  const [updateSection] = useUpdateHomepageSectionMutation();
  const [reorderSections] = useReorderHomepageSectionsMutation();
  const [syncHomepage, { isLoading: isSyncing }] = useSyncHomepageMutation();

  const handleToggle = async (id: string, current: boolean) => {
    await updateSection({ id, is_visible: !current });
  };

  const handleMove = async (idx: number, direction: 'up' | 'down') => {
    if (!sections) return;
    const newSections = [...sections];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
    await reorderSections(newSections.map(s => s.id));
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Initializing Layout Engine...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Homepage Builder</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Dynamic Layout & Curation Engine</p>
        </div>
        <button 
          onClick={() => syncHomepage()}
          disabled={isSyncing}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
        >
          {isSyncing ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "⚡"}
          {isSyncing ? "Syncing..." : "Force Cache Sync"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Active Sections" value={sections?.filter(s => s.is_visible).length || 0} positive />
        <MetricCard label="Hidden Sections" value={sections?.filter(s => !s.is_visible).length || 0} />
        <MetricCard label="Last Sync" value="Just Now" delta="Next.js ISR Active" />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section Hierarchy</h2>
          <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">AUTO-REVALIDATE ENABLED</span>
        </div>

        <div className="divide-y divide-slate-50">
          {sections?.map((section, idx) => (
            <div key={section.id} className={`flex items-center gap-6 p-6 transition-all group ${!section.is_visible ? 'bg-slate-50/30 grayscale' : 'hover:bg-slate-50/50'}`}>
              {/* Controls */}
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => handleMove(idx, 'up')} 
                  disabled={idx === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-0 transition-all text-slate-400 hover:text-slate-900"
                >
                  ▲
                </button>
                <button 
                  onClick={() => handleMove(idx, 'down')} 
                  disabled={idx === (sections.length - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-0 transition-all text-slate-400 hover:text-slate-900"
                >
                  ▼
                </button>
              </div>

              {/* Order */}
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-xl shadow-slate-900/20">
                {idx + 1}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  {section.config?.name || section.id}
                  <span className="text-[9px] font-black uppercase tracking-tighter text-slate-300">ID: {section.id}</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Type: <span className="text-indigo-600 uppercase font-black tracking-tighter">{section.id.split('_')[0]}</span>
                </p>
              </div>

              {/* Status & Toggle */}
              <div className="flex items-center gap-6">
                 <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${section.is_visible ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                   {section.is_visible ? 'Visible' : 'Hidden'}
                 </div>
                 
                 <button 
                  onClick={() => handleToggle(section.id, section.is_visible)}
                  className={`w-12 h-6 rounded-full relative transition-all duration-300 ${section.is_visible ? 'bg-slate-900' : 'bg-slate-200'}`}
                 >
                   <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${section.is_visible ? 'left-7' : 'left-1'}`} />
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Industrial Guidance */}
      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-start gap-4">
        <span className="text-xl">💡</span>
        <div className="text-xs text-indigo-900 font-medium leading-relaxed">
          <strong>Industrial Revalidation:</strong> Any changes made here are instantly broadcasted to the Next.js cache nodes. If the live site doesn't update, use the <strong>Force Cache Sync</strong> button to trigger a manual purge across the cluster.
        </div>
      </div>
    </div>
  );
}
