import { create } from "zustand";

export type PersistenceMode = "initializing" | "durable" | "partial" | "memory";
export type PersistenceDegradedReason = "unavailable" | "initFailed";
export const PERSISTENCE_DOMAINS = [
  "Race",
  "Garage",
  "History",
  "Settings",
  "Achievements",
  "Identity",
] as const;
export type PersistenceDomain = (typeof PERSISTENCE_DOMAINS)[number];

interface PersistenceStatusState {
  mode: PersistenceMode;
  reason: PersistenceDegradedReason | null;
  degradedDomains: PersistenceDomain[];
  setDurable: () => void;
  setMemory: (reason: PersistenceDegradedReason) => void;
  setPartial: (domains: PersistenceDomain[]) => void;
  reset: () => void;
}

export const usePersistenceStatusStore = create<PersistenceStatusState>((set) => ({
  mode: "initializing",
  reason: null,
  degradedDomains: [],
  setDurable: () => set({ mode: "durable", reason: null, degradedDomains: [] }),
  setMemory: (reason) => set({ mode: "memory", reason, degradedDomains: [] }),
  setPartial: (degradedDomains) =>
    set({ mode: "partial", reason: "initFailed", degradedDomains }),
  reset: () => set({ mode: "initializing", reason: null, degradedDomains: [] }),
}));
