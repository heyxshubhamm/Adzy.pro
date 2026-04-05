"use client";
import React, { useState } from 'react';
import {
  useGetAdminGigsQuery,
  useApproveGigMutation,
  Gig
} from '@/store/api';
import { MetricCard, ConfirmModal } from '@/components/common/IndustrialUI';

export default function AdminGigsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);

  // RTK Query hooks
  const { data: gigsData, isLoading } = useGetAdminGigsQuery({
    status: statusFilter === "all" ? undefined : statusFilter
  });
  const gigs = gigsData?.gigs;
  const [approveGig] = useApproveGigMutation();

  const handleApprove = async () => {
    if (selectedGig) {
      await approveGig(selectedGig.id);
      setSelectedGig(null);
    }
  };

  const pendingCount = gigs?.filter(g => g.status === 'pending').length ?? 0;
  const flaggedCount = gigs?.filter(g => g.status === 'flagged').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gig Moderation</h1>
          <p className="text-slate-500 text-sm">Automated and manual oversight of service listings</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Gigs</option>
            <option value="pending">Pending Review</option>
            <option value="flagged">Flagged by AI</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Pending Approval" value={pendingCount} positive={pendingCount === 0} />
        <MetricCard label="AI Flagged" value={flaggedCount} negative={flaggedCount > 0} />
        <MetricCard label="Avg Quality" value="84%" positive />
        <MetricCard label="Moderator Health" value="Active" positive />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Listing Identity</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Industrial Scores</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Seller</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Price</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 animate-pulse">Running neural content audit...</td></tr>
            ) : gigs?.map(gig => (
              <tr key={gig.id} className={`${gig.status === 'flagged' ? 'bg-rose-50/30' : ''} hover:bg-slate-50/50 transition-colors`}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 truncate max-w-[200px]" title={gig.title}>{gig.title}</div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{gig.category}</div>
                </td>
                <td className="px-6 py-4">
                   <div className="flex gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">NSFW</span>
                        <span className={`text-xs font-mono font-bold ${gig.nsfw_score > 0.4 ? 'text-rose-600' : 'text-slate-600'}`}>{(gig.nsfw_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Spam</span>
                        <span className={`text-xs font-mono font-bold ${gig.spam_score > 0.4 ? 'text-rose-600' : 'text-slate-600'}`}>{(gig.spam_score * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Qual</span>
                        <span className={`text-xs font-mono font-bold ${gig.quality_score < 0.6 ? 'text-amber-600' : 'text-emerald-600'}`}>{(gig.quality_score * 100).toFixed(0)}%</span>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-700">{gig.seller_username}</div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {gig.seller_id.slice(0,8)}...</div>
                </td>
                <td className="px-6 py-4 font-mono text-slate-900 font-bold">
                  ${gig.price.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {gig.status !== 'approved' && (
                    <button 
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase transition-colors"
                      onClick={() => setSelectedGig(gig)}
                    >
                      Approve
                    </button>
                  )}
                  {gig.status === 'approved' && <span className="text-emerald-600 font-bold text-[10px] uppercase">Approved</span>}
                </td>
              </tr>
            ))}
            {gigs?.length === 0 && !isLoading && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">All caught up! No gigs pending moderation.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedGig && (
        <ConfirmModal 
          title={`Approve "${selectedGig.title}"?`}
          message="Approving this gig will make it visible to all marketplace buyers. This action is recorded in the immutable audit chain."
          onConfirm={handleApprove}
          onCancel={() => setSelectedGig(null)}
        />
      )}
    </div>
  );
}
