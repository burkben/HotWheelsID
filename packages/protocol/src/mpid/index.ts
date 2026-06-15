/**
 * `@redlineid/protocol` MPID (modern-firmware) support.
 *
 * The modern Hot Wheels id portal firmware delivers car/speed telemetry as an
 * encrypted Protocol-Buffers stream over the BLE "auth" service after a P-256
 * ECDH handshake — there is no separate control service. This module is the
 * transport-agnostic core of that protocol (handshake, AES-128-CTR framing, and
 * protobuf decode), ported 1:1 from the hardware-proven Python reference
 * (`python/hwportal/mpid.py`). The BLE transport layer drives it; see ADR-0012.
 */
export { concatBytes } from "./bytes";
export { CRC8_TABLE, crc8 } from "./crc8";
export {
  aes128Ctr,
  compressedPublicKey,
  deriveSessionKey,
  ecdhSharedX,
  randomPrivateKey,
} from "./crypto";
export { CHAR_FACTORY, CHAR_SESSION, CHAR_TXRX, MPID_SERVICE } from "./constants";
export { MpidToken, MpidTokenError } from "./token";
export { MpidSession } from "./session";
export type { MpidSessionOptions } from "./session";
export * from "./protobuf";
