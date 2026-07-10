/**
 * Structured decoder for the base64url **Mattel car id** carried in a Hot
 * Wheels id car's NFC NDEF record (see {@link decodeNdefRecord}).
 *
 * Decoded, the id is laid out as (reverse-engineered — see the note below):
 *
 * ```
 *   01 00 | 41 ae 5e 5b |   00 00 06 00 5d 13 29 97 04   | 2a 7e a2 f1 62 80
 *   ^ver    ^model id        ^production / misc            ^NFC tag UID (6 bytes)
 *   (2)     (4)              (9)                            (6)
 * ```
 *
 * The 4 **model-id** bytes are constant per casting (two physical copies of the
 * same car share them) while the trailing 6 bytes are the per-tag NFC UID — the
 * *same* UID the portal also reports out-of-band in `CarInfo.tagUid`. That
 * duplication is what {@link mattelIdMatchesUid} exploits to *validate* this
 * layout at runtime: if the embedded tail ever disagrees with the reported UID,
 * the offsets are wrong for that car.
 *
 * The byte layout is a best guess, so decoding is deliberately defensive: fields
 * beyond the model id are only populated when the id is long enough to contain
 * them, and {@link decodeMattelId} returns `null` for anything too short to
 * carry a model id at all.
 */

import { bytesFromBase64 } from "../base64";
import { bytesToHex } from "../decode";

/** Field offsets/lengths within the decoded Mattel id (all in bytes). */
const VERSION_OFFSET = 0;
const VERSION_LENGTH = 2;
const MODEL_ID_OFFSET = 2;
const MODEL_ID_LENGTH = 4;
const MISC_OFFSET = 6;
const MISC_LENGTH = 9;
const TAG_UID_OFFSET = 15;
const TAG_UID_LENGTH = 6;

/** The smallest id we can pull a casting (model) id out of. */
const MIN_DECODABLE_LENGTH = MODEL_ID_OFFSET + MODEL_ID_LENGTH;

/** A Mattel car id decoded into its constituent fields. */
export interface DecodedMattelId {
  /** Format/version prefix as lowercase hex (e.g. `"0100"`). */
  readonly version: string;
  /** Casting id as lowercase hex (e.g. `"41ae5e5b"`) — constant per casting. */
  readonly modelId: string;
  /** Production/misc bytes as lowercase hex, when present. */
  readonly misc?: string;
  /**
   * The embedded NFC tag UID, formatted like {@link parseNfcUid}
   * (`"2A:7E:A2:F1:62:80"`), when the id is long enough to carry it.
   */
  readonly tagUid?: string;
}

/** Normalise a base64url string to standard base64 (`-_` → `+/`, repad). */
function base64urlToBase64(input: string): string {
  let s = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  return s;
}

/** Lowercase, unseparated hex — the form used for the casting key. */
function toHexLower(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

/**
 * Decode a base64url `mattelId` into its structured fields.
 *
 * Returns `null` for an empty/absent id, one that is not valid base64, or one
 * too short to carry a model id. `misc` and `tagUid` are populated only when the
 * decoded byte count reaches their offsets, so a short-but-valid id still yields
 * a usable `{ version, modelId }`.
 */
export function decodeMattelId(mattelId: string | undefined | null): DecodedMattelId | null {
  if (!mattelId) return null;
  let bytes: Uint8Array;
  try {
    bytes = bytesFromBase64(base64urlToBase64(mattelId));
  } catch {
    return null;
  }
  if (bytes.length < MIN_DECODABLE_LENGTH) return null;

  const decoded: {
    version: string;
    modelId: string;
    misc?: string;
    tagUid?: string;
  } = {
    version: toHexLower(bytes.subarray(VERSION_OFFSET, VERSION_OFFSET + VERSION_LENGTH)),
    modelId: toHexLower(bytes.subarray(MODEL_ID_OFFSET, MODEL_ID_OFFSET + MODEL_ID_LENGTH)),
  };

  if (bytes.length >= MISC_OFFSET + MISC_LENGTH) {
    decoded.misc = toHexLower(bytes.subarray(MISC_OFFSET, MISC_OFFSET + MISC_LENGTH));
  }
  if (bytes.length >= TAG_UID_OFFSET + TAG_UID_LENGTH) {
    decoded.tagUid = bytesToHex(bytes.subarray(TAG_UID_OFFSET, TAG_UID_OFFSET + TAG_UID_LENGTH));
  }

  return decoded;
}

/**
 * Cross-check the UID embedded in a `mattelId` against the UID the portal
 * reports separately (from `CarInfo.tagUid`, formatted by {@link parseNfcUid}).
 *
 * Returns `true`/`false` when both a decoded tag UID and a reported `uid` are
 * available to compare, or `null` when the check is indeterminate (missing id,
 * an id too short to carry the tail, or no reported UID). Comparison is
 * case-insensitive so callers need not pre-normalise.
 */
export function mattelIdMatchesUid(
  mattelId: string | undefined | null,
  uid: string | undefined | null,
): boolean | null {
  const embedded = decodeMattelId(mattelId)?.tagUid;
  if (!embedded || !uid) return null;
  return embedded.toUpperCase() === uid.toUpperCase();
}
