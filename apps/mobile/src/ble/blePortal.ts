/**
 * `react-native-ble-plx` transport for the Hot Wheels id Race Portal.
 *
 * This is the Phase 1 replacement for the mock generator. It scans for the
 * portal, connects, discovers the control service, and subscribes to its
 * indication characteristics. Each raw characteristic value (a Base64 string on
 * the RN bridge) is decoded with the **shared** `@hotwheelsid/protocol`
 * pipeline — `bytesFromBase64` → `parseCharacteristicValue` — and the resulting
 * typed {@link PortalEvent} is pushed into the same Zustand store the mock uses.
 * So the UI is byte-for-byte identical whether driven by the mock or hardware.
 *
 * ## Web / Simulator safety
 * Expo Router's static web export imports every route module (to build the
 * sitemap), which would transitively load this file. `react-native-ble-plx` has
 * no web implementation and throws if constructed there. Therefore this module
 * uses **type-only** imports from the package and a **lazy `require` inside
 * functions** — nothing native is touched at import time. Callers must still
 * guard `Platform.OS === 'web'` before `start()`ing (see `app/live.tsx`).
 *
 * See `docs/architecture/ble-and-protocol.md` and ADR-0003 / ADR-0011.
 */
import { Platform } from "react-native";
import {
  bytesFromBase64,
  parseCharacteristicValue,
  CHAR_COMMAND,
  CHAR_CONTROL,
  CHAR_EVENT_1,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_FIRMWARE_VERSION,
  CHAR_SERIAL_NUMBER,
  PORTAL_NAME,
  SERVICE_CONTROL,
} from "@hotwheelsid/protocol";
import type {
  BleError,
  BleManager,
  Characteristic,
  Device,
  State,
  Subscription,
} from "react-native-ble-plx";
import { claimActiveTransport, releaseActiveTransport } from "../transport/active";
import type { BleLogEntry, BleLogLevel, BlePhase, BlePortalOptions, PortalTransport } from "./types";

type BlePlxModule = typeof import("react-native-ble-plx");

/**
 * Control-service characteristics that emit indications we care about, in the
 * order we subscribe. The known constant (not `characteristic.uuid`) is passed
 * to the parser to avoid any ble-plx UUID-casing normalization mismatch.
 */
const MONITORED_CHARACTERISTICS: readonly string[] = [
  CHAR_SERIAL_NUMBER,
  CHAR_EVENT_1,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_CONTROL,
  CHAR_COMMAND,
];

const SCAN_HINT_MS = 12_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 8_000;

let plx: BlePlxModule | null = null;
function loadPlx(): BlePlxModule {
  if (!plx) {
    // Lazy: keep the native module out of the web/SSR import graph.
    plx = require("react-native-ble-plx") as BlePlxModule;
  }
  return plx;
}

let sharedManager: BleManager | null = null;
function getManager(): BleManager {
  if (!sharedManager) {
    const { BleManager } = loadPlx();
    sharedManager = new BleManager();
  }
  return sharedManager;
}

