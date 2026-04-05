"use client";
import React, { Suspense, useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SearchResults } from "@/components/search/SearchResults";
import { useSearchParams } from "next/navigation";
import { useGetSearchGigsQuery } from "@/store/api";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 animate-pulse" />}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const min_price = searchParams.get("min_price") || undefined;
  const max_price = searchParams.get("max_price") || undefined;
  
  const { data, isLoading } = useGetSearchGigsQuery({
    q,
    category,
    min_price: min_price ? Number(min_price) : undefined,
    max_price: max_price ? Number(max_price) : undefined,
  });

  return (
    <div className="min-h-screen bg-slate-50/30 font-inter">
      {/* High-Fidelity Header Section */}
      <div className="bg-slate-950 border-b border-white/5 pt-32 pb-16 px-6 lg:px-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 space-y-8 text-center lg:text-left lg:flex lg:justify-between lg:items-end">
           <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase leading-none">
                 Marketplace Discovery
              </h1>
              <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] opacity-60">
                 Found {data?.total || 0} Expert Nodes in <span className="text-indigo-400">Adzy Intelligence</span>
              </p>
           </div>
           
           <div className="w-full lg:max-w-xl">
             <SearchBar initialQuery={q} />
           </div>
        </div>
        
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full -ml-32 -mb-32" />
      </div>

      {/* Industrial Grid Layout */}
      <div className="max-w-7xl mx-auto p-6 lg:p-12">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Taxonomy & Filter Node */}
          <aside className="w-full lg:w-72 space-y-8 flex-shrink-0">
             <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Filter Protocols</h3>
                <SearchFilters facets={data?.facets} />
             </div>
             
             {/* Dynamic Network Status Card */}
             <div className="bg-slate-900 rounded-[32px] p-8 shadow-2xl border border-white/5">
                <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Neural Analytics</h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold">Execution Latency</span>
                      <span className="font-mono text-white">{data?.took_ms || 42}ms</span>
                   </div>
                   <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-bold">Sync Status</span>
                      <span className="text-emerald-500 uppercase font-black">Live</span>
                   </div>
                </div>
             </div>
          </aside>

          {/* Result Surface */}
          <main className="flex-1 space-y-12">
            {isLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-slate-100 shadow-sm" />
                 ))}
               </div>
            ) : (
               <>
                 <SearchResults initialData={data} />
                 {data?.suggestions?.length > 0 && (
                   <div className="bg-indigo-50 border border-indigo-100/50 rounded-3xl p-8 animate-in fade-in slide-in-from-bottom-2">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 italic">Neural Suggestions</h4>
                      <div className="flex flex-wrap gap-3">
                         {data.suggestions.map((s: string) => (
                           <button 
                             key={s} 
                             onClick={() => window.location.href = `/search?q=${s}`}
                             className="px-4 py-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                           >
                             {s}
                           </button>
                         ))}
                      </div>
                   </div>
                 )}
               </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
