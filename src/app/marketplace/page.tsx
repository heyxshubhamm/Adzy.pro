"use client";
import React, { Suspense, useState } from "react";
import GigGrid from "@/components/Marketplace/GigGrid";
import { useGetGigsQuery, useGetCategoriesQuery } from "@/store/api";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/common/IndustrialUI";

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 animate-pulse" />}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  
  const { data: gigs, isLoading: gigsLoading } = useGetGigsQuery(q);
  const { data: categories, isLoading: catsLoading } = useGetCategoriesQuery();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter logic for localized state if needed, but primary is server-side
  const displayGigs = gigs || [];

  return (
    <div className="min-h-screen bg-slate-50/30 font-inter">
      {/* High-Fidelity Hero Section */}
      <div className="bg-slate-950 pt-32 pb-24 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 text-center lg:text-left">
           <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-xl">
              <StatusBadge status="LIVE" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Supply Chain Active</span>
           </div>
           
           <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase leading-none mb-6">
              Expert <br/> <span className="text-indigo-400">Marketplace</span>
           </h1>
           <p className="max-w-xl text-slate-400 text-sm font-medium leading-relaxed opacity-80">
              Access the world's most advanced digital service nodes. High-performance throughput, zero-latency delivery, and AI-verified trust scores.
           </p>
        </div>
        
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[130px] rounded-full -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full -ml-40 -mb-40" />
      </div>

      <div className="max-w-7xl mx-auto p-6 lg:p-12 -mt-12 relative z-20">
        {/* Marketplace Orchestration Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          
          {/* Taxonomy Explorer */}
          <aside className="lg:col-span-1 space-y-8">
             <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Category Topology</h3>
                <div className="space-y-2">
                   {catsLoading ? (
                     <div className="space-y-3">
                        {[...Array(8)].map((_, i) => <div key={i} className="h-8 bg-slate-50 rounded-xl animate-pulse" />)}
                     </div>
                   ) : categories?.map((cat: any) => (
                      <div key={cat.id} className="group">
                        <button 
                           onClick={() => setActiveCategory(cat.slug === activeCategory ? null : cat.slug)}
                           className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-tight ${activeCategory === cat.slug ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                        >
                           <span>{cat.name}</span>
                           <span className="opacity-40 text-[9px]">{cat.gig_count || 0}</span>
                        </button>
                        {activeCategory === cat.slug && cat.children && (
                          <div className="mt-2 ml-4 space-y-1 animate-in slide-in-from-top-2 duration-300">
                             {cat.children.map((sub: any) => (
                               <button 
                                 key={sub.id}
                                 className="w-full text-left p-2 rounded-lg text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all uppercase tracking-tighter"
                               >
                                  {sub.name}
                               </button>
                             ))}
                          </div>
                        )}
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-white/5 relative overflow-hidden group">
                <h4 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-4 italic">Supply Chain Health</h4>
                <div className="relative z-10 flex items-end gap-1 h-12">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className="flex-1 bg-emerald-500/20 group-hover:bg-emerald-500/40 transition-all rounded-sm" style={{ height: `${20 + Math.random() * 80}%` }} />
                   ))}
                </div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-4 italic opacity-60">Global Node Throughput: 99.9%</p>
             </div>
          </aside>

          {/* Service Surface */}
          <main className="lg:col-span-3 space-y-12">
            <div className="flex justify-between items-center bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
               <div className="flex gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic pt-1">Browsing:</span>
                  <div className="flex flex-wrap gap-2">
                     <span className="px-3 py-1 bg-slate-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Global Feed</span>
                     {activeCategory && <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">{activeCategory}</span>}
                  </div>
               </div>
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{displayGigs.length} Nodes Found</div>
            </div>

            {gigsLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100" />
                 ))}
               </div>
            ) : (
               <GigGrid gigs={displayGigs} />
            )}

            {/* Pagination / Load More Industrial Node */}
            <div className="flex justify-center pt-12 border-t border-slate-100">
               <button className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/10">
                  Initialize Deep Load
               </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
