"use client";
import React, { useState } from 'react';
import { 
  useGetUsersQuery, 
  useBanUserMutation,
  User
} from '@/store/api';
import { MetricCard, RiskBadge, ConfirmModal } from '@/components/common/IndustrialUI';

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [isBanned, setIsBanned] = useState<boolean | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // RTK Query hooks
  const { data: users, isLoading, error } = useGetUsersQuery({ 
    search: search || undefined, 
    is_banned: isBanned 
  });
  const [banUser] = useBanUserMutation();

  const handleBan = async (reason: string) => {
    if (selectedUser) {
      await banUser({ id: selectedUser.id, reason });
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm">Industrial oversight of marketplace participants</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-200 w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-200"
            onChange={(e) => {
                const val = e.target.value;
                setIsBanned(val === "all" ? undefined : val === "true");
            }}
          >
            <option value="all">All Statuses</option>
            <option value="false">Active Only</option>
            <option value="true">Banned Only</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard label="Total Screened" value={users?.length ?? 0} positive />
          <MetricCard label="High Risk" value={users?.filter(u => u.risk_score > 60).length ?? 0} negative={!!users?.some(u => u.risk_score > 60)} />
          <MetricCard label="Banned" value={users?.filter(u => u.is_banned).length ?? 0} />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Identity</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Industrial Risk</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Wallet</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users?.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{user.username}</div>
                  <div className="text-slate-400 text-xs">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                    {user.is_seller ? 'Seller' : 'Buyer'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <RiskBadge score={user.risk_score} />
                </td>
                <td className="px-6 py-4 font-mono text-slate-600">
                  ${user.wallet_balance.toLocaleString()}
                  {user.wallet_frozen && <span className="ml-1 text-rose-500" title="Wallet Frozen">❄</span>}
                </td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.is_banned ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {user.is_banned ? 'Banned' : 'Active'}
                   </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {!user.is_banned && (
                    <button 
                      className="text-rose-600 hover:text-rose-700 font-medium"
                      onClick={() => setSelectedUser(user)}
                    >
                      Ban
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <ConfirmModal 
          title={`Ban ${selectedUser.username}?`}
          message="This action will immediately restrict all marketplace access. This will be logged in the immutable audit chain."
          requireReason
          onConfirm={handleBan}
          onCancel={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
