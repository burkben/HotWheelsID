/**
 * Shared transport contracts for the portal event sources.
 *
 * Both the Phase 2 mock generator and the Phase 1 BLE client implement
 * {@link PortalTransport}: they decode portal bytes into {@link PortalEvent}s and
 * push them into the Zustand store via `dispatch`, plus drive the connection
 * lifecycle via `setConnection`. The store stays transport-agnostic, so swapping
 * the mock for real BLE is just swapping which transport is `start()`ed.
 */
import type { PortalEvent } from "@hotwheelsid/protocol";
import type { ConnectionState } from "../store/portalStore";

export type TransportDispatch = (event: PortalEvent) => void;
export type TransportSetConnection = (state: ConnectionState) => void;

/** The minimal lifecycle every event source exposes. */
export interface PortalTransport {
  start: () => void | Promise<void>;
  stop: () => void | Promise<void>;
}

/**
 * Fine-grained BLE lifecycle phase, surfaced on the Live screen's status line.
 * Richer than the store's three-state `connection` so the UI can explain *why*
 * it is not connected (adapter off, permission denied, simulator, …).
 */
export type BlePhase =
  | "idle"
  | "unsupported"
  | "poweredOff"
  | "unauthorized"
  | "scanning"
  | "connecting"
  | "discovering"
  | "connected"
  | "locked"
  | "reconnecting"
  | "error";

export type BleLogLevel = "info" | "event" | "error";

/** One line in the Live screen's raw event log (parity with monitor.py). */
export interface BleLogEntry {
  readonly id: number;
  readonly at: number;
  readonly level: BleLogLevel;
  readonly message: string;
}

export interface BlePortalCallbacks {
  readonly dispatch: TransportDispatch;
  readonly setConnection: TransportSetConnection;
  /** Notified on every BLE phase transition. */
  readonly onPhase?: (phase: BlePhase) => void;
  /** Notified for each human-readable log line (scan hits, events, errors). */
  readonly onLog?: (entry: BleLogEntry) => void;
}

export interface BlePortalOptions extends BlePortalCallbacks {
  /** Reconnect automatically after an unexpected drop. Default `true`. */
  readonly autoReconnect?: boolean;
}
