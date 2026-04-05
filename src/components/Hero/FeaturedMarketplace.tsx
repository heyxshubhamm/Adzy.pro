"use client";

import React from 'react';
import { useGetGigsQuery as useListGigsQuery } from '@/store/api';
import ListingCard from '../Marketplace/ListingCard';
import Link from 'next/link';

const FeaturedMarketplace = () => {
  // Protocol: Fetch top-ranked active gigs using industrial RTK Query
  const { data: gigs, isLoading, error } = useListGigsQuery();

  if (isLoading) {
    return (
      <section className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-4">
              <div className="h-8 w-64 bg-slate-800 rounded-full animate-pulse" />
              <div className="h-4 w-96 bg-slate-800/50 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] bg-slate-900/40 rounded-[32px] border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !gigs || gigs.length === 0) return null;

  // Take first 8 for featured display
  const featuredGigs = gigs.slice(0, 8);

  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden font-inter">
      {/* Background Neural Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[150px] rounded-full -ml-64 -mb-64 pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              Verified Marketplace
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase mb-4">
              Prime Nodes
            </h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed opacity-80">
              Explore the upper-tier of our marketplace. High-authority domains, vetted metrics, and zero-risk transactions monitored by the Adzy AI Protocol.
            </p>
          </div>
          <Link 
            href="/marketplace" 
            className="px-8 py-4 bg-white text-slate-950 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 hover:scale-[1.05] active:scale-[0.95] transition-all shadow-xl shadow-white/5"
          >
            Access Full Terminal
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredGigs.map((gig: any) => (
            <div key={gig.id} className="group transition-all duration-500 hover:y-[-8px]">
              <ListingCard {...gig} />
            </div>
          ))}
        </div>

        <div className="mt-20 flex items-center justify-center">
            <div className="px-6 py-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active nodes: {gigs.length}</span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Version: 1.0.4-LTS</span>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMarketplace;
