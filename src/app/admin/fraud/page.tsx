"use client";
import React, { useState } from 'react';
import { 
  useGetFraudAlertsQuery, 
  useResolveFraudAlertMutation,
  FraudAlert
} from '@/store/api';
import { MetricCard, SeverityBadge, ConfirmModal } from '@/components/common/IndustrialUI';

export default function FraudDashboard() {
  const [resolvedFilter, setResolvedFilter] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  // RTK Query hooks
  const { data: alerts, isLoading } = useGetFraudAlertsQuery({ 
    resolved: resolvedFilter 
  });
  const [resolveAlert] = useResolveFraudAlertMutation();

  const handleResolve = async () => {
    if (selectedAlert) {
      await resolveAlert(selectedAlert.id);
      setSelectedAlert(null);
    }
  };

  const criticalCount = alerts?.filter(a => a.severity === 5).length ?? 0;
  const highCount = alerts?.filter(a => a.severity === 4).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fraud Intelligence</h1>
          <p className="text-slate-500 text-sm">Real-time monitoring of AML and behavioral risk</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-200"
            value={String(resolvedFilter)}
            onChange={(e) => setResolvedFilter(e.target.value === "true")}
          >
            <option value="false">Open Alerts</option>
            <option value="true">Resolved History</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard label="Open Alerts" value={alerts?.length ?? 0} negative={alerts?.length! > 0} />
        <MetricCard label="Critical (5/5)" value={criticalCount} negative={criticalCount > 0} />
        <MetricCard label="High (4/5)" value={highCount} negative={highCount > 0} />
        <MetricCard label="Neural Health" value="Stable" positive />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Alert Signature</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Severity</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Identity</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Network</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 animate-pulse">Scanning neural patterns...</td></tr>
            ) : alerts?.map(alert => (
              <tr key={alert.id} className={`${alert.severity >= 4 ? 'bg-rose-50/30' : ''} hover:bg-slate-50/50 transition-colors`}>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900 uppercase tracking-tighter">{alert.alert_type}</div>
                  <div className="text-slate-400 text-[10px]">{new Date(alert.created_at).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={alert.severity} />
                    <span className="text-xs font-medium text-slate-500 uppercase">Level {alert.severity}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-700">{alert.user_username}</div>
                  <div className="text-[10px] text-slate-400 font-mono">UUID: {alert.user_id.slice(0,8)}...</div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                  {alert.ip_address || "System Event"}
                </td>
                <td className="px-6 py-4 text-right">
                  {!alert.resolved && (
                    <button 
                      className="px-3 py-1 bg-slate-900 hover:bg-black text-white rounded text-[10px] font-bold uppercase transition-colors"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      Resolve
                    </button>
                  )}
                  {alert.resolved && <span className="text-emerald-600 font-bold text-[10px] uppercase">Resolved</span>}
                </td>
              </tr>
            ))}
            {alerts?.length === 0 && !isLoading && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">No active fraud signatures detected in neural grid.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedAlert && (
        <ConfirmModal 
          title={`Resolve ${selectedAlert.alert_type}?`}
          message="Marking this as resolved confirms that the suspicious activity has been reviewed and mitigated."
          onConfirm={handleResolve}
          onCancel={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}
