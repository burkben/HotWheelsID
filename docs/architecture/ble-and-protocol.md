# BLE & Protocol (Python → TypeScript port)

This is the engineering companion to [`PROTOCOL.md`](../../PROTOCOL.md) (the canonical
spec). It maps the existing Python implementation to the planned TypeScript port and calls
out the iOS-specific BLE behavior that the port **must** handle. See
[ADR-0003](../adr/0003-bluetooth-with-react-native-ble-plx.md) and
[ADR-0004](../adr/0004-shared-typescript-protocol-package.md).

## 1. Services & characteristics

All UUIDs share the base `af0a6ec7-XXXX-XXXX-84a0-91559fc6f0de`. Port these 1:1 from
`python/hwportal/constants.py` into `packages/protocol/src/uuids.ts`.

| Constant | UUID (short slot) | Props | Role |
|----------|-------------------|-------|------|
| `SERVICE_AUTH` | `…-0001-000a-…` | — | Authentication service |
| `SERVICE_DATA` | `…-0001-000b-…` | — | Bulk data transfer service |
| `SERVICE_CONTROL` | `…-0001-000c-…` | — | **Main** service (scan filter target) |
| `CHAR_FIRMWARE_VERSION` | `…-0002-000c-…` | read | Firmware string |
| `CHAR_SERIAL_NUMBER` | `…-0003-000c-…` | read, indicate | Current car serial (ASCII) |
| `CHAR_EVENT_1` | `…-0004-000c-…` | indicate | NFC NDEF record (Mattel car id) |
| `CHAR_EVENT_2` | `…-0005-000c-…` | indicate | **Car detection** (`0x04` + 6-byte UID) |
| `CHAR_EVENT_3` | `…-0006-000c-…` | indicate | **Speed** (float32 LE) |
| `CHAR_CONTROL` | `…-0007-000c-…` | read, write, indicate | Control/status register |
| `CHAR_COMMAND` | `…-0008-000c-…` | write, indicate | Command channel |

## 2. Event formats (what the parsers must produce)

| Event | Source char | Bytes | Parse → typed event |
|-------|-------------|-------|---------------------|
| Car placed | `CHAR_EVENT_2` | `04 <u0..u5>` | `CarDetected{ uid: "U0:..:U5" }` |
| Car removed | `CHAR_EVENT_2` / serial / event1 | *empty* | `CarRemoved` |
| Speed sample | `CHAR_EVENT_3` | 4-byte float32 **LE** | `SpeedSample{ raw, scaleMph: raw*64 }` |
| Serial changed | `CHAR_SERIAL_NUMBER` | ASCII | `SerialChanged{ serial }` |
| Car identity | `CHAR_EVENT_1` | NDEF URI `https://www.pid.mattel/<base64>` | `NdefCarId{ mattelId, uid }` |
| Status | `CHAR_CONTROL` | 5 bytes | `ControlStatus{ idle\|carPresent\|transitional }` |

Sample vectors to use as **unit tests** (straight from `PROTOCOL.md`):

- `04 6c c4 5a 2b 64 81` → UID `6C:C4:5A:2B:64:81`
- `b0 1c 14 3e` → float ≈ `0.1446` (slow) ; `ab aa ca 3f` → ≈ `1.5833` (fast)
- Control `00 fe 00 fe 02` → car present ; `00 fe 00 fe 00` → idle

## 3. Python → TypeScript mapping

| Concern | Python (today) | TypeScript (target) |
|--------|----------------|---------------------|
| UUID constants | `hwportal/constants.py` | `packages/protocol/src/uuids.ts` |
| Connect / scan | `HotWheelsPortal.connect()` (bleak, by MAC) | `apps/mobile` BLE service (ble-plx, by service UUID + name) |
| Subscribe | `start_notify(uuid, handler)` | `monitorCharacteristicForDevice(deviceId, service, char, cb)` |
| Notification payload | `bytearray` directly | **base64 string** → decode to `Uint8Array` |
| Speed decode | `struct.unpack('<f', data[:4])[0] * 64` | `new DataView(buf).getFloat32(0, true) * 64` |
| UID decode | bytes → hex join | `[...bytes.slice(1,7)].map(hex).join(':')` |
| Serial decode | `bytes.decode('utf-8')` | `new TextDecoder().decode(bytes)` |
| Event model | `@dataclass PortalEvent` | discriminated-union `PortalEvent` types |
| Callbacks | `on_event(cb)` list | parser → Zustand dispatch ([ADR-0006](../adr/0006-state-management-and-persistence.md)) |

## 4. iOS / CoreBluetooth behaviors the port MUST handle

These differ from the Python/`bleak` desktop assumptions:

1. **No MAC address.** iOS gives a per-device, per-install **UUID identifier**, not the
   hardware MAC. → Discover by advertised name `HWiD` and/or `SERVICE_CONTROL`, then
   persist the peripheral UUID to reconnect to "my portal."
2. **Characteristic values are base64** across the RN bridge. → Always
   `base64 → Uint8Array` before parsing (and `Uint8Array → base64` before writing).
3. **`indicate` works via the same monitor API** as `notify` in ble-plx — good, because
   every portal event channel uses `indicate`.
4. **Permissions & lifecycle.** Request BLE permission; handle "powered off", "unauthorized",
   and disconnects with auto-reconnect/backoff.
5. **Background (optional).** Sustained sessions with the screen locked need the
   `bluetooth-central` background mode (config plugin).

## 5. Reference: pure TS parser sketch (`packages/protocol`)

> Illustrative target for `decode.ts` / `events.ts` — pure, no RN imports, unit-testable.

```ts
export type PortalEvent =
  | { kind: "carDetected"; uid: string }
  | { kind: "carRemoved" }
  | { kind: "speed"; raw: number; scaleMph: number }
  | { kind: "serial"; serial: string }
  | { kind: "control"; status: "idle" | "carPresent" | "transitional"; bytes: Uint8Array }
  | { kind: "unknown"; uuid: string; bytes: Uint8Array };

const hex = (b: number) => b.toString(16).padStart(2, "0").toUpperCase();

export function parseNfcUid(bytes: Uint8Array): string {
  // Format: 0x04 followed by 6-byte UID
  return Array.from(bytes.slice(1, 7)).map(hex).join(":");
}

export function parseSpeed(bytes: Uint8Array): { raw: number; scaleMph: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const raw = view.getFloat32(0, /* littleEndian */ true);
  return { raw, scaleMph: raw * 64 };
}

export function parseCharacteristicValue(uuid: string, bytes: Uint8Array): PortalEvent {
  if (uuid === CHAR_EVENT_2)
    return bytes.length === 0 ? { kind: "carRemoved" }
                              : { kind: "carDetected", uid: parseNfcUid(bytes) };
  if (uuid === CHAR_EVENT_3) return { kind: "speed", ...parseSpeed(bytes) };
  if (uuid === CHAR_SERIAL_NUMBER)
    return bytes.length === 0 ? { kind: "carRemoved" }
                              : { kind: "serial", serial: new TextDecoder().decode(bytes) };
  // CHAR_CONTROL / CHAR_EVENT_1 (NDEF) handled here too…
  return { kind: "unknown", uuid, bytes };
}
```

## 6. Known unknowns (track as issues)

- **Auth handshake** (Service A) is not fully decoded; current tooling works without it for
  read/monitor. Confirm whether any portal feature requires it.
- **Full NDEF / Mattel car-id schema** (mapping `base64` → human car name/art) is partial.
- **Exact speed units/calibration** — `× 64` yields "scale mph"; treat as relative until
  calibrated against a known-speed reference.
