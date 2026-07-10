/**
 * MPID (modern-firmware) BLE handshake driver for `react-native-ble-plx`.
 *
 * Newer Hot Wheels id portals (firmware ≥ ~1.0.x) do **not** expose the legacy
 * control service (`…-000c`). Instead, car/speed telemetry is delivered as an
 * encrypted Protocol-Buffers stream over the BLE *auth* service after a P-256
 * ECDH handshake. The transport-agnostic core of that protocol lives in
 * `@redlineid/protocol` (`MpidSession`, `parseMessage`, `mpidToPortalEvents`);
 * this module is the thin BLE glue that drives it, mirroring the hardware-proven
 * `python/mpid_monitor.py` handshake order exactly:
 *
 *   1. subscribe to TX/RX (`…-0002-000a`, indicate)
 *   2. subscribe to SESSION (`…-0004-000a`, best-effort)
 *   3. read the 136-byte FACTORY token (`…-0003-000a`)
 *   4. `session.startSession(token)` → 37-byte SESSION payload
 *   5. write SESSION payload to `…-0004-000a` (with response)
 *   6. decode every TX/RX indication via `session.feed()` → `parseMessage`
 *
 * ## Web / Simulator safety
 * Like `blePortal.ts`, this module takes **type-only** imports from
 * `react-native-ble-plx` and is only ever reached on a native device. The
 * `react-native-get-random-values` CSPRNG polyfill that `@noble` needs is
 * `require`d lazily inside {@link runMpidSession} so it never enters the
 * web/SSR import graph.
 *
 * See ADR-0012 and `docs/architecture/ble-and-protocol.md`.
 */
import {
  base64FromBytes,
  bytesFromBase64,
  parseNfcUid,
  parseMessage,
  mpidToPortalEvents,
  mattelIdMatchesUid,
  BatteryStatus,
  DeviceMode,
  EventType,
  MpidSession,
  SPEED_SCALE,
  CHAR_FACTORY,
  CHAR_SESSION,
  CHAR_TXRX,
  type PortalMessage,
} from "@redlineid/protocol";
import type { BleError, Characteristic, Subscription } from "react-native-ble-plx";
import type { BleLogLevel, TransportDispatch } from "./types";

/** The three auth-service characteristics the MPID handshake needs. */
export interface MpidChars {
  readonly txrx: Characteristic;
  readonly factory: Characteristic;
  readonly session: Characteristic;
}

export interface MpidDeps {
  readonly dispatch: TransportDispatch;
  readonly log: (level: BleLogLevel, message: string) => void;
  /** True while the transport is still `start()`ed (suppresses teardown noise). */
  readonly isActive: () => boolean;
}

const TXRX_LOWER = CHAR_TXRX.toLowerCase();
const FACTORY_LOWER = CHAR_FACTORY.toLowerCase();
const SESSION_LOWER = CHAR_SESSION.toLowerCase();

/**
 * Resolve the MPID characteristics from a discovered GATT table (keyed by
 * lowercased characteristic UUID). Returns `null` unless all three are present,
 * which is the signal to fall through to the legacy / locked paths.
 */
export function findMpidChars(discovered: ReadonlyMap<string, Characteristic>): MpidChars | null {
  const txrx = discovered.get(TXRX_LOWER);
  const factory = discovered.get(FACTORY_LOWER);
  const session = discovered.get(SESSION_LOWER);
  if (txrx && factory && session) return { txrx, factory, session };
  return null;
}

/**
 * Run the MPID handshake over an already-connected device and start streaming
 * decoded telemetry into `deps.dispatch`. Resolves with the active monitor
 * {@link Subscription}s (for the caller to track + tear down). Throws if the
 * handshake fails (e.g. a short/garbage FACTORY token) so the caller can fall
 * back to the "locked" phase.
 */
