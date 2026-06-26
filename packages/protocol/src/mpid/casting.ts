/**
 * Derive a stable *casting key* from a car's Mattel id.
 *
 * Every Hot Wheels id car emits a base64url `mattelId` inside its NFC NDEF
 * record (see {@link decodeNdefRecord}). Decoded, that id is laid out as:
 *
 * ```
 *   01 00 | 41 ae 5e 5b |   00 00 06 00 5d 13 29 97 04   | 2a 7e a2 f1 62 80
 *   ^ver    ^model id        ^production / misc            ^NFC tag UID (6 bytes)
 * ```
 *
 * The 4 bytes at offset 2 are **constant per casting** (the model id) while the
 * trailing 6 bytes are the per-tag UID — so two physical copies of the same car
 * share a model id but differ by UID. We hex-encode those 4 bytes as the casting
 * key, which lets the app remember "this casting is the '70 Charger" once and
 * apply it to every copy.
 *
 * The byte layout is reverse-engineered (`docs/PROTOCOL.md` documents it as a
 * best guess), so this is intentionally defensive: if the id is missing or too
 * short to slice, we fall back to the full id string. Identity still works in
 * that case — it just keys per distinct id rather than per casting.
 */

import { bytesFromBase64 } from "../base64";

/** Offset/length of the model-id field within the decoded Mattel id. */
const MODEL_ID_OFFSET = 2;
const MODEL_ID_LENGTH = 4;

/** Normalise a base64url string to standard base64 ( `-_` → `+/`, repad ). */
function base64urlToBase64(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  return s;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

/**
 * Map a `mattelId` to its casting key. Returns `undefined` only for an
 * empty/absent id; otherwise always returns a non-empty string (the model-id
 * hex when decodable, else the raw id).
 */
export function castingKeyFromMattelId(mattelId: string | undefined | null): string | undefined {
  if (!mattelId) return undefined;
  try {
    const bytes = bytesFromBase64(base64urlToBase64(mattelId));
    if (bytes.length >= MODEL_ID_OFFSET + MODEL_ID_LENGTH) {
      return toHex(bytes.subarray(MODEL_ID_OFFSET, MODEL_ID_OFFSET + MODEL_ID_LENGTH));
    }
  } catch {
    // fall through to the raw-id fallback
  }
  return mattelId;
}
