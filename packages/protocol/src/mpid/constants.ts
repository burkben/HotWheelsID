/**
 * MPID (modern-firmware) GATT mapping.
 *
 * On modern firmware the portal exposes no Control service (`…-000c`); the
 * encrypted, protobuf telemetry stream lives entirely on the "auth" service
 * (`…-000a`). These aliases re-label the auth-service characteristics from
 * `uuids.ts` with their MPID roles so the BLE transport reads the right ones.
 */
import {
  CHAR_AUTH_COMMAND,
  CHAR_AUTH_KEY,
  CHAR_AUTH_RESPONSE,
  SERVICE_AUTH,
} from "../uuids";

/** The MPID transport service (= the legacy "auth" service, `…-0001-000a`). */
export const MPID_SERVICE = SERVICE_AUTH;

/** TX/RX (`…-0002-000a`): write to send frames; indications deliver encrypted frames. */
export const CHAR_TXRX = CHAR_AUTH_COMMAND;

/** FACTORY (`…-0003-000a`): read the 136-byte signed manufacturing token. */
export const CHAR_FACTORY = CHAR_AUTH_KEY;

/** SESSION (`…-0004-000a`): write our compressed pubkey + salt to start the session. */
export const CHAR_SESSION = CHAR_AUTH_RESPONSE;
