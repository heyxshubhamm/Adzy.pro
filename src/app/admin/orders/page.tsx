"use client";
import React, { useState } from 'react';
import { 
  useGetOrdersQuery, 
  useResolveOrderMutation 
} from '@/store/api';
import { MetricCard, StatusBadge, SeverityBadge, ConfirmModal } from '@/components/common/IndustrialUI';
import { Pagination } from "@/components/Admin/AdminShared";

export default function SupplyChainCommand() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [resolving, setResolving] = useState<any>(null);

  const { data, isLoading } = useGetOrdersQuery({ page, limit: 20, status, search });
  const [resolveOrder] = useResolveOrderMutation();

  const handleResolve = async (reason: string) => {
    if (!resolving) return;
    await resolveOrder({ 
      id: resolving.id, 
      resolution: resolving.resolution_type, 
      admin_note: reason 
    });
    setResolving(null);
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Syncing Supply Chain Nodes...</div>;

  const orders = data?.orders || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Supply Chain Command</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">Global Order Orchestration & Fulfillment Integrity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Active Orders" value={orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length} />
        <MetricCard label="Dispute Rate" value={`${orders.length ? ((orders.filter(o => o.status === 'DISPUTED').length / orders.length) * 100).toFixed(1) : 0}%`} negative={orders.filter(o => o.status === 'DISPUTED').length > 0} />
        <MetricCard label="Total Vol. (Page)" value={`$${orders.reduce((acc, o) => acc + o.price, 0).toLocaleString()}`} />
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
         <input 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Order ID or Gig Title..."
          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none placeholder:text-slate-300"
         />
         <select 
          value={status} 
          onChange={e => setStatus(e.target.value)}
          className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-slate-900 outline-none"
         >
           <option value="">All Statuses</option>
           <option value="PENDING">Pending</option>
           <option value="IN_PROGRESS">In Progress</option>
           <option value="DELIVERED">Delivered</option>
           <option value="COMPLETED">Completed</option>
           <option value="CANCELLED">Cancelled</option>
           <option value="DISPUTED">Disputed</option>
         </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-6">Supply Identifier</th>
              <th className="p-6">Participants</th>
              <th className="p-6 text-center">Severity</th>
              <th className="p-6 text-center">Status</th>
              <th className="p-6 text-right">Price</th>
              <th className="p-6 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-neutral-800">
            {orders.map(order => (
              <tr key={order.id} className="group hover:bg-slate-50/30 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{order.id.slice(0, 16)}</div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-tighter">Order Hub Node</div>
                </td>
                <td className="p-6">
                   <div className="flex flex-col gap-0.5">
                      <div className="text-[10px] font-black text-indigo-500 uppercase">B: {order.buyer_id?.slice(0, 8)}</div>
                      <div className="text-[10px] font-black text-emerald-500 uppercase">S: {order.seller_id?.slice(0, 8)}</div>
                   </div>
                </td>
                <td className="p-6 text-center">
                  <SeverityBadge level={order.status === 'DISPUTED' ? 5 : order.status === 'DELIVERED' ? 1 : 3} />
                </td>
                <td className="p-6 text-center">
                  <StatusBadge status={order.status} />
                </td>
                <td className="p-6 text-right text-xs font-bold text-slate-900 font-mono">
                   ${order.price.toFixed(2)}
                </td>
                <td className="p-6 text-center">
                   {order.status === 'DISPUTED' && (
                     <div className="flex justify-center gap-2">
                       <button 
                        onClick={() => setResolving({ ...order, resolution_type: 'complete' })}
                        className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100"
                       >
                         Force Complete
                       </button>
                       <button 
                        onClick={() => setResolving({ ...order, resolution_type: 'refund' })}
                        className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-100"
                       >
                         Refund
                       </button>
                     </div>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {orders.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic font-inter">
            No active supply chain traffic. All fulfillment nodes idle.
          </div>
        )}
      </div>

      <div className="flex justify-center py-4">
        <Pagination current={page} total={Math.ceil(total / 20)} onChange={setPage} />
      </div>

      {resolving && (
        <ConfirmModal 
          title={resolving.resolution_type === 'complete' ? "Force Complete Order" : "Initiate Full Refund"}
          message={resolving.resolution_type === 'complete' 
            ? "Administrative override to complete this order and release funds to the seller. This action resolves the dispute."
            : "Administrative override to cancel this order and initiate a full transaction refund to the buyer."
          }
          requireReason={true}
          onConfirm={handleResolve}
          onCancel={() => setResolving(null)}
        />
      )}
    </div>
  );
}
