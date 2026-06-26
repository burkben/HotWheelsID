/**
 * The decrypted MPID application layer — Protocol Buffers (package `MCPP.HWiD`).
 *
 * A minimal, dependency-free protobuf wire reader/writer plus the typed
 * `PortalToApp` model (events, device-info heartbeat, command responses) and
 * `AppToPortal` command builders. Ported from `python/hwportal/mpid.py`
 * (schema: `python/HWiD.proto`).
 */
import { parseNfcUid, parseSerialAscii } from "../decode";
import type { PortalEvent } from "../events";
import { concatBytes } from "./bytes";

// ---------------------------------------------------------------------------
// Wire-format reader
// ---------------------------------------------------------------------------
/** A decoded protobuf field value: varint (BigInt) or length-delimited/fixed bytes. */
export type WireValue = bigint | Uint8Array;

function readVarint(buf: Uint8Array, i: number): { value: bigint; next: number } {
  let shift = 0n;
  let result = 0n;
  for (;;) {
    const b = buf[i];
    i += 1;
    result |= BigInt(b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: result, next: i };
    shift += 7n;
    if (shift > 70n) return { value: result, next: i }; // malformed guard
  }
}

/**
 * Parse protobuf wire format into `field number → values[]`.
 * varint → BigInt; length-delimited / 32-/64-bit → raw bytes. Returns a partial
 * map on malformed input rather than throwing (mirrors the Python reference).
 */
export function parseFields(data: Uint8Array): Map<number, WireValue[]> {
  const out = new Map<number, WireValue[]>();
  let i = 0;
  const n = data.length;
  while (i < n) {
    const tag = readVarint(data, i);
    i = tag.next;
    const field = Number(tag.value) >>> 3;
    const wire = Number(tag.value) & 7;
    let value: WireValue;
    if (wire === 0) {
      const r = readVarint(data, i);
      value = r.value;
      i = r.next;
    } else if (wire === 2) {
      const r = readVarint(data, i);
      i = r.next;
      const len = Number(r.value);
      value = data.slice(i, i + len);
      i += len;
    } else if (wire === 5) {
      value = data.slice(i, i + 4);
      i += 4;
    } else if (wire === 1) {
      value = data.slice(i, i + 8);
      i += 8;
    } else {
      break; // unsupported wire type → stop
    }
    const list = out.get(field);
    if (list) list.push(value);
    else out.set(field, [value]);
  }
  return out;
}

function first(fields: Map<number, WireValue[]>, num: number): WireValue | undefined {
  return fields.get(num)?.[0];
}

function asInt(v: WireValue | undefined): number {
  return typeof v === "bigint" ? Number(v) : 0;
}

/** Interpret a protobuf int32 (possibly 64-bit sign-extended) as a signed JS number. */
function asS32(v: WireValue | undefined): number {
  if (typeof v !== "bigint") return 0;
  const u = ((v % 4294967296n) + 4294967296n) % 4294967296n;
  return Number(u >= 2147483648n ? u - 4294967296n : u);
}

function asF32(v: WireValue | undefined): number {
  if (v instanceof Uint8Array && v.length === 4) {
    return new DataView(v.buffer, v.byteOffset, v.byteLength).getFloat32(0, true);
  }
  return 0;
}

function asBytes(v: WireValue | undefined): Uint8Array {
  return v instanceof Uint8Array ? v : new Uint8Array(0);
}

function asText(v: WireValue | undefined): string {
  return v instanceof Uint8Array ? parseSerialAscii(v) : "";
}

// ---------------------------------------------------------------------------
// Enums (MCPP.HWiD)
// ---------------------------------------------------------------------------
export enum EventType {
  UNKNOWN = 0,
  LOW_BATTERY = 1,
  CAR_ON_PORTAL = 2,
  CAR_OFF_PORTAL = 3,
  CAR_DRIVE_BY = 4,
  CAR_HISTORY = 5,
  ACCESSORY_ATTACHED = 6,
  ACCESSORY_DETACHED = 7,
  ACCESSORY_IDENTIFIED = 8,
  IR_GATE_A_BLOCKED = 9,
  IR_GATE_B_BLOCKED = 10,
  IR_GATE_A_UNBLOCKED = 11,
  IR_GATE_B_UNBLOCKED = 12,
}

export enum DeviceMode {
  UNKNOWN = 0,
  FAST = 1,
  NORMAL = 2,
  TEST = 3,
}

export enum BatteryStatus {
  UNKNOWN = 0,
  NOT_CHARGING = 1,
  CHARGING = 2,
  FULL = 3,
  PROBLEM = 4,
}

export enum CommandType {
  UNKNOWN = 0,
  FAST_MODE = 1,
  NORMAL_MODE = 2,
  REQUEST_DEVICE_INFO = 3,
  TEST_MODE = 4,
  RESET = 5,
  START_OTA = 6,
  SET_LED_COLOR = 7,
  RESET_LED_CONTROL = 8,
  CLEAR_BONDING = 9,
}

