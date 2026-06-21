/**
 * Garage store (Zustand) — the in-memory mirror of the durable car collection
 * the Garage screens render from (ADR-0006, Phase 3).
 *
 * Mirrors {@link useRaceStore}: it holds render-worthy state only, imports no BLE
 * or React Native, and applies the *same* pure reducers as the repository
 * ({@link applyDetection} et al.). Durability is layered on through
 * {@link setGaragePersistence} sinks that the app bootstrap wires to an
 * `expo-sqlite` repository; tests/CI leave the sinks unset, keeping this reducer
 * pure. The portal→garage bridge (also in the bootstrap) calls these actions when
 * the runtime portal store sees a car or a speed pass.
 */
import { create } from "zustand";

import {
  applyDetection,
  applyIdentity,
  applyName,
  applySerial,
  applySpeed,
  sortCars,
  type CarRecord,
  type DetectionInput,
  type IdentityInput,
  type SpeedInput,
} from "./persistence/carRepository";

/**
 * Optional durability hooks, set by the app bootstrap so collection changes are
 * written through. Left unset in tests/CI, keeping the reducer pure. Mirrors the
 * module-level handoff used by `raceStore`.
 */
export interface GaragePersistence {
  onDetection?: (input: DetectionInput) => void;
  onSerial?: (uid: string, serial: string) => void;
  onSpeed?: (input: SpeedInput) => void;
  onIdentity?: (input: IdentityInput) => void;
  onRename?: (uid: string, name: string | null) => void;
  onClear?: () => void;
}

let persistence: GaragePersistence = {};

export function setGaragePersistence(next: GaragePersistence | null): void {
  persistence = next ?? {};
}

export interface GarageStore {
  /** The collection, most-recently-seen first. */
  cars: CarRecord[];

  /** Replace the collection from durable storage (called once on startup). */
  hydrate: (cars: CarRecord[]) => void;
  /** A car was placed on the portal. */
  recordDetection: (input: DetectionInput) => void;
  /** A late serial arrived for an already-detected car. */
  recordSerial: (uid: string, serial: string) => void;
  /** A speed pass for the current car. */
  recordSpeed: (input: SpeedInput) => void;
  /** A car broadcast its Mattel casting identity. */
  recordIdentity: (input: IdentityInput) => void;
  /** Set or clear a car's nickname. */
  rename: (uid: string, name: string | null) => void;
  /** Forget the whole garage. */
  forgetAll: () => void;
}

export const useGarageStore = create<GarageStore>((set) => ({
  cars: [],

  hydrate: (cars) => set({ cars: sortCars(cars) }),

  recordDetection: (input) => {
    set((s) => ({ cars: sortCars(applyDetection(s.cars, input)) }));
    persistence.onDetection?.(input);
  },

  recordSerial: (uid, serial) => {
    set((s) => ({ cars: sortCars(applySerial(s.cars, uid, serial)) }));
    persistence.onSerial?.(uid, serial);
  },

  recordSpeed: (input) => {
    set((s) => ({ cars: sortCars(applySpeed(s.cars, input)) }));
    persistence.onSpeed?.(input);
  },

  recordIdentity: (input) => {
    set((s) => ({ cars: sortCars(applyIdentity(s.cars, input)) }));
    persistence.onIdentity?.(input);
  },

  rename: (uid, name) => {
    set((s) => ({ cars: sortCars(applyName(s.cars, uid, name)) }));
    persistence.onRename?.(uid, name);
  },

  forgetAll: () => {
    set({ cars: [] });
    persistence.onClear?.();
  },
}));

/** Select a single car by uid (for the detail screen). */
export function selectCar(uid: string) {
  return (s: GarageStore): CarRecord | undefined => s.cars.find((c) => c.uid === uid);
}
