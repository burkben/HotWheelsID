/**
 * Pure formatting helpers for the Garage screens. Kept framework-free so they unit
 * test under Node and stay consistent between the list and detail views.
 */
import type { CarRecord } from '@/store/persistence/carRepository';

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
export function formatMph(bestMph: number): string {
  return bestMph > 0 ? Math.round(bestMph).toString() : '—';
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
