"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./VerifyEmail.module.css";
import { ResendButton } from "@/components/ResendButton";

// Layer 1: Identity Activation Loop (Email Verification)
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Authenticating your marketplace unit...");

  useEffect(() => {
    const token   = searchParams.get("token");
    const userId  = searchParams.get("user_id");

    if (!token || !userId) {
      setStatus("error");
      setMessage("System loop failure: Missing identification telemetry.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/verify-email?token=${token}&user_id=${userId}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("Identity confirmed. System access granted.");
          setTimeout(() => router.push("/login?verified=1"), 3000);
        } else {
          setStatus("error");
          setMessage(data.detail || "Authentication handshake failed.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Connection to identity core interrupted.");
      }
    }

    verify();
  }, [searchParams, router]);

  return (
    <div className={styles.card}>
      <div className={styles.logo}>Adzy.pro Intelligence</div>
      <h1 className={styles.title}>System Verification</h1>
      <p className={styles.status}>{message}</p>
      
      {status === "verifying" && <div className={styles.pulse}></div>}
      {status === "success" && <div className={styles.check}>✓</div>}
      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <div className={styles.retry} onClick={() => window.location.reload()}>Retry Handshake</div>
          <ResendButton />
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
