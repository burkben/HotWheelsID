/**
 * Pure byte-level decoders for the Hot Wheels id Race Portal protocol.
 *
 * Every function here is transport-agnostic: it operates on `Uint8Array`s and
 * has no dependency on React Native, BLE libraries, the DOM, or Node APIs.
 * The BLE layer is responsible for converting base64 characteristic values to
 * `Uint8Array` before calling {@link parseCharacteristicValue}.
 *
 * See `PROTOCOL.md` (repo root) for the canonical byte formats and sample
 * vectors that the unit tests assert against.
 */
import {
  CHAR_CONTROL,
  CHAR_EVENT_1,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_SERIAL_NUMBER,
} from "./uuids";
import type { ControlStatus, PortalEvent } from "./events";

/** Format bytes as uppercase hex, joined by `separator` (default `":"`). */
export function bytesToHex(bytes: Uint8Array, separator = ":"): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(
    separator,
  );
}

/**
 * Decode a car-detection payload (`0x04` followed by a 6-byte NFC UID) into a
 * colon-separated uppercase hex string, e.g. `6C:C4:5A:2B:64:81`.
 */
export function parseNfcUid(bytes: Uint8Array): string {
  return bytesToHex(bytes.slice(1, 7));
}

export interface SpeedSample {
  /** Raw little-endian IEEE-754 float32 value from the portal. */
  readonly raw: number;
  /** `raw * 64` — "scale mph". Relative until calibrated against a known speed. */
  readonly scaleMph: number;
}

/** Decode a 4-byte little-endian float32 speed sample (and its ×64 "scale mph"). */
export function parseSpeed(bytes: Uint8Array): SpeedSample {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const raw = view.getFloat32(0, /* littleEndian */ true);
  return { raw, scaleMph: raw * 64 };
}

/**
 * Decode an ASCII byte string (serial numbers, NDEF URIs). Implemented without
 * `TextDecoder` to keep the package free of DOM/Node lib dependencies; portal
 * serials and Mattel ids are ASCII.
 */
export function parseSerialAscii(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

const CONTROL_IDLE: readonly number[] = [0x00, 0xfe, 0x00, 0xfe, 0x00];
const CONTROL_CAR_PRESENT: readonly number[] = [0x00, 0xfe, 0x00, 0xfe, 0x02];

function bytesEqual(a: Uint8Array, b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < b.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Map a 5-byte control-register value to a {@link ControlStatus}.
 * Documented patterns: `00 fe 00 fe 00` → idle, `00 fe 00 fe 02` → carPresent,
 * `00 72 9b fe 00` → transitional. Any other value is treated as transitional.
 */
export function parseControlStatus(bytes: Uint8Array): ControlStatus {
  if (bytesEqual(bytes, CONTROL_IDLE)) return "idle";
  if (bytesEqual(bytes, CONTROL_CAR_PRESENT)) return "carPresent";
  return "transitional";
}

/**
 * Decode a single BLE characteristic indication into a typed {@link PortalEvent},
 * dispatching on the source characteristic `uuid` (case-insensitive).
 *
 * NDEF/Mattel car-id parsing on `CHAR_EVENT_1` is not yet implemented; a
 * non-empty value is returned as an `unknown` event carrying the raw bytes.
 */
export function parseCharacteristicValue(uuid: string, bytes: Uint8Array): PortalEvent {
  switch (uuid.toLowerCase()) {
    case CHAR_EVENT_2:
      return bytes.length === 0
        ? { kind: "carRemoved" }
        : { kind: "carDetected", uid: parseNfcUid(bytes) };

    case CHAR_EVENT_3:
      return { kind: "speed", ...parseSpeed(bytes) };

    case CHAR_SERIAL_NUMBER:
      return bytes.length === 0
        ? { kind: "carRemoved" }
        : { kind: "serial", serial: parseSerialAscii(bytes) };

    case CHAR_CONTROL:
      return { kind: "control", status: parseControlStatus(bytes), bytes };

    case CHAR_EVENT_1:
      // NDEF car-id record; empty payload also signals removal.
      return bytes.length === 0
        ? { kind: "carRemoved" }
        : { kind: "unknown", uuid, bytes };

    default:
      return { kind: "unknown", uuid, bytes };
  }
}
