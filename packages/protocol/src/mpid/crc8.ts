/**
 * CRC-8 used by the MPID packet framing.
 *
 * Parameters (recovered from `libnative-lib.so` `crc8_calc` / `crc8_table`):
 * polynomial `0x07`, init `0xFF`, MSB-first, no input/output reflection, no
 * final XOR. Ported 1:1 from `python/hwportal/mpid.py`.
 */
const POLY = 0x07;

function buildTable(): Uint8Array {
  const table = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 0x80 ? ((c << 1) ^ POLY) & 0xff : (c << 1) & 0xff;
    }
    table[i] = c;
  }
  return table;
}

export const CRC8_TABLE: Uint8Array = buildTable();

/** CRC-8 over `data`, seeded with `crc` (default `0xFF`). */
export function crc8(data: Uint8Array, crc = 0xff): number {
  for (let i = 0; i < data.length; i++) {
    crc = CRC8_TABLE[(crc ^ data[i]) & 0xff];
  }
  return crc;
}
