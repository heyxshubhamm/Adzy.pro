import React from 'react';

// --- MetricCard ---
interface MetricCardProps {
  label:     string;
  value:     string | number;
  delta?:    string;
  positive?: boolean;
  negative?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, positive, negative }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
    <div className="text-slate-500 text-sm font-medium mb-1">{label}</div>
    <div className={`text-2xl font-bold ${positive ? 'text-emerald-600' : negative ? 'text-rose-600' : 'text-slate-900'}`}>
      {value}
    </div>
    {delta && <div className={`text-xs mt-1 ${positive ? 'text-emerald-500' : 'text-rose-500'}`}>{delta}</div>}
  </div>
);

// --- RiskBadge ---
export const RiskBadge: React.FC<{ score: number }> = ({ score }) => {
  const level  = score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low';
  const colors = { critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
  return (
    <div className="flex items-center gap-2" title={`Risk Score: ${score}`}>
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${colors[level]}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className={`text-[10px] font-bold uppercase ${level === 'critical' ? 'text-rose-600' : 'text-slate-500'}`}>
        {score.toFixed(0)}
      </span>
    </div>
  );
};

// --- SeverityBadge ---
export const SeverityBadge: React.FC<{ level: number }> = ({ level }) => {
  const colors: Record<number, string> = {
    1: 'bg-emerald-400', 2: 'bg-emerald-500', 3: 'bg-amber-500', 4: 'bg-orange-600', 5: 'bg-rose-600'
  };
  return (
    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] text-white font-bold ${colors[level] ?? 'bg-slate-400'}`}>
      {level}
    </span>
  );
};

// --- StatusBadge ---
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();
  const theme = 
    s === 'active' || s === 'completed' || s === 'verified' || s === 'approved' ? 'bg-emerald-50 text-emerald-600' :
    s === 'pending' || s === 'open' || s === 'requested' || s === 'held' ? 'bg-amber-50 text-amber-600' :
    s === 'rejected' || s === 'cancelled' || s === 'failed' || s === 'banned' ? 'bg-rose-50 text-rose-600' :
    'bg-slate-50 text-slate-500';
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${theme}`}>
      {status}
    </span>
  );
};

// --- ConfirmModal ---
interface ConfirmModalProps {
  title:         string;
  message:       string;
  onConfirm:     (reason: string) => void;
  onCancel:      () => void;
  requireReason?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ title, message, onConfirm, onCancel, requireReason }) => {
  const [reason, setReason] = React.useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-600 mb-6">{message}</p>
        {requireReason && (
          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-rose-500 outline-none mb-6"
            placeholder="Specify reason for audit logs..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="flex gap-3 justify-end">
          <button className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" onClick={onCancel}>Cancel</button>
          <button 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50" 
            onClick={() => onConfirm(reason)}
            disabled={requireReason && !reason.trim()}
          >
            Confirm Action
          </button>
        </div>
      </div>
    </div>
  );
};
