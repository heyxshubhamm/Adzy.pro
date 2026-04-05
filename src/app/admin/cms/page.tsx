"use client";
import React, { useState } from 'react';
import { 
  useGetCMSPagesQuery, 
  useUpdateCMSPageMutation, 
  useCreateCMSPageMutation,
  useDeleteCMSPageMutation,
  useGetSitemapEntriesQuery,
  useCreateSitemapEntryMutation,
  useDeleteSitemapEntryMutation
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge, ConfirmModal } from '@/components/common/IndustrialUI';

export default function ContentCommand() {
  const [tab, setTab] = useState<"pages" | "sitemap">("pages");
  const [editingPage, setEditingPage] = useState<any>(null);
  
  const { data: pages, isLoading: pagesLoading } = useGetCMSPagesQuery();
  const { data: sitemap, isLoading: sitemapLoading } = useGetSitemapEntriesQuery();

  const [updatePage] = useUpdateCMSPageMutation();
  const [deletePage] = useDeleteCMSPageMutation();
  const [deleteSitemap] = useDeleteSitemapEntryMutation();

  if (pagesLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse font-inter">Synchronizing Content Repositories...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Content Command</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter italic tracking-tight">Static Governance & SEO Topology Mapping</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => setEditingPage({ title: '', slug: '', content: '', is_published: true })}
             className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
           >
             + Global Node
           </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl w-fit border border-slate-100">
        {(["pages","sitemap"] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setTab(t)} 
            className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            { t === "pages" ? "Universal Pages" : "Sitemap Controls" }
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                    <th className="p-5">Status</th>
                    <th className="p-5">Content Node</th>
                    <th className="p-5">SEO Slug</th>
                    <th className="p-5">Last Synced</th>
                    <th className="p-5 text-center">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {pages?.map(page => (
                    <tr key={page.id} className="hover:bg-slate-50/30 transition-colors group">
                       <td className="p-5">
                          <StatusBadge status={page.is_published ? 'PUBLISHED' : 'DRAFT'} level={page.is_published ? 'success' : 'warning'} />
                       </td>
                       <td className="p-5 font-black text-slate-900 uppercase text-xs tracking-tight group-hover:text-indigo-600 transition-colors">{page.title}</td>
                       <td className="p-5 text-[10px] text-slate-400 font-mono italic">/{page.slug}</td>
                       <td className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(page.updated_at).toLocaleString()}</td>
                       <td className="p-5">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => setEditingPage(page)}
                                className="px-2 py-1 bg-white text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 hover:bg-slate-50"
                             >
                                Edit
                             </button>
                             <button 
                                onClick={() => { if(confirm("Permanently delete content node?")) deletePage(page.id); }}
                                className="px-2 py-1 bg-white text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-50"
                             >
                                Delete
                             </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {tab === "sitemap" && (
        <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <tr>
                    <th className="p-5">Index URL</th>
                    <th className="p-5">Frequency</th>
                    <th className="p-5">Weight</th>
                    <th className="p-5 text-center">Status</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {sitemapLoading ? (
                   <tr><td colSpan={4} className="p-12 text-center text-slate-300 animate-pulse uppercase font-black text-[10px]">Orchestrating Sitemap...</td></tr>
                 ) : sitemap?.map((entry: any) => (
                    <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                       <td className="p-5 text-[10px] font-black text-slate-900 uppercase tracking-tight">{entry.url}</td>
                       <td className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{entry.changefreq}</td>
                       <td className="p-5">
                          <div className="flex items-center gap-2">
                             <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${entry.priority * 100}%` }} />
                             </div>
                             <span className="text-[9px] font-black text-slate-500">{entry.priority}</span>
                          </div>
                       </td>
                       <td className="p-5 text-center">
                          <button 
                            onClick={() => deleteSitemap(entry.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          >
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                       </td>
                    </tr>
                 ))}
                 {!sitemap?.length && <tr><td colSpan={4} className="p-12 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-widest">No manual sitemap entries found.</td></tr>}
              </tbody>
           </table>
        </div>
      )}

      {editingPage && (
        <CMSPageEditor 
          page={editingPage} 
          onClose={() => setEditingPage(null)} 
        />
      )}
    </div>
  );
}

function CMSPageEditor({ page, onClose }: { page: any, onClose: () => void }) {
  const [form, setForm] = useState(page);
  const [updatePage] = useUpdateCMSPageMutation();
  const [createPage] = useCreateCMSPageMutation();

  const handleSave = async () => {
    if (page.id) {
       await updatePage({ id: page.id, ...form }).unwrap();
    } else {
       await createPage(form).unwrap();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-100 h-[85vh] flex flex-col animate-in zoom-in-95 duration-500 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
           <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{page.id ? 'Refine Content Node' : 'Initialize Global Node'}</h2>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1 opacity-60">SEO & Markdown Core Configuration</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Page Title</label>
                    <input 
                       value={form.title} 
                       onChange={e => setForm({...form, title: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">SEO Slug</label>
                    <input 
                       value={form.slug} 
                       onChange={e => setForm({...form, slug: e.target.value})}
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-mono italic focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    />
                 </div>
              </div>

              <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 space-y-4">
                 <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Publication Status</h3>
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Status</span>
                    <div 
                       onClick={() => setForm({...form, is_published: !form.is_published})}
                       className={`w-10 h-5 rounded-full cursor-pointer transition-all relative ${form.is_published ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-200'}`}
                    >
                       <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${form.is_published ? 'translate-x-5' : ''}`} />
                    </div>
                 </div>
                 <div className="text-[8px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter italic">
                    Unpublishing will hide this content from all public index nodes instantly.
                 </div>
              </div>
           </div>

           <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Industrial Markdown Content</label>
              <textarea 
                 value={form.content} 
                 onChange={e => setForm({...form, content: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs font-medium min-h-[300px] focus:ring-2 focus:ring-slate-900 outline-none transition-all font-mono"
              />
           </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Schema Version: v2.1 (Industrial CMS)</div>
           <div className="flex gap-4">
              <button 
                 onClick={onClose}
                 className="px-6 py-2.5 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-all"
              >
                 Cancel
              </button>
              <button 
                 onClick={handleSave}
                 className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 rounded-xl transition-all shadow-xl shadow-slate-900/10"
              >
                 Deploy Content
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