function asEventType(v: number): EventType {
  return (EventType[v] !== undefined ? v : EventType.UNKNOWN) as EventType;
}
function asDeviceMode(v: number): DeviceMode {
  return (DeviceMode[v] !== undefined ? v : DeviceMode.UNKNOWN) as DeviceMode;
}
function asBatteryStatus(v: number): BatteryStatus {
  return (BatteryStatus[v] !== undefined ? v : BatteryStatus.UNKNOWN) as BatteryStatus;
}

// ---------------------------------------------------------------------------
// Structured model
// ---------------------------------------------------------------------------
export const SPEED_SCALE = 64;
/** Empirically-calibrated gate constant: raw_speed = K / (t_ir2_in − t_ir1_in). */
export const GATE_SPEED_CONSTANT = 114000;

/** Raw pass speed from the two gates' leading-edge timestamps (null if coincident). */
export function speedFromGates(tIr1In: number, tIr2In: number): number | null {
  const dt = tIr2In - tIr1In;
  return dt === 0 ? null : GATE_SPEED_CONSTANT / dt;
}

export interface CarInfo {
  /** `0x04` + 6-byte NFC UID. */
  readonly tagUid: Uint8Array;
  readonly signatureStatus: boolean;
  readonly carNdefData: Uint8Array;
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
}

export interface SpeedMeasurement {
  readonly timestampMs: number;
  /** Raw float; multiply by {@link SPEED_SCALE} for "1:64 scale mph". */
  readonly speed: number;
  readonly tIr1In: number;
  readonly tIr1Out: number;
  readonly tIr2In: number;
  readonly tIr2Out: number;
  readonly estimatedCarCount: number;
}

export interface DeviceInfo {
  readonly firmwareVersion: number;
  readonly hardwareVersion: number;
  readonly batteryLevel: number;
  readonly mode: DeviceMode;
  readonly bootTimestampSec: number;
  readonly serialNumber: string;
  readonly batteryStatus: BatteryStatus;
  readonly qValue: number;
  readonly iValue: number;
  readonly semanticFirmwareVersion: string;
  readonly accessoryAttached: boolean;
}

export interface PortalEventMessage {
  readonly type: EventType;
  readonly carInfo: CarInfo | null;
  readonly speedMeasurement: SpeedMeasurement | null;
  readonly accessoryId: number;
}

export interface CommandResponse {
  readonly failed: boolean;
  readonly failMessage: string;
}

/** A decrypted `PortalToApp` message. */
export interface PortalMessage {
  readonly timestampMs: number;
  readonly event: PortalEventMessage | null;
  readonly info: DeviceInfo | null;
  readonly cmdResponse: CommandResponse | null;
}

function parseCarInfo(b: Uint8Array): CarInfo {
  const f = parseFields(b);
  return {
    tagUid: asBytes(first(f, 1)),
    signatureStatus: asInt(first(f, 2)) !== 0,
    carNdefData: asBytes(first(f, 3)),
    signature: asBytes(first(f, 4)),
    publicKey: asBytes(first(f, 5)),
  };
}

function parseSpeedMeasurement(b: Uint8Array): SpeedMeasurement {
  const f = parseFields(b);
  return {
    timestampMs: asInt(first(f, 1)),
    speed: asF32(first(f, 2)),
    tIr1In: asS32(first(f, 3)),
    tIr1Out: asS32(first(f, 4)),
    tIr2In: asS32(first(f, 5)),
    tIr2Out: asS32(first(f, 6)),
    estimatedCarCount: asInt(first(f, 7)),
  };
}

function parseEvent(b: Uint8Array): PortalEventMessage {
  const f = parseFields(b);
  const carInfo = first(f, 2);
  const speed = first(f, 3);
  return {
    type: asEventType(asInt(first(f, 1))),
    carInfo: carInfo instanceof Uint8Array ? parseCarInfo(carInfo) : null,
    speedMeasurement: speed instanceof Uint8Array ? parseSpeedMeasurement(speed) : null,
    accessoryId: asInt(first(f, 6)),
  };
}

function parseDeviceInfo(b: Uint8Array): DeviceInfo {
  const f = parseFields(b);
  return {
    firmwareVersion: asInt(first(f, 1)),
    hardwareVersion: asInt(first(f, 2)),
    batteryLevel: asF32(first(f, 3)),
    mode: asDeviceMode(asInt(first(f, 4))),
    bootTimestampSec: asInt(first(f, 5)),
    serialNumber: asText(first(f, 6)),
    batteryStatus: asBatteryStatus(asInt(first(f, 7))),
    qValue: asInt(first(f, 8)),
    iValue: asInt(first(f, 9)),
    semanticFirmwareVersion: asText(first(f, 10)),
    accessoryAttached: asInt(first(f, 11)) !== 0,
  };
}

function parseCommandResponse(b: Uint8Array): CommandResponse {
  const f = parseFields(b);
  return { failed: asInt(first(f, 1)) !== 0, failMessage: asText(first(f, 2)) };
}

