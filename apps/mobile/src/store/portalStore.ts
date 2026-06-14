/**
 * Runtime portal store (Zustand).
 *
 * This is the single source of truth the UI renders from. It is **transport
 * agnostic**: it consumes already-decoded {@link PortalEvent}s via `dispatch`,
 * exactly the shape the real BLE layer (Phase 1) and the mock generator
 * (Phase 2a) both produce. The store never imports BLE or React Native.
 *
 * Per ADR-0006, high-frequency *animation* values live in a Reanimated shared
 * value inside the gauge; this store holds the discrete, render-worthy state
 * (connection, current car, last/best speed, recent passes).
 */
import { create } from "zustand";
import type { ControlStatus, PortalEvent, SpeedSample } from "@hotwheelsid/protocol";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface CurrentCar {
  readonly uid: string;
  readonly serial?: string;
}

/** One recorded pass of a car over the portal sensor. */
export interface Pass {
  readonly id: number;
  readonly uid?: string;
  readonly raw: number;
  readonly scaleMph: number;
  readonly at: number;
}

const MAX_PASSES = 20;
/** Ignore noise/zero readings when recording a pass. */
const PASS_MIN_MPH = 1;

let passCounter = 0;

export interface PortalState {
  connection: ConnectionState;
  controlStatus: ControlStatus | null;
  car: CurrentCar | null;
  lastSpeed: SpeedSample | null;
  bestMph: number;
  passes: Pass[];

  /** Set the connection lifecycle state (driven by the BLE/mock layer). */
  setConnection: (state: ConnectionState) => void;
  /** Reduce a single decoded portal event into state. */
  dispatch: (event: PortalEvent) => void;
  /** Clear all session state back to defaults. */
  reset: () => void;
}

const initialState = {
  connection: "disconnected" as ConnectionState,
  controlStatus: null as ControlStatus | null,
  car: null as CurrentCar | null,
  lastSpeed: null as SpeedSample | null,
  bestMph: 0,
  passes: [] as Pass[],
};

export const usePortalStore = create<PortalState>((set) => ({
  ...initialState,

  setConnection: (connection) =>
    set((s) =>
      connection === "disconnected"
        ? { ...initialState, connection }
        : { connection: connection === s.connection ? s.connection : connection },
    ),

  dispatch: (event) =>
    set((state) => {
      switch (event.kind) {
        case "carDetected":
          return {
            car: { uid: event.uid, serial: state.car?.serial },
          };

        case "serial":
          return {
            car: { uid: state.car?.uid ?? "", serial: event.serial },
          };

        case "carRemoved":
          return { car: null, lastSpeed: null, controlStatus: "idle" };

        case "control":
          return { controlStatus: event.status };

        case "speed": {
          const sample: SpeedSample = { raw: event.raw, scaleMph: event.scaleMph };
          if (event.scaleMph < PASS_MIN_MPH) {
            return { lastSpeed: sample };
          }
          const pass: Pass = {
            id: ++passCounter,
            uid: state.car?.uid,
            raw: event.raw,
            scaleMph: event.scaleMph,
            at: Date.now(),
          };
          return {
            lastSpeed: sample,
            bestMph: Math.max(state.bestMph, event.scaleMph),
            passes: [pass, ...state.passes].slice(0, MAX_PASSES),
          };
        }

        case "unknown":
        default:
          return {};
      }
    }),

  reset: () => set({ ...initialState }),
}));
