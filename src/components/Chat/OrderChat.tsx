"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  body: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

interface Props {
  orderId: string;
  token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const WS_URL = API.replace(/^http/, "ws");

export default function OrderChat({ orderId, token }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/orders/${orderId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Chat history sync failure:", err);
    }
  }, [orderId, token]);

  useEffect(() => {
    loadMessages();
    const ws = new WebSocket(`${WS_URL}/chat/orders/${orderId}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, is_mine: false }];
        });
      } catch (err) {
        console.error("WS node data corruption:", err);
      }
    };

    return () => ws.close();
  }, [orderId, token, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");

    try {
      const res = await fetch(`${API}/chat/orders/${orderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
    } catch {
      setInput(body);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden flex flex-col h-[500px] shadow-2xl relative group">
      {/* Visual Status Indicator */}
      <div className="absolute top-0 right-0 p-4 z-20 flex items-center gap-2">
         <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
         <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{connected ? 'Stream Live' : 'Stream Offline'}</span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
         {messages.length === 0 && (
            <div className="h-full flex items-center justify-center opacity-40 italic text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Zero Data Transmitted in this Node</div>
         )}
         <AnimatePresence initial={false}>
            {messages.map((m) => (
               <motion.div 
                 key={m.id}
                 initial={{ opacity: 0, x: m.is_mine ? 10 : -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 className={`flex ${m.is_mine ? 'justify-end' : 'justify-start'}`}
               >
                  <div className={`max-w-[80%] space-y-1 ${m.is_mine ? 'items-end' : 'items-start'}`}>
                     {!m.is_mine && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest px-2">{m.sender_username}</span>}
                     <div className={`p-4 rounded-2xl text-[10px] font-bold leading-relaxed ${m.is_mine ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'}`}>
                        {m.body}
                     </div>
                     <time className="text-[7px] font-black text-slate-600 uppercase tracking-tighter italic px-2">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </time>
                  </div>
               </motion.div>
            ))}
         </AnimatePresence>
         <div ref={bottomRef} />
      </div>

      {/* Input Logic Surface */}
      <footer className="p-4 border-t border-white/5 bg-slate-950/20">
         <div className="flex gap-4 items-end bg-white/5 border border-white/10 rounded-2xl p-1 transition-all focus-within:border-indigo-500/50">
            <textarea 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
               placeholder="Transmit mission data..."
               className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] font-bold text-slate-200 p-3 resize-none h-12 scrollbar-hide"
            />
            <button 
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${input.trim() ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600'}`}
            >
               {sending ? '...' : 'Send'}
            </button>
         </div>
      </footer>
    </div>
  );
}
