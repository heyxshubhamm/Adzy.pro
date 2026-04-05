"use client";
import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useVerifyEmailQuery, useResendVerificationMutation } from '@/store/api';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 animate-pulse" />}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const user_id = searchParams.get("user_id") || "";
  
  const { 
    data, 
    error: verifyError, 
    isLoading: isVerifying, 
    isSuccess 
  } = useVerifyEmailQuery(
    { token, user_id },
    { skip: !token || !user_id }
  );

  const [resendVerification, { isLoading: isResending, isSuccess: resendSuccess }] = useResendVerificationMutation();

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => router.push("/login?verified=1"), 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, router]);

  const handleResend = async () => {
    if (!data?.email && !user_id) return;
    try {
      await resendVerification({ email: data?.email || "" }).unwrap();
    } catch (err) {
      console.error("Resend failed", err);
    }
  };

  const errorMessage = (verifyError as any)?.data?.detail || "Verification protocol failed.";

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Background Neural Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-12 shadow-2xl shadow-indigo-500/10 transition-all text-center">
           <div className="mb-12 inline-flex items-center justify-center w-24 h-24 bg-indigo-500/10 rounded-[32px] border border-indigo-500/20 shadow-inner">
             {isVerifying ? (
               <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
             ) : isSuccess ? (
               <span className="text-4xl animate-in zoom-in-50 duration-500">✅</span>
             ) : (
               <span className="text-4xl animate-in zoom-in-50 duration-500">❌</span>
             )}
           </div>

           <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-4">Sentinel Gate</h2>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed opacity-60 mb-12">
              Identity Protocol Verification
           </p>

           {isVerifying && (
             <div className="space-y-4 animate-pulse">
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden w-48 mx-auto">
                   <div className="h-full bg-indigo-500 w-1/3 animate-[shimmer_2s_infinite]" />
                </div>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Calibrating Authentication Neural Link...</p>
             </div>
           )}

           {isSuccess && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-8 leading-relaxed">
                   Security Protocol Locked. <br/> 
                   Access Credentials Activated.
                </p>
                <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] italic">
                   Redirecting to Access Identity Gate...
                </div>
             </div>
           )}

           {!isVerifying && !isSuccess && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[9px] font-black text-rose-400 uppercase tracking-widest leading-relaxed">
                   {errorMessage}
                </div>
                
                {resendSuccess ? (
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Verification Link Resent.</p>
                ) : (
                  <button 
                    onClick={handleResend}
                    disabled={isResending}
                    className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Link'}
                  </button>
                )}

                <button 
                  onClick={() => router.push("/login")}
                  className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xl shadow-white/5"
                >
                  Return to Base
                </button>
             </div>
           )}

           <div className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <span>Encrypted Node</span>
              <span>AES-256 GCM</span>
           </div>
        </div>
      </motion.div>

      {/* Abstract Visual Nodes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}
