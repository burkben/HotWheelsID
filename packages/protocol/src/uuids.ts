/**
 * Hot Wheels id Race Portal — BLE service & characteristic UUIDs.
 *
 * Ported 1:1 from `python/hwportal/constants.py`. All UUIDs share the base
 * `af0a6ec7-XXXX-XXXX-84a0-91559fc6f0de` (only the 16-bit slot changes).
 *
 * Canonical spec: `PROTOCOL.md` (repo root).
 * Port notes:    `docs/architecture/ble-and-protocol.md`.
 */

/** Advertised BLE device name of the portal. */
export const PORTAL_NAME = "HWiD";

/** Base UUID template; `{}` is replaced by the 16-bit service/characteristic slot. */
export const BASE_UUID = "af0a6ec7-{}-84a0-91559fc6f0de";

// --- Service UUIDs ---
export const SERVICE_AUTH = "af0a6ec7-0001-000a-84a0-91559fc6f0de";
export const SERVICE_DATA = "af0a6ec7-0001-000b-84a0-91559fc6f0de";
/** Main service — used as the BLE scan filter target. */
export const SERVICE_CONTROL = "af0a6ec7-0001-000c-84a0-91559fc6f0de";

// --- Service A (Authentication) characteristics ---
export const CHAR_AUTH_COMMAND = "af0a6ec7-0002-000a-84a0-91559fc6f0de";
export const CHAR_AUTH_KEY = "af0a6ec7-0003-000a-84a0-91559fc6f0de";
export const CHAR_AUTH_RESPONSE = "af0a6ec7-0004-000a-84a0-91559fc6f0de";

// --- Service B (Data Transfer) characteristics ---
export const CHAR_DATA_COMMAND = "af0a6ec7-0002-000b-84a0-91559fc6f0de";
export const CHAR_DATA_FAST = "af0a6ec7-0003-000b-84a0-91559fc6f0de";

// --- Service C (Control) characteristics ---
export const CHAR_FIRMWARE_VERSION = "af0a6ec7-0002-000c-84a0-91559fc6f0de";
/** Current car serial (ASCII); changes per car, empty when removed. */
export const CHAR_SERIAL_NUMBER = "af0a6ec7-0003-000c-84a0-91559fc6f0de";
/** Event channel 1: NFC NDEF record (Mattel car id). */
export const CHAR_EVENT_1 = "af0a6ec7-0004-000c-84a0-91559fc6f0de";
/** Event channel 2: car detection (`0x04` + 6-byte NFC UID). */
export const CHAR_EVENT_2 = "af0a6ec7-0005-000c-84a0-91559fc6f0de";
/** Event channel 3: speed sample (little-endian float32). */
export const CHAR_EVENT_3 = "af0a6ec7-0006-000c-84a0-91559fc6f0de";
/** Control/status register (5-byte patterns). */
export const CHAR_CONTROL = "af0a6ec7-0007-000c-84a0-91559fc6f0de";
export const CHAR_COMMAND = "af0a6ec7-0008-000c-84a0-91559fc6f0de";

export type CharacteristicService = "auth" | "data" | "control";
export type CharacteristicProp =
  | "read"
  | "write"
  | "indicate"
  | "write-without-response";

export interface CharacteristicMeta {
  readonly name: string;
  readonly service: CharacteristicService;
  readonly props: readonly CharacteristicProp[];
}

/** Per-characteristic metadata, ported from `constants.py:CHARACTERISTICS`. */
export const CHARACTERISTICS: Readonly<Record<string, CharacteristicMeta>> = {
  [CHAR_AUTH_COMMAND]: { name: "Auth Command", service: "auth", props: ["write", "indicate"] },
  [CHAR_AUTH_KEY]: { name: "Auth Key", service: "auth", props: ["read"] },
  [CHAR_AUTH_RESPONSE]: { name: "Auth Response", service: "auth", props: ["write", "indicate"] },
  [CHAR_DATA_COMMAND]: { name: "Data Command", service: "data", props: ["write", "indicate"] },
  [CHAR_DATA_FAST]: { name: "Data Fast", service: "data", props: ["write-without-response"] },
  [CHAR_FIRMWARE_VERSION]: { name: "Firmware Version", service: "control", props: ["read"] },
  [CHAR_SERIAL_NUMBER]: { name: "Serial Number", service: "control", props: ["read", "indicate"] },
  [CHAR_EVENT_1]: { name: "Event Channel 1", service: "control", props: ["indicate"] },
  [CHAR_EVENT_2]: { name: "Event Channel 2", service: "control", props: ["indicate"] },
  [CHAR_EVENT_3]: { name: "Event Channel 3", service: "control", props: ["indicate"] },
  [CHAR_CONTROL]: { name: "Control Register", service: "control", props: ["write", "read", "indicate"] },
  [CHAR_COMMAND]: { name: "Command", service: "control", props: ["write", "indicate"] },
};

/** Characteristics that emit notifications/indications. */
export const NOTIFY_CHARACTERISTICS: readonly string[] = [
  CHAR_AUTH_COMMAND,
  CHAR_AUTH_RESPONSE,
  CHAR_DATA_COMMAND,
  CHAR_SERIAL_NUMBER,
  CHAR_EVENT_1,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_CONTROL,
  CHAR_COMMAND,
];

/** Readable characteristics. */
export const READ_CHARACTERISTICS: readonly string[] = [
  CHAR_AUTH_KEY,
  CHAR_FIRMWARE_VERSION,
  CHAR_SERIAL_NUMBER,
  CHAR_CONTROL,
];
