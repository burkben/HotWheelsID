/**
 * Pure formatting helpers for the Garage screens. Kept framework-free so they unit
 * test under Node and stay consistent between the list and detail views.
 */
import type { CarRecord } from '@/store/persistence/carRepository';
import { formatBestSpeed, type SpeedDisplay } from '../speed/format';

/** Last two octets of a colon-separated NFC UID, e.g. `6C:C4:5A:2B:64:81` → `64:81`. */
export function shortUid(uid: string): string {
  const parts = uid.split(':');
  return parts.length > 2 ? parts.slice(-2).join(':') : uid;
}

/** A car's display name: its nickname if set, else the shortened UID. */
export function carLabel(car: Pick<CarRecord, 'name' | 'uid'>): string {
  return car.name?.trim() ? car.name.trim() : shortUid(car.uid);
}

/** Best speed as a whole number, or an em dash when never recorded. */
export function formatMph(bestMph: number, display?: SpeedDisplay): string {
  return formatBestSpeed(bestMph, display);
}

/** Best lap in seconds (2dp), or an em dash when the car has never finished a race. */
export function formatLap(bestLap: number | null): string {
  return bestLap != null && bestLap > 0 ? `${bestLap.toFixed(2)}s` : '—';
}

/** Compact relative "last seen" label. `now` is injectable for tests. */
export function formatLastSeen(at: number, now: number = Date.now()): string {
  const diff = now - at;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(at).toLocaleDateString();
}

/**
 * A casting/model id formatted for display, or `null` when the casting is unknown.
 * The 8-hex-char key is split into two quads for readability: `41AE5E5B` → `41AE·5E5B`.
 */
export function castingLabel(modelId: string | null | undefined): string | null {
  if (!modelId) return null;
  const hex = modelId.toUpperCase();
  return hex.length === 8 ? `${hex.slice(0, 4)}·${hex.slice(4)}` : hex;
}

/** "N copies" phrasing for a casting group; the count includes the car itself. */
export function formatCopies(count: number): string {
  return count === 1 ? '1 copy' : `${count} copies`;
}
