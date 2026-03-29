"use client";
import { useState, useEffect } from "react";

export function ResendButton({ email }: { email?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "cooldown">("idle");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");

  async function resend() {
    setStatus("sending");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(email ? { email } : {}),
      });
      const data = await res.json();

      if (res.status === 429) {
        setStatus("cooldown");
        setCooldown(120); // 2 minutes
        return;
      }

      if (res.ok) {
        setMessage(data.message || "Email sent! Check your inbox.");
        setStatus("sent");
        setTimeout(() => setStatus("idle"), 5000);
      } else {
        setMessage(data.detail || "Failed to send. Try again.");
        setStatus("error");
      }
    } catch (err) {
      setMessage("Failed to send. Try again.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "cooldown" && cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    } else if (cooldown <= 0 && status === "cooldown") {
      setStatus("idle");
    }
    return () => clearInterval(interval);
  }, [status, cooldown]);

  return (
    <div className="flex flex-col items-center">
      {status === "idle" && (
        <button
          onClick={resend}
          className="text-blue-500 hover:text-blue-400 font-semibold text-sm transition-colors border-b border-blue-500/20"
        >
          Resend verification email
        </button>
      )}
      {status === "sending" && (
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
          Sending...
        </div>
      )}
      {status === "sent" && (
        <p className="text-emerald-500 text-sm font-medium">{message || "Email sent! Check your inbox."}</p>
      )}
      {status === "error" && (
        <div className="text-center">
          <p className="text-rose-500 text-sm mb-2">{message || "Failed to send."}</p>
          <button onClick={resend} className="text-rose-400 hover:text-rose-300 font-semibold text-sm transition-colors">
            Try again
          </button>
        </div>
      )}
      {status === "cooldown" && (
        <p className="text-slate-500 text-sm">
          Please wait <span className="text-white font-mono">{cooldown}s</span> before resending.
        </p>
      )}
    </div>
  );
}
