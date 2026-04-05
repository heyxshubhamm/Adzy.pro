"use client";
import React, { useState } from 'react';
import { 
  useGetPaymentsQuery, 
  useReleasePaymentMutation, 
  useRefundPaymentMutation, 
  useBulkReleasePaymentsMutation 
} from '@/store/api';
import { MetricCard, StatusBadge, RiskBadge, ConfirmModal } from '@/components/common/IndustrialUI';
import { Pagination } from "@/components/Admin/AdminShared";

export default function GlobalLedger() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<{ id: string; action: 'release' | 'refund' } | null>(null);

  const { data, isLoading } = useGetPaymentsQuery({ page, limit: 20, status, search });
  const [releasePayment] = useReleasePaymentMutation();
  const [refundPayment] = useRefundPaymentMutation();
  const [bulkRelease] = useBulkReleasePaymentsMutation();

  const handleAction = async (reason: string) => {
    if (!modal) return;
    if (modal.action === 'release') await releasePayment(modal.id);
    else await refundPayment(modal.id);
    setModal(null);
  };

  const handleBulkRelease = async () => {
    if (selectedIds.length === 0) return;
    await bulkRelease(selectedIds);
    setSelectedIds([]);
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Reconciling Ledger Nodes...</div>;

  const payments = data?.payments || [];
  const total = data?.total || 0;

  // Treasury Metrics (Mocked/Derived for UI demo, in prod these come from dashboard query)
  const totalEscrow = payments.filter(p => p.status === 'HELD').reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Global Ledger</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Escrow Reconciliation & Treasury Integrity</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={handleBulkRelease}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              Bulk Release ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Total Escrow (Page)" value={`$${totalEscrow.toLocaleString()}`} />
        <MetricCard label="Total Vol. (Page)" value={`$${payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}`} />
        <MetricCard label="Avg. Order" value={`$${payments.length ? (payments.reduce((acc, p) => acc + p.amount, 0) / payments.length).toFixed(0) : 0}`} />
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
         <input 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Payment Intent / Order ID..."
          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-slate-900 outline-none"
         />
         <select 
          value={status} 
          onChange={e => setStatus(e.target.value)}
          className="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-black uppercase tracking-tight focus:ring-2 focus:ring-slate-900 outline-none"
         >
           <option value="">All Statuses</option>
           <option value="HELD">Escrowed</option>
           <option value="RELEASED">Released</option>
           <option value="REFUNDED">Refunded</option>
         </select>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50">
              <th className="p-4 w-12"></th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gross</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fee</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Net</th>
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map(pmt => (
              <tr key={pmt.id} className="group hover:bg-slate-50/30 transition-colors">
                <td className="p-4">
                  {pmt.status === 'HELD' && (
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(pmt.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedIds([...selectedIds, pmt.id]);
                        else setSelectedIds(selectedIds.filter(id => id !== pmt.id));
                      }}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                  )}
                </td>
                <td className="p-4">
                  <div className="text-xs font-bold text-slate-900 font-mono tracking-tighter line-clamp-1">{pmt.stripe_payment_intent || pmt.id.slice(0, 16)}</div>
                  <div className="text-[9px] text-slate-400 font-black uppercase mt-0.5">Order: {pmt.order_id?.slice(0, 8)}</div>
                </td>
                <td className="p-4">
                  <StatusBadge status={pmt.status} />
                </td>
                <td className="p-4 text-right text-xs font-bold text-slate-900">${pmt.amount.toFixed(2)}</td>
                <td className="p-4 text-right text-xs font-medium text-rose-500">${pmt.platform_fee.toFixed(2)}</td>
                <td className="p-4 text-right text-xs font-bold text-emerald-600">${pmt.seller_earning.toFixed(2)}</td>
                <td className="p-4 text-center">
                   {pmt.status === 'HELD' && (
                     <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={() => setModal({ id: pmt.id, action: 'release' })}
                        className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100"
                       >
                         Release
                       </button>
                       <button 
                        onClick={() => setModal({ id: pmt.id, action: 'refund' })}
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
        
        {payments.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            No transactions found in this node. Treasury synchronized.
          </div>
        )}
      </div>

      <div className="flex justify-center py-4">
        <Pagination current={page} total={Math.ceil(total / 20)} onChange={setPage} />
      </div>

      {modal && (
        <ConfirmModal 
          title={modal.action === 'release' ? "Confirm Escrow Release" : "Process Transaction Refund"}
          message={modal.action === 'release' 
            ? "This will transfer funds from escrow to the seller's wallet immediately. This action is audited and irreversible."
            : "This will return the full transaction amount to the buyer and cancel the associated order. Audited action."
          }
          requireReason={true}
          onConfirm={handleAction}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