export async function runMpidSession(chars: MpidChars, deps: MpidDeps): Promise<Subscription[]> {
  // `@noble` needs a CSPRNG; Hermes/RN has no global.crypto by default. This
  // native-only polyfill installs `global.crypto.getRandomValues`. Required
  // before constructing MpidSession (which generates an ephemeral keypair).
  require("react-native-get-random-values");

  const session = new MpidSession();
  const subs: Subscription[] = [];

  const onTxRx = (error: BleError | null, characteristic: Characteristic | null) => {
    // Ignore anything that arrives after the transport stopped (a late
    // indication or a disconnect-triggered error) so it can't dispatch into the
    // store or log teardown noise.
    if (!deps.isActive()) return;
    if (error) {
      deps.log("error", `mpid rx error: ${error.message}`);
      return;
    }
    const value = characteristic?.value;
    if (!value) return;
    try {
      for (const payload of session.feed(bytesFromBase64(value))) {
        decodeAndDispatch(payload, deps);
      }
    } catch (err) {
      deps.log("error", `mpid decode failed: ${(err as Error).message}`);
    }
  };

  try {
    // 1 + 2: subscribe to TX/RX (telemetry) then SESSION (best-effort status).
    subs.push(chars.txrx.monitor(onTxRx));
    try {
      subs.push(chars.session.monitor(() => {}));
    } catch {
      /* SESSION may not be indicatable on every firmware; non-fatal. */
    }

    // 3: read the FACTORY token (portal's identity + ECDH pubkey + salt).
    const factory = await chars.factory.read();
    const token = bytesFromBase64(factory.value ?? "");
    deps.log("info", `mpid · FACTORY token ${token.length}B`);

    // 4: derive the session key + build our SESSION reply.
    const payload = session.startSession(token);

    // 5: write SESSION (our pubkey ‖ salt) with response — completes the handshake.
    await chars.session.writeWithResponse(base64FromBytes(payload));
    deps.log("info", "mpid · session established (P-256 ECDH · AES-128-CTR)");

    return subs;
  } catch (err) {
    for (const sub of subs.splice(0)) {
      try {
        sub.remove();
      } catch {
        /* already removed */
      }
    }
    throw err;
  }
}

/** Decode one decrypted protobuf payload: log a monitor.py-style line + dispatch. */
function decodeAndDispatch(payload: Uint8Array, deps: MpidDeps): void {
  const msg = parseMessage(payload);

  if (msg.info) {
    deps.log("info", formatStatus(msg));
  }

  const ev = msg.event;
  if (ev) {
    switch (ev.type) {
      case EventType.CAR_ON_PORTAL:
        deps.log("event", `car on portal${carUidSuffix(ev.carInfo?.tagUid)}`);
        break;
      case EventType.CAR_OFF_PORTAL:
        deps.log("event", "car removed");
        break;
      case EventType.CAR_DRIVE_BY: {
        const sm = ev.speedMeasurement;
        const mph = sm ? (sm.speed * SPEED_SCALE).toFixed(1) : "—";
        const raw = sm ? sm.speed.toFixed(4) : "—";
        deps.log("event", `drive-by ${mph} mph (raw ${raw})${carUidSuffix(ev.carInfo?.tagUid)}`);
        break;
      }
      default:
        deps.log("event", `event ${EventType[ev.type] ?? ev.type}`);
    }
  }

  for (const portalEvent of mpidToPortalEvents(msg)) {
    if (__DEV__ && portalEvent.kind === "carDetected" && portalEvent.mattelId) {
      const match = mattelIdMatchesUid(portalEvent.mattelId, portalEvent.uid);
      if (match === false) {
        deps.log(
          "event",
          `⚠︎ mattel-id UID tail ≠ reported UID ${portalEvent.uid} — byte layout may be off for this car`,
        );
      }
    }
    deps.dispatch(portalEvent);
  }
}

function carUidSuffix(tagUid?: Uint8Array): string {
  return tagUid && tagUid.length >= 7 ? ` · UID ${parseNfcUid(tagUid)}` : "";
}

function formatStatus(msg: PortalMessage): string {
  const info = msg.info;
  if (!info) return "status";
  const version = info.semanticFirmwareVersion || "?";
  const battery = `${Math.round(info.batteryLevel * 100)}%`;
  const mode = DeviceMode[info.mode] ?? `mode${info.mode}`;
  const charging = BatteryStatus[info.batteryStatus] ?? "";
  return `status v${version} · battery ${battery}${charging ? ` (${charging})` : ""} · ${mode}`;
}
