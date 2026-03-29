"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./OrderChat.module.css";

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

  // Load history
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/orders/${orderId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silently ignore
    }
  }, [orderId, token]);

  // Connect WebSocket
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
          // Avoid duplicate if we already have it from REST optimistic insert
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, is_mine: false }];
        });
      } catch {
        // ignore malformed
      }
    };

    return () => {
      ws.close();
    };
  }, [orderId, token, loadMessages]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const body = input.trim();
    if (!body) return;
    setSending(true);
    setInput("");

    try {
      const res = await fetch(`${API}/chat/orders/${orderId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
    } catch {
      setInput(body); // restore on error
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet. Start the conversation.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.bubble} ${m.is_mine ? styles.mine : styles.theirs}`}
          >
            {!m.is_mine && (
              <span className={styles.sender}>{m.sender_username}</span>
            )}
            <p className={styles.body}>{m.body}</p>
            <time className={styles.time}>
              {new Date(m.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <div className={`${styles.indicator} ${connected ? styles.online : styles.offline}`} />
        <textarea
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={2}
        />
        <button
          className={styles.sendBtn}
          onClick={sendMessage}
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
