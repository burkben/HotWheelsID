/**
 * Pure formatting helpers for the History screens. Framework-free so they unit
 * test under Node and stay consistent between the session list and detail views.
 */
import { formatBestSpeed, formatSpeedValue, type SpeedDisplay } from '../speed/format';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** A session's start as a compact local label, e.g. `Jun 17 · 2:34 PM`. */
export function formatSessionDate(at: number): string {
  const d = new Date(at);
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h %= 12;
  if (h === 0) h = 12;
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${d.getDate()} · ${h}:${min} ${ampm}`;
}

/** Session length, or `in progress` while still open (portal connected). */
export function formatDuration(startedAt: number, endedAt: number | null): string {
  if (endedAt == null) return 'in progress';
  const totalSec = Math.round(Math.max(0, endedAt - startedAt) / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m === 0 ? `${s}s` : `${m}m ${s.toString().padStart(2, '0')}s`;
}

/** Wall-clock `HH:MM:SS` of a pass (matches the Home recent-passes feed). */
export function formatClock(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Whole-number mph for a pass row. */
export function formatPassMph(scaleMph: number, display?: SpeedDisplay): string {
  return formatSpeedValue(scaleMph, display);
}

/** Best mph for a session row, or an em dash when no pass was recorded. */
export function formatMphLabel(bestMph: number, display?: SpeedDisplay): string {
  return formatBestSpeed(bestMph, display);
}

/** `"3 passes"` / `"1 pass"`. */
export function passCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'pass' : 'passes'}`;
}
