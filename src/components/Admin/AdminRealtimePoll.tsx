"use client";
import { useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";
import { apiFetch } from "@/lib/apiFetch";

export function AdminRealtimePoll() {
  const setStats = useAdminStore(s => s.setRealtimeStats);

  useEffect(() => {
    async function poll() {
      try {
        const data = await apiFetch<any>("/admin/analytics/realtime");
        setStats(data);
      } catch { }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [setStats]);

  return null;
}
