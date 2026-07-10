/**
 * Derive a stable *casting key* from a car's Mattel id.
 *
 * Every Hot Wheels id car emits a base64url `mattelId` inside its NFC NDEF
 * record (see {@link decodeNdefRecord}). Its decoded byte layout — and the
 * defensive rationale for slicing it — is documented on {@link decodeMattelId}
 * in `./mattelId`, which this module delegates to so there is a single source
 * of truth for the layout.
 *
 * The 4 model-id bytes are constant per casting while the trailing 6 bytes are
 * the per-tag UID, so two physical copies of the same car share a model id but
 * differ by UID. We use the model-id hex as the casting key, which lets the app
 * remember "this casting is the '70 Charger" once and apply it to every copy.
 */

import { decodeMattelId } from "./mattelId";

/**
 * Map a `mattelId` to its casting key. Returns `undefined` only for an
 * empty/absent id; otherwise always returns a non-empty string (the model-id
 * hex when decodable, else the raw id so identity still works per-id).
 */
export function castingKeyFromMattelId(mattelId: string | undefined | null): string | undefined {
  if (!mattelId) return undefined;
  return decodeMattelId(mattelId)?.modelId ?? mattelId;
}
