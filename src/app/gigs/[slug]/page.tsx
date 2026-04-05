"use client";
import React, { Suspense } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useGetGigBySlugQuery } from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge } from '@/components/common/IndustrialUI';
import { GigMediaGallery } from "@/components/gig/GigMediaGallery";
import { GigPackageSelector } from "@/components/gig/GigPackageSelector";
import { GigSellerCard } from "@/components/gig/GigSellerCard";
import { GigReviews } from "@/components/gig/GigReviews";
import { RelatedGigs } from "@/components/gig/RelatedGigs";

export default function GigDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const { data: gig, isLoading, isError } = useGetGigBySlugQuery(slug);

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-black uppercase tracking-widest animate-pulse">Synchronizing Service Node...</div>;
  if (!gig || isError) return notFound();

  return (
    <div className="min-h-screen bg-slate-50/30 font-inter pb-24">
      {/* High-Fidelity Header Section */}
      <div className="bg-slate-950 pt-32 pb-20 px-6 lg:px-12 relative overflow-hidden mb-12">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
           <div className="space-y-6 max-w-3xl">
              <div className="flex flex-wrap gap-2 animate-in slide-in-from-left-4 duration-500">
                 {gig.tags.map((tag: string) => (
                   <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      #{tag}
                   </span>
                 ))}
                 <StatusBadge status="ACTIVE" />
              </div>
              <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                 {gig.title}
              </h1>
              <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <div className="flex items-center gap-1">
                    <span className="text-amber-500">★</span>
                    <span className="text-white text-xs">{Number(gig.avg_rating).toFixed(1)}</span>
                 </div>
                 <span className="opacity-40">|</span>
                 <span>{gig.review_count} Intelligence Audits</span>
              </div>
           </div>

           <div className="bg-slate-900 rounded-3xl p-8 border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4 italic">Economic Metrics</h4>
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-tighter">Market Throughput</span>
                    <span className="block text-lg font-black text-white">{gig.stats?.orders_count || 12} <span className="text-[10px] opacity-40">ops</span></span>
                 </div>
                 <div className="space-y-1">
                    <span className="block text-[8px] font-black text-slate-500 uppercase tracking-tighter">Conversion Pulse</span>
                    <span className="block text-lg font-black text-emerald-400">{((gig.stats?.conversion_rate || 0) * 100).toFixed(1)}%</span>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Abstract Background Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full -ml-32 -mb-32" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Main Operational Surface */}
          <div className="lg:col-span-2 space-y-16">
             {/* Core Media Flux */}
             <div className="bg-white border border-slate-100 rounded-[40px] p-2 shadow-sm overflow-hidden">
                <GigMediaGallery media={gig.media} title={gig.title} />
             </div>

             {/* Content Intel */}
             <section className="bg-white border border-slate-100 rounded-[40px] p-12 shadow-sm space-y-8">
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Service Specification</h3>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Operational Details</h2>
                </div>
                <div className="text-slate-600 text-sm font-medium leading-relaxed prose prose-slate max-w-none prose-sm whitespace-pre-wrap">
                   {gig.description}
                </div>
             </section>

             {/* Entity Node (Seller) */}
             <div className="bg-slate-900 rounded-[40px] p-1 shadow-2xl border border-white/5">
                <GigSellerCard seller={gig.seller} />
             </div>

             {/* Intelligence Audits (Reviews) */}
             <div className="bg-white border border-slate-100 rounded-[40px] p-12 shadow-sm">
                <GigReviews reviews={gig.reviews} avgRating={gig.avg_rating} reviewCount={gig.review_count} />
             </div>
          </div>

          {/* Protocol Configuration (Sidebar) */}
          <aside className="lg:col-span-1 space-y-12">
             <div className="sticky top-12 space-y-12">
                <div className="bg-white border border-slate-100 rounded-[40px] p-2 shadow-xl shadow-slate-900/5">
                   <GigPackageSelector 
                      packages={gig.packages} 
                      gigId={gig.id} 
                      sellerAvailable={gig.seller.is_available} 
                   />
                </div>
                
                {/* Protocol Trust Badge */}
                <div className="p-8 bg-indigo-600 rounded-[40px] shadow-2xl shadow-indigo-600/20 text-white relative overflow-hidden group">
                   <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-60">Verified Settlement</h4>
                   <div className="space-y-4 relative z-10">
                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">🛡️</div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-tight">Escrow Safeguard</p>
                            <p className="text-[8px] opacity-60 leading-tight mt-1 font-medium italic">Funds only released upon protocol confirmation of delivery.</p>
                         </div>
                      </div>
                      <div className="flex gap-4">
                         <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl">⚡</div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-tight">Zero-Latency Support</p>
                            <p className="text-[8px] opacity-60 leading-tight mt-1 font-medium italic">24/7 mission-ready resolution protocols active.</p>
                         </div>
                      </div>
                   </div>
                   {/* Background Pulse */}
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700" />
                </div>
             </div>
          </aside>
        </div>

        {/* Global Related Nodes */}
        {gig.related_gigs?.length > 0 && (
          <div className="mt-24 space-y-12">
             <div className="flex justify-between items-end border-b border-slate-100 pb-8">
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Discovery Topology</h3>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Related Logic Nodes</h2>
                </div>
                <Link href="/marketplace" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-slate-900 transition-colors">
                   View Full Grid →
                </Link>
             </div>
             <RelatedGigs gigs={gig.related_gigs} />
          </div>
        )}
      </div>
    </div>
  );
}
