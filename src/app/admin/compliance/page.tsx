"use client";
import React from 'react';
import { 
  useGetComplianceRecordsQuery, 
  useVerifyComplianceMutation 
} from '@/store/api';
import { MetricCard, SeverityBadge, StatusBadge } from '@/components/common/IndustrialUI';

export default function ComplianceDashboard() {
  const { data: records, isLoading } = useGetComplianceRecordsQuery({});
  const [verifyCompliance, { isLoading: isVerifying }] = useVerifyComplianceMutation();

  const handleVerify = async (id: string) => {
    await verifyCompliance(id);
  };

  if (isLoading) return <div className="p-12 text-center text-slate-400 font-medium animate-pulse">Initializing Compliance Audits...</div>;

  const stats = {
    pending: records?.filter(r => r.status === 'PENDING').length || 0,
    verified: records?.filter(r => r.status === 'VERIFIED').length || 0,
    total: records?.length || 0
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end border-b border-slate-100 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight text-neutral-800">Compliance Hub</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium font-inter">KYC/AML Verification & Regulatory Transparency</p>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded animate-pulse">99.9% Regulatory Integrity</span>
           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight mt-1">Audit Chain Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard label="Pending Verifications" value={stats.pending} positive={stats.pending === 0} />
        <MetricCard label="Verified Accounts" value={stats.verified} />
        <MetricCard label="KYC Success Rate" value={`${stats.total ? ((stats.verified / stats.total) * 100).toFixed(1) : 100}%`} />
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">KYC Verification Queue</h2>
        </div>

        <table className="w-full border-collapse text-left border-hidden">
          <thead>
            <tr className="bg-slate-50/20 border-b border-slate-50">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Type</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Authentication</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-neutral-800">
            {records?.map(record => (
              <tr key={record.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="p-6">
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">{record.id_type || "Industrial Passport"}</div>
                  <div className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter mt-0.5">RID: {record.id.slice(0, 8)}</div>
                </td>
                <td className="p-6">
                  <SeverityBadge level={record.record_type === 'FINANCIAL_AML' ? 5 : 3} />
                </td>
                <td className="p-6">
                  <StatusBadge status={record.status} />
                </td>
                <td className="p-6 text-xs font-bold text-slate-900 tracking-tighter uppercase">{record.user_id.slice(0, 8)}</td>
                <td className="p-6 text-xs font-medium text-slate-500 italic lowercase">{new Date(record.created_at).toLocaleDateString()}</td>
                <td className="p-6 text-center">
                   {record.status === 'PENDING' && (
                     <button 
                      onClick={() => handleVerify(record.id)}
                      disabled={isVerifying}
                      className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 shadow-xl shadow-slate-900/10 active:scale-95"
                     >
                       {isVerifying ? "Authenticating..." : "Authenticate"}
                     </button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {records?.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-xs font-medium italic">
            Zero pending compliance audits. Regulatory clean sweep.
          </div>
        )}
      </div>

      {/* Industrial Guidance */}
      <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-4">
        <span className="text-xl">🛡️</span>
        <div className="text-xs text-emerald-900 font-medium leading-relaxed">
          <strong>Authentication Audit:</strong> Verifying a record cryptographically updates the user&apos;s KYC status and records the action into the tamper-evident industrial audit log. All verified accounts are subject to periodic AI re-validation.
        </div>
      </div>
    </div>
  );
}
