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
  /** The base64url Mattel car id from the NFC NDEF record, when present. */
  readonly mattelId?: string;
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
  | CarRemovedEvent
  | SpeedEvent
  | SerialEvent
  | ControlEvent
  | UnknownEvent;

/** The set of `kind` discriminants. */
export type PortalEventKind = PortalEvent["kind"];
