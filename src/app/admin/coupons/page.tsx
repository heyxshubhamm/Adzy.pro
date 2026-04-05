"use client";
import React, { useState } from 'react';
import { 
  useGetCouponsQuery, 
  useCreateCouponMutation, 
  useDeleteCouponMutation 
} from '@/store/api';
import { MetricCard } from '@/components/common/IndustrialUI';
import { ConfirmModal } from '@/components/Admin/ConfirmModal';

const INITIAL_FORM = {
  code: "", type: "percentage", value: "", usage_limit: "100",
  expiry_date: "", min_order_amount: "", applies_to: "all",
};

export default function AdminCouponsPage() {
  const { data: coupons, isLoading } = useGetCouponsQuery();
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [deleteCoupon] = useDeleteCouponMutation();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCoupon({
        ...form,
        value: Number(form.value),
        usage_limit: Number(form.usage_limit),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
      }).unwrap();
      setShowForm(false);
      setForm(INITIAL_FORM);
    } catch (err: any) {
      setError(err.data?.detail || "Failed to create coupon");
    }
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Initializing Growth Engine...</div>;

  const stats = {
    active: coupons?.filter(c => c.is_active && new Date(c.expiry_date) > new Date()).length || 0,
    exhausted: coupons?.filter(c => c.usage_count >= c.usage_limit).length || 0,
    total_codes: coupons?.length || 0
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Coupons & Promotions</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Marketplace Growth & Incentives</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
        >
          + New Promo Code
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Active Promos" value={stats.active} positive />
        <MetricCard label="Exhausted" value={stats.exhausted} negative={stats.exhausted > 0} />
        <MetricCard label="Total Codes" value={stats.total_codes} />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <table className="w-100 border-collapse text-left border-hidden">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usage</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {coupons?.map(coupon => {
              const expired = new Date(coupon.expiry_date) < new Date();
              const full = coupon.usage_count >= coupon.usage_limit;
              const active = coupon.is_active && !expired && !full;
              
              return (
                <tr key={coupon.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900 tracking-widest uppercase text-xs">{coupon.code}</td>
                  <td className="p-6 text-xs font-bold text-slate-600">
                    {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                  </td>
                  <td className="p-6 text-xs font-medium text-slate-500">
                    <span className={full ? "text-rose-600 font-bold" : ""}>{coupon.usage_count}</span>
                    <span className="text-slate-300"> / {coupon.usage_limit}</span>
                  </td>
                  <td className={`p-6 text-xs font-medium ${expired ? "text-rose-400 line-through" : "text-slate-500"}`}>
                    {new Date(coupon.expiry_date).toLocaleDateString()}
                  </td>
                  <td className="p-6">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${active ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {active ? "Active" : expired ? "Expired" : full ? "Exhausted" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-6">
                    <button 
                      onClick={() => setDeleteId(coupon.id)}
                      className="text-[10px] font-black text-rose-600 hover:underline uppercase tracking-widest"
                    >
                      Purge
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create Promo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promo Code</label>
                <input 
                  type="text" 
                  value={form.code} 
                  onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  placeholder="e.g. LAUNCH10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  >
                    <option value="percentage">Percent %</option>
                    <option value="fixed">Fixed $</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount</label>
                  <input 
                    type="number" 
                    value={form.value} 
                    onChange={e => setForm({...form, value: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                <input 
                  type="datetime-local" 
                  value={form.expiry_date} 
                  onChange={e => setForm({...form, expiry_date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase shadow-xl shadow-slate-900/20 active:scale-95 transition-all">
                  {isCreating ? "Deploying..." : "Create Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal 
          title="Purge Promo?"
          message="This promo code will be permanently deactivated and removed from circulation. Redemptions will stop immediately."
          danger
          confirmLabel="Purge Permanently"
          onConfirm={async () => { await deleteCoupon(deleteId); setDeleteId(null); }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
