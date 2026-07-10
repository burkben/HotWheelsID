import { create } from "zustand";

export type PersistenceMode = "initializing" | "durable" | "memory";
export type PersistenceDegradedReason = "unavailable" | "initFailed";

interface PersistenceStatusState {
  mode: PersistenceMode;
  reason: PersistenceDegradedReason | null;
  setDurable: () => void;
  setMemory: (reason: PersistenceDegradedReason) => void;
  reset: () => void;
}

export const usePersistenceStatusStore = create<PersistenceStatusState>((set) => ({
  mode: "initializing",
  reason: null,
  setDurable: () => set({ mode: "durable", reason: null }),
  setMemory: (reason) => set({ mode: "memory", reason }),
  reset: () => set({ mode: "initializing", reason: null }),
}));
