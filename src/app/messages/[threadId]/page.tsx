"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGetThreadQuery, useSendMessageMutation, useMarkThreadReadMutation } from '@/store/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: thread, isLoading } = useGetThreadQuery(threadId, { pollingInterval: 5000 });
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [markRead] = useMarkThreadReadMutation();

  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (threadId) markRead(threadId);
  }, [threadId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  const handleSend = async () => {
    if (!messageBody.trim() || isSending) return;
    try {
      await sendMessage({ threadId, body: messageBody.trim() }).unwrap();
      setMessageBody("");
    } catch (err) {
      console.error("Failed to sync message node:", err);
    }
  };

  if (isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center animate-pulse text-indigo-400 font-black uppercase tracking-widest text-[10px]">Initializing Secure Stream...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900/20 backdrop-blur-3xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative z-10">
      
      {/* High-Fidelity Chat Header */}
      <header className="p-8 border-b border-white/5 bg-slate-950/40 flex justify-between items-center backdrop-blur-xl">
         <div className="flex items-center gap-6">
            <Link href="/messages" className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">←</Link>
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-lg font-black text-indigo-400">
               {thread?.other_user_id?.slice(0, 1).toUpperCase()}
            </div>
            <div>
               <h3 className="text-xs font-black text-white uppercase tracking-widest">{thread?.subject || 'Direct Protocol'}</h3>
               <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Secure Link Active</span>
               </div>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            {thread?.order_id && (
               <Link href={`/dashboard/orders/${thread.order_id}`} className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
                  Access Order Node
               </Link>
            )}
            <button className="px-6 py-3 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
               Archive Log
            </button>
         </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
         <AnimatePresence initial={false}>
            {thread?.messages?.map((msg: any) => {
               const isMe = msg.sender_id !== thread.other_user_id;
               return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                     <div className={`max-w-[70%] space-y-2 ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-6 rounded-3xl text-[11px] font-bold leading-relaxed shadow-xl ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'}`}>
                           {msg.body}
                        </div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-2 italic">
                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                     </div>
                  </motion.div>
               );
            })}
         </AnimatePresence>
         <div ref={bottomRef} />
      </div>

      {/* Production-Grade Input Surface */}
      <footer className="p-8 border-t border-white/5 bg-slate-950/40 backdrop-blur-xl">
         <div className="flex gap-6 items-end">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-[32px] p-2 focus-within:border-indigo-500/50 transition-all">
               <textarea 
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Transmit Protocol Data..."
                  className="w-full bg-transparent border-none focus:ring-0 text-slate-200 text-xs font-bold p-4 resize-none min-h-[60px] max-h-[200px]"
                  style={{ height: 'auto' }}
                  onInput={(e: any) => {
                     e.target.style.height = 'auto';
                     e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
               />
            </div>
            <button 
              onClick={handleSend}
              disabled={!messageBody.trim() || isSending}
              className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${messageBody.trim() ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
            >
               {isSending ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : '⚡'}
            </button>
         </div>
         <div className="mt-4 flex justify-between items-center text-[7px] font-black text-slate-700 uppercase tracking-[0.4em]">
            <span>End-to-End Encrypted Node</span>
            <span>Buffered Synchronization Ready</span>
         </div>
      </footer>
    </div>
  );
}