/** True only when we can plausibly talk to a BLE radio (native, not web). */
export function isBleAvailable(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * Create a BLE transport. Returns the shared {@link PortalTransport} contract
 * (`start`/`stop`) plus nothing else — all event delivery happens through the
 * `dispatch`/`onLog` callbacks supplied in `options`.
 */
export function createBlePortal(options: BlePortalOptions): PortalTransport {
  const { dispatch, setConnection, onPhase, onLog, autoReconnect = true } = options;

  let started = false;
  let scanning = false;
  let connecting = false;
  let device: Device | null = null;
  let lastDeviceId: string | null = null;

  let stateSub: Subscription | null = null;
  let disconnectSub: Subscription | null = null;
  const monitorSubs: Subscription[] = [];

  let scanHintTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;

  let logId = 0;
  const log = (level: BleLogLevel, message: string) => {
    const entry: BleLogEntry = { id: ++logId, at: Date.now(), level, message };
    // Mirror to the JS console so logs stream to the Metro terminal during dev —
    // invaluable for diagnosing on-device BLE without reading the in-app log back.
    if (__DEV__) console.log(`[ble:${level}] ${message}`);
    onLog?.(entry);
  };
  const phase = (p: BlePhase) => onPhase?.(p);

  const clearScanHint = () => {
    if (scanHintTimer) {
      clearTimeout(scanHintTimer);
      scanHintTimer = null;
    }
  };
  const clearReconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const removeMonitors = () => {
    for (const sub of monitorSubs.splice(0)) {
      try {
        sub.remove();
      } catch {
        /* already removed */
      }
    }
  };

  const handleCharacteristic = (
    knownUuid: string,
    error: BleError | null,
    characteristic: Characteristic | null,
  ) => {
    if (error) {
      // Monitor errors fire on disconnect/cancel; the disconnect handler drives
      // the lifecycle, so just note it.
      if (started) log("error", `monitor error: ${error.message}`);
      return;
    }
    const value = characteristic?.value;
    if (!value) return;
    // Log every raw notification (Base64 payload) before decode, so we can see
    // exactly which characteristics actually fire on the wire — even ones that
    // decode to "unknown".
    if (__DEV__) console.log(`[ble:raw] ${shortUuid(knownUuid)} <- ${value}`);
    try {
      const bytes = bytesFromBase64(value);
      const event = parseCharacteristicValue(knownUuid, bytes);
      dispatch(event);
      logEvent(knownUuid, bytes, event);
    } catch (err) {
      log("error", `decode failed: ${(err as Error).message}`);
    }
  };

  const logEvent = (
    uuid: string,
    bytes: Uint8Array,
    event: ReturnType<typeof parseCharacteristicValue>,
  ) => {
    switch (event.kind) {
      case "carDetected":
        log("event", `car detected · UID ${event.uid}`);
        break;
      case "serial":
        log("event", `serial ${event.serial}`);
        break;
      case "carRemoved":
        log("event", "car removed");
        break;
      case "control":
        log("event", `control · ${event.status}`);
        break;
      case "speed":
        log("event", `speed ${event.scaleMph.toFixed(1)} mph (raw ${event.raw.toFixed(4)})`);
        break;
      default:
        log("event", `unknown [${uuid.slice(9, 13)}] ${hexPreview(bytes)}`);
    }
  };

  const subscribeToPortal = async (target: Device) => {
    device = target;
    lastDeviceId = target.id;
    connecting = true;
    phase("connecting");
    setConnection("connecting");
    log("info", `connecting to ${target.name ?? target.id}…`);

    const manager = getManager();
    try {
      await manager.connectToDevice(target.id, { timeout: 10_000 });
      if (!started) return;
      phase("discovering");
      log("info", "discovering services…");
      await manager.discoverAllServicesAndCharacteristicsForDevice(target.id);
      if (!started) return;

      disconnectSub?.remove();
      disconnectSub = target.onDisconnected((err) => {
        if (!started) return;
        log("info", err ? `disconnected: ${err.message}` : "disconnected");
        device = null;
        removeMonitors();
        setConnection("disconnected");
        if (autoReconnect) scheduleReconnect();
        else phase("idle");
      });

      removeMonitors();

      // Enumerate the *actual* discovered GATT table and subscribe to the
      // characteristics the device really exposes. The Python reference uses
      // bleak's `start_notify(char_uuid)`, which resolves the parent service
      // automatically; ble-plx instead requires us to name the owning service.
      // Hardcoding (SERVICE_CONTROL, charUuid) pairs proved fragile on iOS
      // ("characteristic not found"), because we must use the exact service/char
      // UUID strings iOS reports (its own casing) and the real parent service.
      // So: walk every service, match each characteristic against our known
      // notify set case-insensitively, and monitor it via the characteristic's
      // own service. The full table is logged for diagnostics.
      const canonicalByLower = new Map<string, string>(
        MONITORED_CHARACTERISTICS.map((u) => [u.toLowerCase(), u] as const),
      );
      const services = await manager.servicesForDevice(target.id);
      if (!started) return;
      let subscribed = 0;
      for (const service of services) {
        let chars: Characteristic[];
        try {
          chars = await manager.characteristicsForDevice(target.id, service.uuid);
        } catch {
          continue;
        }
        if (!started) return;
        for (const ch of chars) {
          const lower = ch.uuid.toLowerCase();
          const flags =
            `${ch.isNotifiable ? "N" : ""}${ch.isIndicatable ? "I" : ""}` +
            `${ch.isReadable ? "R" : ""}` || "-";
          log("info", `gatt ${shortUuid(service.uuid)} / ${shortUuid(ch.uuid)} [${flags}]`);
          const known = canonicalByLower.get(lower);
          if (!known) continue;
          if (!ch.isNotifiable && !ch.isIndicatable) continue;
          const sub = ch.monitor((error, characteristic) =>
            handleCharacteristic(known, error, characteristic),
          );
          monitorSubs.push(sub);
          subscribed += 1;
        }
      }
      if (subscribed === 0) {
        // Gated firmware: discovery succeeded, but the portal exposes NO
        // control-service notify characteristics — Service C (car detection,
        // speed, serial) is hidden behind the Hot Wheels id auth handshake.
        // `python/diag_portal.py` proves a fresh desktop central (bleak) sees
        // only Services A (auth) + B (data) too, so this is the portal/firmware,
        // not an iOS cache. There is nothing to stream and auto-reconnect would
        // just re-lock in a loop — surface a clear "locked" phase and drop the
        // link so the single-connection portal is freed.
        log("error", "portal connected, but exposes no control service (no car/speed characteristics)");
        log(
          "error",
          "this firmware locks the control service behind the auth handshake — unsupported (see python/diag_portal.py)",
        );
        await stop();
        phase("locked");
        return;
      }

      log("info", `subscribed to ${subscribed} characteristic(s)`);
      void readFirmware(target.id);

      connecting = false;
      reconnectAttempts = 0;
      phase("connected");
      setConnection("connected");
      log("info", "connected — place a car on the portal");
    } catch (err) {
      connecting = false;
      log("error", `connect failed: ${(err as Error).message}`);
      setConnection("disconnected");
      if (started && autoReconnect) scheduleReconnect();
      else phase("error");
    }
  };

  const readFirmware = async (deviceId: string) => {
    try {
      const manager = getManager();
      const char = await manager.readCharacteristicForDevice(
        deviceId,
        SERVICE_CONTROL,
        CHAR_FIRMWARE_VERSION,
      );
      if (char.value) {
        const bytes = bytesFromBase64(char.value);
        const text = Array.from(bytes, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ""))
          .join("")
          .trim();
        if (text) log("info", `firmware ${text}`);
      }
    } catch {
      /* firmware read is best-effort */
    }
  };

  const matchesPortal = (d: Device): boolean => {
    if (d.name === PORTAL_NAME || d.localName === PORTAL_NAME) return true;
    const advertised = d.serviceUUIDs ?? [];
    return advertised.some((u) => u.toLowerCase() === SERVICE_CONTROL);
  };

  const beginScan = async () => {
    if (!started || connecting || device) return;
    const manager = getManager();
    scanning = true;
    phase(reconnectAttempts > 0 ? "reconnecting" : "scanning");
    setConnection("connecting");
    log("info", "scanning for portal…");

    clearScanHint();
    scanHintTimer = setTimeout(() => {
      if (scanning) log("info", "still scanning — is the portal powered on and nearby?");
    }, SCAN_HINT_MS);

    try {
      // Scan-all (null filter) + name match is more reliable than a service
      // filter, since the portal may not advertise SERVICE_CONTROL in its packet.
      await manager.startDeviceScan(null, { allowDuplicates: false }, (error, scanned) => {
        if (error) {
          log("error", `scan error: ${error.message}`);
          scanning = false;
          clearScanHint();
          setConnection("disconnected");
          phase("error");
          return;
        }
        if (!scanned || !matchesPortal(scanned) || connecting) return;
        scanning = false;
        clearScanHint();
        log("info", `found ${scanned.name ?? scanned.id}`);
        void manager.stopDeviceScan();
        void subscribeToPortal(scanned);
      });
    } catch (err) {
      scanning = false;
      clearScanHint();
      setConnection("disconnected");
      log("error", `could not start scan: ${(err as Error).message}`);
      phase("error");
    }
  };

  const scheduleReconnect = () => {
    if (!started) return;
    clearReconnect();
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS);
    reconnectAttempts += 1;
    phase("reconnecting");
    log("info", `reconnecting in ${Math.round(delay / 1000)}s…`);
    reconnectTimer = setTimeout(() => {
      if (!started) return;
      void attemptReconnectOrScan();
    }, delay);
  };

  const attemptReconnectOrScan = async () => {
    if (!started || connecting || device) return;
    if (!lastDeviceId) {
      void beginScan();
      return;
    }
    const manager = getManager();
    try {
      log("info", "re-attaching to last portal…");
      const known = await manager.devices([lastDeviceId]);
      const target = known[0];
      if (target) {
        await subscribeToPortal(target);
        return;
      }
    } catch {
      /* fall through to a fresh scan */
    }
    void beginScan();
  };

  const handleState = (state: State) => {
    const { State } = loadPlx();
    switch (state) {
      case State.PoweredOn:
        if (!connecting && !device && !scanning) void beginScan();
        break;
      case State.PoweredOff:
        phase("poweredOff");
        setConnection("disconnected");
        log("error", "Bluetooth is off — enable it in Control Center / Settings");
        break;
      case State.Unauthorized:
        phase("unauthorized");
        setConnection("disconnected");
        log("error", "Bluetooth permission denied — allow it in Settings");
        break;
      case State.Unsupported:
        phase("unsupported");
        setConnection("disconnected");
        log("error", "BLE is unsupported here (e.g. the iOS Simulator has no radio)");
        break;
      case State.Resetting:
      case State.Unknown:
      default:
        // Transient; wait for the next emitCurrentState update.
        break;
    }
  };

  const ensureAndroidPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== "android") return true;
    try {
      const { PermissionsAndroid } = require("react-native") as typeof import("react-native");
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
    } catch {
      return true; // older Android / not applicable
    }
  };

  const start: PortalTransport["start"] = async () => {
    if (started) return;
    if (!isBleAvailable()) {
      phase("unsupported");
      log("error", "BLE is only available on a physical iOS/Android device");
      return;
    }
    started = true;
    claimActiveTransport(stop);

    const ok = await ensureAndroidPermissions();
    if (!ok) {
      log("error", "required Bluetooth permissions were not granted");
      phase("unauthorized");
      return;
    }

    const manager = getManager();
    stateSub?.remove();
    // emitCurrentState=true delivers the current adapter state immediately, which
    // kicks off the scan when it is already PoweredOn.
    stateSub = manager.onStateChange(handleState, true);
  };

  const stop: PortalTransport["stop"] = async () => {
    if (!started) return;
    started = false;
    scanning = false;
    connecting = false;
    reconnectAttempts = 0;
    clearScanHint();
    clearReconnect();

    // Reset connection state + release the active slot *synchronously*, before
    // any await. A hand-off (claimActiveTransport calls this stop() then the
    // incoming transport sets 'connecting'/'connected' right after we yield), so
    // a late 'disconnected' write after the awaits below would clobber it.
    stateSub?.remove();
    stateSub = null;
    disconnectSub?.remove();
    disconnectSub = null;
    removeMonitors();
    device = null;
    phase("idle");
    setConnection("disconnected");
    releaseActiveTransport(stop);

    // Best-effort native teardown — intentionally after the state reset.
    const manager = getManager();
    try {
      await manager.stopDeviceScan();
    } catch {
      /* nothing scanning */
    }
    const id = lastDeviceId;
    if (id) {
      try {
        await manager.cancelDeviceConnection(id);
      } catch {
        /* already disconnected */
      }
    }
    log("info", "stopped");
  };

  return { start, stop };
}

/** Compact UUID label for logs: `af0a6ec7-0003-000c-…` → `0003-000c`. */
function shortUuid(uuid: string): string {
  const parts = uuid.split("-");
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : uuid;
}

function hexPreview(bytes: Uint8Array, max = 8): string {
  const shown = Array.from(bytes.slice(0, max), (b) => b.toString(16).padStart(2, "0")).join(" ");
  return bytes.length > max ? `${shown}…` : shown;
}
