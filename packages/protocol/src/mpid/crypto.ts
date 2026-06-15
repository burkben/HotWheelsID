/**
 * MPID session crypto primitives: P-256 ECDH, the AES-128-CTR session-key KDF,
 * and the raw AES-128-CTR used for packet bodies.
 *
 * Uses the audited, dependency-free `@noble/curves` (P-256) and
 * `@noble/ciphers` (AES) packages — pure JavaScript, so this stays free of
 * native modules and works unchanged under Node, Metro, and React Native.
 *
 * NOTE for React Native: `@noble` reads cryptographically-secure randomness
 * from `globalThis.crypto.getRandomValues`. Node 20+ and modern browsers
 * provide it; in a React Native app, import `react-native-get-random-values`
 * once at startup before generating a session keypair.
 */
import { p256 } from "@noble/curves/nist.js";
import { ctr } from "@noble/ciphers/aes.js";

/** AES-128-CTR with a full 16-byte counter block. CTR is symmetric: encrypt == decrypt. */
export function aes128Ctr(key16: Uint8Array, iv16: Uint8Array, data: Uint8Array): Uint8Array {
  return ctr(key16, iv16).encrypt(data);
}

const KDF_LABEL = new Uint8Array([0x6d, 0x61, 0x74, 0x74, 0x65, 0x6c]); // "mattel"
const KDF_ROUNDS = 100;

/**
 * Derive the 16-byte session key from the 32-byte ECDH shared X coordinate.
 * Mirrors the firmware's `mpid_encrypt_context`:
 *   iv = 00*9 'mattel' 00; secret = sharedX
 *   100×: secret = AES128_CTR(secret[:16], iv, secret[:32]); be32_inc(iv[4:8])
 *   key = secret[:16]
 */
export function deriveSessionKey(sharedX: Uint8Array): Uint8Array {
  let secret: Uint8Array = sharedX.slice(0, 32);
  const iv = new Uint8Array(16);
  iv.set(KDF_LABEL, 9);
  for (let round = 0; round < KDF_ROUNDS; round++) {
    secret = aes128Ctr(secret.slice(0, 16), iv, secret.slice(0, 32));
    let counter = ((iv[4] << 24) | (iv[5] << 16) | (iv[6] << 8) | iv[7]) >>> 0;
    counter = (counter + 1) >>> 0;
    iv[4] = (counter >>> 24) & 0xff;
    iv[5] = (counter >>> 16) & 0xff;
    iv[6] = (counter >>> 8) & 0xff;
    iv[7] = counter & 0xff;
  }
  return secret.slice(0, 16);
}

/** ECDH(our private key, the device's compressed public key) → 32-byte shared X. */
export function ecdhSharedX(privateKey: Uint8Array, devicePublicKey: Uint8Array): Uint8Array {
  const shared = p256.getSharedSecret(privateKey, devicePublicKey);
  return shared.slice(1, 33); // drop the 0x02/0x03 point prefix → X coordinate
}

/** Generate a fresh 32-byte P-256 private key (needs a CSPRNG; see module note). */
export function randomPrivateKey(): Uint8Array {
  return p256.utils.randomSecretKey();
}

/** The 33-byte compressed public key for `privateKey`. */
export function compressedPublicKey(privateKey: Uint8Array): Uint8Array {
  return p256.getPublicKey(privateKey, true);
}
