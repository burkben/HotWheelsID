/**
 * Minimal, dependency-free Base64 ⇄ bytes codec.
 *
 * react-native-ble-plx carries every characteristic value across the RN bridge
 * as a Base64 string (read/notify) and expects Base64 for writes. The BLE layer
 * must therefore convert Base64 → {@link Uint8Array} before handing bytes to
 * {@link parseCharacteristicValue}, and bytes → Base64 before writing.
 *
 * This lives in the protocol package (not the app) so the *entire* wire path —
 * Base64 decode → byte parse — is pure and unit-tested in CI, independent of any
 * React Native / Hermes `atob`/`btoa`/`Buffer` availability. It has no DOM, Node,
 * or RN dependencies. See `docs/architecture/ble-and-protocol.md` §3.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Reverse lookup: char code → 6-bit value (-1 for non-alphabet chars). */
const DECODE_TABLE: Int8Array = (() => {
  const table = new Int8Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

/**
 * Decode a standard Base64 string into bytes. Whitespace is ignored and the
 * trailing `=` padding is optional, so values produced by either padded or
 * unpadded encoders decode correctly. Characters outside the Base64 alphabet
 * (other than `=`/whitespace) throw.
 */
export function bytesFromBase64(input: string): Uint8Array {
  let clean = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "=") break; // padding marks the end of data
    if (ch === "\n" || ch === "\r" || ch === " " || ch === "\t") continue;
    clean += ch;
  }

  const outLen = Math.floor((clean.length * 6) / 8);
  const out = new Uint8Array(outLen);

  let acc = 0;
  let bits = 0;
  let p = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const val = code < 128 ? DECODE_TABLE[code] : -1;
    if (val < 0) {
      throw new Error(`Invalid Base64 character: ${JSON.stringify(clean[i])}`);
    }
    acc = (acc << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = (acc >> bits) & 0xff;
    }
  }

  return out;
}

/** Encode bytes as a standard, `=`-padded Base64 string. */
export function base64FromBytes(bytes: Uint8Array): string {
  let out = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    const triple = (b0 << 16) | (b1 << 8) | b2;
    out += ALPHABET[(triple >> 18) & 0x3f];
    out += ALPHABET[(triple >> 12) & 0x3f];
    out += i + 1 < len ? ALPHABET[(triple >> 6) & 0x3f] : "=";
    out += i + 2 < len ? ALPHABET[triple & 0x3f] : "=";
  }
  return out;
}
