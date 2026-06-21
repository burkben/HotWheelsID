/**
 * Typed event model for the Hot Wheels id Race Portal.
 *
 * A {@link PortalEvent} is the result of decoding one BLE characteristic
 * indication via `parseCharacteristicValue` (see `decode.ts`). The union is
 * discriminated by `kind`, so consumers can `switch` exhaustively.
 */

/** Control-register status derived from the 5-byte patterns in `PROTOCOL.md`. */
export type ControlStatus = "idle" | "carPresent" | "transitional";

/** A car was placed on the portal. `uid` is the 6-byte NFC UID, e.g. `6C:C4:5A:2B:64:81`. */
export interface CarDetectedEvent {
  readonly kind: "carDetected";
  readonly uid: string;
}

/**
 * The current car's casting identity, decoded from its NFC NDEF record (the
 * `https://www.pid.mattel/<id>` URI). Delivered on its own characteristic on
 * legacy firmware and alongside the detection on modern (MPID) firmware.
 *
 * - `mattelId` is the full base64url id — unique per physical car (it embeds the UID).
 * - `modelId` is the 4-byte casting/model id as hex (e.g. `41AE5E5B`) — **shared by
 *   every copy of the same casting**, so it's the key for grouping duplicates.
 * - `uid` is the NFC UID embedded in the id, so consumers can attach the identity
 *   to the right car even when this arrives before/independently of the detection.
 */
export interface CarIdentityEvent {
  readonly kind: "carIdentity";
  readonly uid: string;
  readonly mattelId: string;
  readonly modelId: string;
}

/** A car was removed (empty payload on the detection / serial / NDEF channels). */
export interface CarRemovedEvent {
  readonly kind: "carRemoved";
}

/** A speed sample. `raw` is the decoded float32; `scaleMph` is `raw * 64` ("scale mph", relative). */
export interface SpeedEvent {
  readonly kind: "speed";
  readonly raw: number;
  readonly scaleMph: number;
}

/** The current car's serial number changed (ASCII), e.g. `1102032557`. */
export interface SerialEvent {
  readonly kind: "serial";
  readonly serial: string;
}

/** A control/status register update. Raw bytes are retained for re-interpretation. */
export interface ControlEvent {
  readonly kind: "control";
  readonly status: ControlStatus;
  readonly bytes: Uint8Array;
}

/** An indication we do not (yet) decode. Carries the source UUID + raw bytes. */
export interface UnknownEvent {
  readonly kind: "unknown";
  readonly uuid: string;
  readonly bytes: Uint8Array;
}

export type PortalEvent =
  | CarDetectedEvent
  | CarIdentityEvent
  | CarRemovedEvent
  | SpeedEvent
  | SerialEvent
  | ControlEvent
  | UnknownEvent;

/** The set of `kind` discriminants. */
export type PortalEventKind = PortalEvent["kind"];
