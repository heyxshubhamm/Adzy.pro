"use client";
import React, { useState } from 'react';
import { 
  useGetWithdrawalsQuery, 
  useProcessWithdrawalMutation, 
  useMarkWithdrawalProcessingMutation 
} from '@/store/api';
import { MetricCard, StatusBadge, SeverityBadge, ConfirmModal } from '@/components/common/IndustrialUI';
import { Pagination } from "@/components/Admin/AdminShared";

export default function SettlementCenter() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("requested");
  const [modal, setModal] = useState<{ id: string; amount: number; status: 'completed' | 'rejected' } | null>(null);

  const { data, isLoading } = useGetWithdrawalsQuery({ status, page, limit: 50 });
  const [processWithdrawal, { isLoading: isProcessing }] = useProcessWithdrawalMutation();
  const [markProcessing] = useMarkWithdrawalProcessingMutation();

  const handleConfirm = async (reason: string) => {
    if (!modal) return;
    await processWithdrawal({ id: modal.id, status: modal.status, admin_notes: reason });
    setModal(null);
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Synchronizing Treasury Settlements...</div>;

  const items = data?.items || [];
  const total = data?.total || 0;

  const tabs = ["requested", "processing", "completed", "rejected"];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settlement Center</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">Global Seller Payouts & Disbursal Control</p>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded">99.8% Disbursal Accuracy</span>
           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">Settlement Node Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Pending Disbursals" value={status === 'requested' ? total : 0} negative={total > 10} />
        <MetricCard label="Settled Today" value={`$${items.filter(i => i.status === 'completed').reduce((acc, i) => acc + i.amount, 0).toLocaleString()}`} positive={true} />
        <MetricCard label="Avg. Payout" value={`$${items.length ? (items.reduce((acc, i) => acc + i.amount, 0) / items.length).toFixed(0) : 0}`} />
      </div>

      <div className="flex gap-1 border-b border-slate-100">
        {tabs.map(t => (
          <button 
            key={t}
            onClick={() => { setStatus(t); setPage(1); }}
            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${status === t ? 'border-b-2 border-slate-900 text-slate-900 bg-slate-50/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="p-6">Seller Wallet</th>
              <th className="p-6">Method</th>
              <th className="p-6 text-right font-inter">Gross Amount</th>
              <th className="p-6 text-center">Status</th>
              <th className="p-6">Requested</th>
              <th className="p-6 text-center">Authentication</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-neutral-800">
            {items.map(item => (
              <tr key={item.id} className="group hover:bg-slate-50/30 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-bold text-slate-900 font-mono tracking-tighter uppercase">{item.wallet_id.slice(0, 16)}</div>
                  <div className="text-[8px] text-slate-400 font-black uppercase mt-0.5 tracking-widest">RID: {item.id.slice(0, 8)}</div>
                </td>
                <td className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.method === 'paypal' ? '🅿️' : '🏦'}</span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{item.method.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="p-6 text-right">
                   <div className="text-lg font-black text-slate-900 leading-none tracking-tighter font-inter">${item.amount.toLocaleString()}</div>
                </td>
                <td className="p-6 text-center">
                   <StatusBadge status={item.status} />
                </td>
                <td className="p-6 text-xs font-medium text-slate-500 italic lowercase">
                   {new Date(item.requested_at).toLocaleDateString()}
                </td>
                <td className="p-6 text-center">
                   {(item.status === 'requested' || item.status === 'processing') && (
                     <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                       {item.status === 'requested' && (
                         <button 
                          onClick={() => markProcessing(item.id)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-sm"
                         >
                           Mark Proc.
                         </button>
                       )}
                       <button 
                        onClick={() => setModal({ id: item.id, amount: item.amount, status: 'completed' })}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-600/20"
                       >
                         Approve
                       </button>
                       <button 
                        onClick={() => setModal({ id: item.id, amount: item.amount, status: 'rejected' })}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-600/20"
                       >
                         Reject
                       </button>
                     </div>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            Zero pending disbursals in this node. Treasury synchronized.
          </div>
        )}
      </div>

      <div className="flex justify-center py-4">
        <Pagination current={page} total={Math.ceil(total / 50)} onChange={setPage} />
      </div>

      {modal && (
        <ConfirmModal 
          title={modal.status === 'completed' ? `Confirm Payout — $${modal.amount}` : `Reject Withdrawal — $${modal.amount}`}
          message={modal.status === 'completed' 
            ? "You are about to authorize an external payment transfer. This action is audited and will mark the transaction as finalized."
            : "Unauthorized withdrawals will return funds to the seller's internal wallet. Please provide a clear reason for the audit trail."
          }
          requireReason={true}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
