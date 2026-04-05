"use client";
import React from 'react';
import { usePathname } from "next/navigation";
import { useDashboardWebSocket } from '@/hooks/useDashboardWebSocket';

const NAV_GROUPS = [
  {
    label: "Mission Control",
    items: [
      { label: "Dashboard",   href: "/admin", icon: "📊" },
      { label: "Analytics",   href: "/admin/analytics", icon: "📈" },
    ]
  },
  {
    label: "Supply Chain",
    items: [
      { label: "Universal Users", href: "/admin/users", icon: "👥" },
      { label: "Gig Moderation",  href: "/admin/gigs", icon: "📦" },
      { label: "Order Command",   href: "/admin/orders", icon: "📋" },
      { label: "Taxonomy Hub",    href: "/admin/categories", icon: "📁" },
    ]
  },
  {
    label: "Treasury Center",
    items: [
      { label: "Global Ledger",   href: "/admin/payments", icon: "💳" },
      { label: "Settlements",      href: "/admin/withdrawals", icon: "💰" },
    ]
  },
  {
    label: "Security & Ops",
    items: [
      { label: "Fraud Intel",     href: "/admin/fraud", icon: "🚨" },
      { label: "Compliance Hub",  href: "/admin/compliance", icon: "📜" },
      { label: "Support Desk",    href: "/admin/support", icon: "🛠️" },
      { label: "Automations",      href: "/admin/automations", icon: "⚡" },
    ]
  },
  {
    label: "Platform Assets",
    items: [
      { label: "Config Center",   href: "/admin/config", icon: "🎛️" },
      { label: "Homepage Lab",    href: "/admin/homepage", icon: "🎨" },
      { label: "Coupon Engine",   href: "/admin/coupons", icon: "📢" },
      { label: "Content CMS",     href: "/admin/cms", icon: "📄" },
    ]
  }
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { status } = useDashboardWebSocket();

  return (
    <div className="w-64 border-r border-slate-100 bg-white flex flex-col h-screen sticky top-0 group">
      <div className="p-8 border-b border-slate-50 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse shadow-lg shadow-slate-900/20" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Adzy Pro</h2>
          </div>
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Industrial Marketplace Protocol</div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16" />
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {NAV_GROUPS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1.5">
             <h3 className="px-4 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3">{group.label}</h3>
             {group.items.map(n => {
               const active = pathname === n.href;
               return (
                 <a 
                   key={n.href} 
                   href={n.href} 
                   className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-300 group ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 font-bold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                 >
                   <span className={`text-base grayscale group-hover:grayscale-0 transition-transform duration-300 ${active ? 'grayscale-0' : 'group-hover:scale-110'}`}>{n.icon}</span>
                   <span className="tracking-tight">{n.label}</span>
                   {active && <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />}
                 </a>
               );
             })}
          </div>
        ))}
      </nav>

      {/* Industrial Footer Status */}
      <div className="p-6 border-t border-slate-50 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className={`w-2 h-2 rounded-full shadow-lg ${status === 'open' ? 'bg-emerald-500 shadow-emerald-500/50' : status === 'connecting' ? 'bg-amber-500 shadow-amber-500/50' : 'bg-rose-500 shadow-rose-500/50'}`} />
            {status === 'open' && <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />}
          </div>
          <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
            {status === 'open' ? 'Neural Link Active' : status === 'connecting' ? 'Synchronizing...' : 'Neural Link Lost'}
          </span>
        </div>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest italic leading-none">
                <span>Core Integrity</span>
                <span className="text-emerald-500">Verified</span>
            </div>
            <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest italic leading-none">
                <span>Audit Chain</span>
                <span className="text-emerald-500">Immutable</span>
            </div>
        </div>
      </div>
    </div>
  );
}