/** Parse a decrypted MPID payload into a structured `PortalToApp` message. */
export function parseMessage(payload: Uint8Array): PortalMessage {
  const f = parseFields(payload);
  const event = first(f, 2);
  const info = first(f, 3);
  const cmd = first(f, 4);
  return {
    timestampMs: asInt(first(f, 1)),
    event: event instanceof Uint8Array ? parseEvent(event) : null,
    info: info instanceof Uint8Array ? parseDeviceInfo(info) : null,
    cmdResponse: cmd instanceof Uint8Array ? parseCommandResponse(cmd) : null,
  };
}

// ---------------------------------------------------------------------------
// NDEF car-identity record (carried inside CarInfo.carNdefData)
// ---------------------------------------------------------------------------
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
  signature?: Uint8Array;
}

/** Decode an NFC NDEF URI record carrying the car identity. */
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

// ---------------------------------------------------------------------------
// Bridge: a structured PortalMessage → the app's PortalEvent[] stream
// ---------------------------------------------------------------------------
/**
 * Map a decrypted message to the app's {@link PortalEvent} union (the same
 * stream the legacy-firmware decoders feed), so the UI is transport-agnostic.
 * Car-off → `carRemoved`; car-on → `carDetected`; a speed measurement →
 * `speed` (falling back to the gate-times reconstruction when the portal omits
 * its own speed, e.g. a non-chipped pass).
 */
export function mpidToPortalEvents(msg: PortalMessage): PortalEvent[] {
  const events: PortalEvent[] = [];
  const ev = msg.event;
  if (!ev) return events;

  if (ev.type === EventType.CAR_OFF_PORTAL) {
    events.push({ kind: "carRemoved" });
  } else if (ev.carInfo && ev.carInfo.tagUid.length >= 7) {
    const detected: { kind: "carDetected"; uid: string; mattelId?: string } = {
      kind: "carDetected",
      uid: parseNfcUid(ev.carInfo.tagUid),
    };
    if (ev.carInfo.carNdefData.length > 0) {
      const mattelId = decodeNdefRecord(ev.carInfo.carNdefData).mattelId;
      if (mattelId) detected.mattelId = mattelId;
    }
    events.push(detected);
  }

  const sm = ev.speedMeasurement;
  if (sm) {
    let speed = sm.speed;
    if (speed === 0) {
      const recon = speedFromGates(sm.tIr1In, sm.tIr2In);
      if (recon) speed = Math.abs(recon);
    }
    events.push({ kind: "speed", raw: speed, scaleMph: speed * SPEED_SCALE });
  }
  return events;
}

// ---------------------------------------------------------------------------
// AppToPortal command builders
// ---------------------------------------------------------------------------
function encodeUvarint(n: number): Uint8Array {
  const out: number[] = [];
  for (;;) {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) b |= 0x80;
    out.push(b);
    if (!n) break;
  }
  return Uint8Array.from(out);
}

function encodeVarintField(field: number, value: number): Uint8Array {
  return concatBytes(encodeUvarint(field << 3), encodeUvarint(value));
}

function encodeBytesField(field: number, value: Uint8Array): Uint8Array {
  return concatBytes(encodeUvarint((field << 3) | 2), encodeUvarint(value.length), value);
}

export interface BuildCommandOptions {
  readonly rgbColor?: Uint8Array;
  readonly otaSignature?: Uint8Array;
  readonly otaPublicKey?: Uint8Array;
}

/** Build an `AppToPortal` protobuf carrying a `Command` (send via the TX path). */
export function buildCommand(cmdType: CommandType, options: BuildCommandOptions = {}): Uint8Array {
  let cmd = encodeVarintField(1, cmdType);
  if (options.otaSignature) cmd = concatBytes(cmd, encodeBytesField(2, options.otaSignature));
  if (options.otaPublicKey) cmd = concatBytes(cmd, encodeBytesField(3, options.otaPublicKey));
  if (options.rgbColor) cmd = concatBytes(cmd, encodeBytesField(4, options.rgbColor));
  return encodeBytesField(2, cmd); // AppToPortal.command = field 2
}

export function cmdRequestDeviceInfo(): Uint8Array {
  return buildCommand(CommandType.REQUEST_DEVICE_INFO);
}

export function cmdSetLedColor(r: number, g: number, b: number): Uint8Array {
  return buildCommand(CommandType.SET_LED_COLOR, {
    rgbColor: Uint8Array.from([r & 0xff, g & 0xff, b & 0xff]),
  });
}

export function cmdResetLed(): Uint8Array {
  return buildCommand(CommandType.RESET_LED_CONTROL);
}

export function cmdSetMode(mode: DeviceMode): Uint8Array {
  const map: Partial<Record<DeviceMode, CommandType>> = {
    [DeviceMode.FAST]: CommandType.FAST_MODE,
    [DeviceMode.NORMAL]: CommandType.NORMAL_MODE,
    [DeviceMode.TEST]: CommandType.TEST_MODE,
  };
  return buildCommand(map[mode] ?? CommandType.NORMAL_MODE);
}

export function cmdReset(): Uint8Array {
  return buildCommand(CommandType.RESET);
}

export function cmdClearBonding(): Uint8Array {
  return buildCommand(CommandType.CLEAR_BONDING);
}
