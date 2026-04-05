"use client";
import React, { useState } from 'react';
import { useOpenDisputeMutation } from '@/store/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  orderId: string;
  isDisputed: boolean;
}

export default function DisputePanel({ orderId, isDisputed }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  
  const [openDispute, { isLoading, isSuccess }] = useOpenDisputeMutation();

  const handleOpenDispute = async () => {
    if (reason.length < 20) return;
    try {
      await openDispute({ orderId, reason, evidence_url: evidenceUrl || undefined }).unwrap();
    } catch (err) {
      console.error("Dispute sync failure:", err);
    }
  };

  if (isDisputed || isSuccess) {
    return (
      <div className="p-8 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-6 shadow-2xl shadow-rose-500/5">
         <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-xl animate-pulse">⚠️</div>
         <div>
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Arbitration Node Active</h3>
            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter italic opacity-80">Mission protocol is under review by Adzy Sentinel controllers. Settlement is frozen.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full py-4 bg-white/5 border border-white/10 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] transition-all"
        >
          Initialize Dispute Protocol
        </button>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] p-8 space-y-8 shadow-2xl"
        >
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Arbitration Parameters</h3>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] leading-relaxed">
                 Opening an arbitration node requires high-fidelity proof. Misuse of the protocol may lead to secondary account sanctions.
              </p>
           </div>

           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Dispute Logic (Min 20 chars)</label>
                 <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe the mission failure in detail..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-200 focus:border-indigo-500 transition-all min-h-[120px]"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Evidence Node URL (Optional)</label>
                 <input 
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://proof.example.com/data"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-slate-200 focus:border-indigo-500 transition-all"
                 />
              </div>
           </div>

           <div className="flex gap-4">
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                 Abort
              </button>
              <button 
                onClick={handleOpenDispute}
                disabled={reason.length < 20 || isLoading}
                className={`flex-[2] py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${reason.length >= 20 ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20 hover:bg-rose-500' : 'bg-white/5 text-slate-700 cursor-not-allowed'}`}
              >
                 {isLoading ? 'Synchronizing Archive...' : 'Execute Dispute Protocol'}
              </button>
           </div>
        </motion.div>
      )}
    </div>
  );
}
