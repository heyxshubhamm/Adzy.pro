"use client";
import { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { marketplaceApi } from '@/store/api';
import { AppDispatch } from '@/store';

interface TelemetryPulse {
  type: "PULSE" | "ALERT";
  timestamp: number;
  data: any;
}

export function useDashboardWebSocket() {
  const [pulse, setPulse] = useState<TelemetryPulse | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const dispatch = useDispatch<AppDispatch>();

  const connect = useCallback(() => {
    // Determine the environment-specific WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/admin/telemetry/ws`;
    
    console.log("[Telemetry] Connecting to pulse stream...", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("[Telemetry] Link Active");
      setStatus("open");
    };

    ws.onmessage = (event) => {
      try {
        const message: TelemetryPulse = JSON.parse(event.data);
        setPulse(message);

        // Logic-based cache invalidation
        if (message.type === "PULSE") {
          // Manually update the 'getDashboard' cache with the pulse data
          dispatch(
            marketplaceApi.util.updateQueryData('getDashboard', undefined, (draft) => {
              Object.assign(draft, message.data);
            })
          );
        }

        if (message.type === "ALERT" || message.data?.open_fraud_alerts > 0) {
          // If a new risk incident is detected, refetch fraud alerts
          dispatch(marketplaceApi.util.invalidateTags(['FraudAlert']));
        }
      } catch (err) {
        console.error("[Telemetry] Pulse format error", err);
      }
    };

    ws.onclose = () => {
      console.log("[Telemetry] Link Lost. Retrying in 5s...");
      setStatus("closed");
      setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error("[Telemetry] Link Error:", err);
      ws.close();
    };

    return ws;
  }, [dispatch]);

  useEffect(() => {
    const ws = connect();
    return () => ws.close();
  }, [connect]);

  return { pulse, status };
}
