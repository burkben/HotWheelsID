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
import type { ControlStatus, PortalEvent, SpeedSample } from "@redlineid/protocol";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface CurrentCar {
  readonly uid: string;
  readonly serial?: string;
  /** The on-portal car's base64url Mattel id (when the NFC record decoded one). */
  readonly mattelId?: string;
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
/**
 * A single physical crossing can't produce two passes this fast — a car cannot
 * cross the gate twice within a few hundred milliseconds. Real portal hardware
 * delivers two `speed` events per crossing (a BLE notification echo / firmware
 * double-send) within a few ms with identical readings, so a same-speed event
 * inside this window is treated as a duplicate indication, not a new pass.
 */
const PASS_DEDUPE_MS = 250;

let passCounter = 0;
let lastPassAt = 0;
let lastPassRaw = Number.NaN;

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
    set((s) => {
      if (connection === "disconnected") {
        lastPassAt = 0;
        lastPassRaw = Number.NaN;
        return { ...initialState, connection };
      }
      return { connection: connection === s.connection ? s.connection : connection };
    }),

  dispatch: (event) =>
    set((state) => {
      switch (event.kind) {
        case "carDetected":
          return {
            car: { uid: event.uid, serial: state.car?.serial, mattelId: event.mattelId },
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
          const now = Date.now();
          if (now - lastPassAt < PASS_DEDUPE_MS && Math.abs(event.raw - lastPassRaw) < 1e-6) {
            return { lastSpeed: sample };
          }
          lastPassAt = now;
          lastPassRaw = event.raw;
          const pass: Pass = {
            id: ++passCounter,
            uid: state.car?.uid,
            raw: event.raw,
            scaleMph: event.scaleMph,
            at: now,
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

  reset: () =>
    set(() => {
      lastPassAt = 0;
      lastPassRaw = Number.NaN;
      return { ...initialState };
    }),
}));
