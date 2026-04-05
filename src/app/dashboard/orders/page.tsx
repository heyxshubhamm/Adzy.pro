"use client";
import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGetOrdersQuery } from '@/store/api';
import { StatusBadge } from '@/components/common/IndustrialUI';
import { motion } from 'framer-motion';

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-950 animate-pulse rounded-[40px]" />}>
       <OrdersContent />
    </Suspense>
  );
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || 'buyer';
  const success = searchParams.get('success') === 'true';

  const { data: ordersData, isLoading } = useGetOrdersQuery({ page: 1, limit: 50, role });
  const orders = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.orders || [];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
       {/* Success Protocol Panel */}
       {success && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[32px] flex items-center gap-6 shadow-2xl shadow-emerald-500/5"
          >
             <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-xl animate-pulse">✅</div>
             <div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Transaction Synchronized</h3>
                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter italic opacity-80">Order protocol initiated. Provider has been notified of the mission parameters.</p>
             </div>
          </motion.div>
       )}

       <div className="flex justify-between items-end">
          <div className="space-y-2">
             <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                Transaction <span className="text-indigo-400">Ledger</span>
             </h1>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest opacity-60">
                {role === 'seller' ? 'Supply Chain Throughput' : 'Acquisition History'}
             </p>
          </div>
          <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
             <Link href="/dashboard/orders?role=buyer" className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === 'buyer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Buyer View</Link>
             <Link href="/dashboard/orders?role=seller" className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${role === 'seller' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Seller View</Link>
          </div>
       </div>

       {/* Industrial Table Surface */}
       <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-white/5 bg-slate-950/40">
                   <th className="px-10 py-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Service Node</th>
                   <th className="px-10 py-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Economic Flow</th>
                   <th className="px-10 py-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Settlement Status</th>
                   <th className="px-10 py-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">Temporal Data</th>
                   <th className="px-10 py-8 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] italic text-right">Access</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {isLoading ? (
                   [...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan={5} className="px-10 py-8 h-20 bg-white/5" />
                      </tr>
                   ))
                ) : orders.length === 0 ? (
                   <tr>
                      <td colSpan={5} className="px-10 py-24 text-center">
                         <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">Zero Order Protocol Detected</p>
                            <Link href="/marketplace" className="inline-block px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">Initialize Marketplace Scan</Link>
                         </div>
                      </td>
                   </tr>
                ) : orders.map((order: any) => (
                   <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-1">
                            <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[240px]">{order.gig?.title || 'Node Protocol'}</span>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">{order.id.slice(0,8)}</span>
                         </div>
                      </td>
                      <td className="px-10 py-8">
                         <span className="text-sm font-black text-white">${Number(order.price).toLocaleString()}</span>
                         <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter mt-1 italic">Settlement: USD</p>
                      </td>
                      <td className="px-10 py-8">
                         <StatusBadge status={order.status} />
                      </td>
                      <td className="px-10 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                         {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-10 py-8 text-right">
                         <Link 
                            href={`/dashboard/orders/${order.id}`}
                            className="inline-flex w-10 h-10 bg-white/5 border border-white/10 rounded-xl items-center justify-center hover:bg-indigo-600 hover:border-indigo-500 text-slate-400 hover:text-white transition-all group-hover:scale-110"
                         >
                            →
                         </Link>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
          
          <div className="p-8 border-t border-white/5 bg-slate-950/20 flex justify-between items-center text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">
             <span>Encrypted Ledger Mode Active</span>
             <span>AES-256 GCM Verification Node 04</span>
          </div>
       </div>
    </div>
  );
}
