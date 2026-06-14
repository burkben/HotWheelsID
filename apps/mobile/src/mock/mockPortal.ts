/**
 * Mock Hot Wheels id portal — a hardware-free event source for UI development.
 *
 * Crucially, it does **not** fabricate {@link PortalEvent}s directly. It builds
 * the same raw byte payloads the real portal sends and decodes them with the
 * production `parseCharacteristicValue` from `@hotwheelsid/protocol`. That means
 * the entire UI runs against the *actual* protocol pipeline — the only thing
 * Phase 1 swaps in is the BLE transport that produces those same bytes.
 *
 * See `docs/architecture/ui-and-design.md` §6 ("Build-before-hardware").
 */
import {
  CHAR_CONTROL,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_SERIAL_NUMBER,
  parseCharacteristicValue,
  type PortalEvent,
} from "@hotwheelsid/protocol";

type Dispatch = (event: PortalEvent) => void;
type SetConnection = (state: "disconnected" | "connecting" | "connected") => void;

export interface MockPortal {
  /** Begin the simulated connect → detect → periodic-passes lifecycle. */
  start: () => void;
  /** Stop timers and emit a disconnect. */
  stop: () => void;
  /** Fire a single pass immediately (wired to the demo "Trigger pass" button). */
  triggerPass: (scaleMph?: number) => void;
}

export interface MockPortalOptions {
  dispatch: Dispatch;
  setConnection: SetConnection;
  /** Average gap between auto-generated passes (ms). */
  passIntervalMs?: number;
  /** Optional fixed RNG for deterministic demos/tests. */
  random?: () => number;
}

// --- byte encoders (inverse of the decoders in @hotwheelsid/protocol) ---

/** `0x04` + 6-byte NFC UID, as sent on event channel 2. */
function encodeUid(uid: readonly number[]): Uint8Array {
  return Uint8Array.from([0x04, ...uid]);
}

/** Little-endian IEEE-754 float32, as sent on event channel 3. */
function encodeSpeedRaw(raw: number): Uint8Array {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, raw, /* littleEndian */ true);
  return new Uint8Array(buf);
}

/** ASCII serial bytes, as sent on the serial-number characteristic. */
function encodeAscii(text: string): Uint8Array {
  return Uint8Array.from(Array.from(text, (c) => c.charCodeAt(0) & 0xff));
}

const CONTROL_IDLE = Uint8Array.from([0x00, 0xfe, 0x00, 0xfe, 0x00]);
const CONTROL_CAR_PRESENT = Uint8Array.from([0x00, 0xfe, 0x00, 0xfe, 0x02]);

/** A believable demo car. */
const DEMO_UID = [0x6c, 0xc4, 0x5a, 0x2b, 0x64, 0x81] as const; // → 6C:C4:5A:2B:64:81
const DEMO_SERIAL = "1102032557";

export function createMockPortal({
  dispatch,
  setConnection,
  passIntervalMs = 3200,
  random = Math.random,
}: MockPortalOptions): MockPortal {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let passLoop: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };

  const emit = (uuid: string, bytes: Uint8Array) => {
    dispatch(parseCharacteristicValue(uuid, bytes));
  };

  const triggerPass: MockPortal["triggerPass"] = (scaleMph) => {
    if (!running) return;
    // Default: a random pass roughly across the dial (40..285 scale mph).
    const mph = scaleMph ?? 40 + random() * 245;
    emit(CHAR_EVENT_3, encodeSpeedRaw(mph / 64)); // scaleMph = raw * 64
  };

  const start: MockPortal["start"] = () => {
    if (running) return;
    running = true;

    setConnection("connecting");
    later(() => {
      if (!running) return;
      setConnection("connected");
      emit(CHAR_CONTROL, CONTROL_IDLE);
    }, 600);

    // Car placed on the portal shortly after connecting.
    later(() => {
      if (!running) return;
      emit(CHAR_EVENT_2, encodeUid(DEMO_UID));
      emit(CHAR_SERIAL_NUMBER, encodeAscii(DEMO_SERIAL));
      emit(CHAR_CONTROL, CONTROL_CAR_PRESENT);
    }, 1200);

    // First pass, then a self-scheduling loop with mild jitter.
    later(() => triggerPass(), 2000);
    passLoop = setInterval(
      () => triggerPass(),
      passIntervalMs + Math.round((random() - 0.5) * 1200),
    );
  };

  const stop: MockPortal["stop"] = () => {
    running = false;
    if (passLoop) {
      clearInterval(passLoop);
      passLoop = null;
    }
    for (const t of timers) clearTimeout(t);
    timers.clear();
    setConnection("disconnected");
  };

  return { start, stop, triggerPass };
}
