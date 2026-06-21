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
import { bytesFromBase64 } from "./base64";
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

// ---------------------------------------------------------------------------
// NFC NDEF car-identity record
// ---------------------------------------------------------------------------
/** NDEF URI-record prefix codes (the subset the portal emits). */
const URI_PREFIXES: Record<number, string> = {
  0x00: "",
  0x01: "http://www.",
  0x02: "https://www.",
  0x03: "http://",
  0x04: "https://",
};

export interface NdefRecord {
  uri?: string;
  /** The base64url Mattel car id from a `https://www.pid.mattel/<id>` URI. */
  mattelId?: string;
  /** Trailing signature bytes after the NDEF record, when present. */
  signature?: Uint8Array;
}

/**
 * Decode an NFC NDEF URI record carrying the car identity. The same record shape
 * is used by both firmwares: it arrives raw on the legacy `CHAR_EVENT_1`
 * characteristic and inside `CarInfo.carNdefData` on modern (MPID) firmware.
 */
export function decodeNdefRecord(data: Uint8Array): NdefRecord {
  if (data.length < 10) return {};
  const typeLen = data[1];
  const payloadLen = data[2];
  const recordType = data.slice(3, 3 + typeLen);
  const result: NdefRecord = {};

  if (recordType.length === 1 && recordType[0] === 0x55 /* 'U' */) {
    const prefix = URI_PREFIXES[data[4]] ?? "";
    const uriContent = parseSerialAscii(data.slice(5, 4 + payloadLen));
    const fullUri = prefix + uriContent;
    result.uri = fullUri;
    const marker = "pid.mattel/";
    const idx = fullUri.indexOf(marker);
    if (idx >= 0) result.mattelId = fullUri.slice(idx + marker.length);
  }

  const ndefEnd = 4 + payloadLen;
  if (data.length > ndefEnd) result.signature = data.slice(ndefEnd);
  return result;
}

/** The structured contents of a decoded Mattel car id (see {@link decodeMattelCarId}). */
export interface MattelCarId {
  /** The original base64url id string. */
  readonly id: string;
  /** 4-byte casting/model id as uppercase hex (e.g. `41AE5E5B`); shared by every copy. */
  readonly modelId: string;
  /** NFC UID embedded in the id (last 6 bytes), colon-separated (e.g. `2A:7E:A2:F1:62:80`). */
  readonly uid: string;
  /** The decoded raw bytes. */
  readonly bytes: Uint8Array;
}

/**
 * Decode a Mattel car id (the base64url tail of `https://www.pid.mattel/<id>`)
 * into its casting id and embedded NFC UID. Layout (21 bytes, see `PROTOCOL.md`):
 * `[version:2][modelId:4][flags:4][extra:5][nfcUid:6]`.
 *
 * Returns `null` for ids that can't be decoded or are too short to carry both a
 * casting id and a UID (matches the "degrade, don't throw" style of the decoders).
 */
export function decodeMattelCarId(id: string): MattelCarId | null {
  let bytes: Uint8Array;
  try {
    bytes = bytesFromBase64(id);
  } catch {
    return null;
  }
  if (bytes.length < 12) return null;
  return {
    id,
    modelId: bytesToHex(bytes.slice(2, 6), ""),
    uid: bytesToHex(bytes.slice(-6)),
    bytes,
  };
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
 * A non-empty `CHAR_EVENT_1` (NFC NDEF) value is decoded into a `carIdentity`
 * event when it carries a recognizable Mattel car id; an empty value signals
 * removal. Anything that can't be decoded falls back to an `unknown` event.
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

    case CHAR_EVENT_1: {
      // NDEF car-id record; empty payload also signals removal.
      if (bytes.length === 0) return { kind: "carRemoved" };
      const ndef = decodeNdefRecord(bytes);
      const id = ndef.mattelId ? decodeMattelCarId(ndef.mattelId) : null;
      if (ndef.mattelId && id) {
        return { kind: "carIdentity", uid: id.uid, mattelId: ndef.mattelId, modelId: id.modelId };
      }
      return { kind: "unknown", uuid, bytes };
    }

    default:
      return { kind: "unknown", uuid, bytes };
  }
}
