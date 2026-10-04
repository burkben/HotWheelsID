import type { CarRecord } from '@/store/persistence/carRepository';

/** Derive plates without mutating the store's most-recently-seen ordering.
 * UID breaks firstSeen ties so reordering/detecting a car cannot change its plate.
 * A missing car has no invented position; it uses the unknown-plate glyph.
 */
export function plateNumber(cars: readonly Pick<CarRecord, 'uid' | 'firstSeen'>[], uid: string): string {
  const ordered = [...cars].sort((a, b) => a.firstSeen - b.firstSeen || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  const index = ordered.findIndex((car) => car.uid === uid);
  return index < 0 ? '?' : String(index + 1).padStart(2, '0');
}
