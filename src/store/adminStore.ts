import { create } from "zustand";

interface RealtimeStats {
  timestamp: string;
  orders_this_hour: number;
  gmv_this_hour: number;
}

interface AdminStore {
  realtimeStats: RealtimeStats | null;
  setRealtimeStats: (stats: RealtimeStats) => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  realtimeStats: null,
  setRealtimeStats: (stats) => set({ realtimeStats: stats }),
}));
