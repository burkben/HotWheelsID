/**
 * Settings presentation (SPEC §4.11). Pure: the portal card reads the same
 * {@link portalStatusPresentation} the status chip uses, so labels and actions
 * never diverge; the laps stepper walks the existing LAP_OPTIONS.
 */
import type { PortalStatusPresentation } from '@/portal/selectors';

export type PortalCardTone = 'connected' | 'searching' | 'idle';

export interface PortalCardPresentation {
  readonly tone: PortalCardTone;
  /** Eyebrow after the status dot, e.g. "CONNECTED". */
  readonly eyebrow: string;
  readonly title: string;
  readonly hint: string;
  /** Ghost button label, or null when there is nothing to do. */
  readonly action: string | null;
  /** Bluetooth off, unauthorised or failed: the eyebrow reads in redFlag. */
  readonly error: boolean;
}

export function portalCardPresentation(status: Pick<PortalStatusPresentation, 'label' | 'action' | 'busy' | 'tone'>, demo: boolean): PortalCardPresentation {
  const tone: PortalCardTone = status.busy ? 'searching' : status.tone === 'connected' ? 'connected' : 'idle';
  const action = status.action === 'disconnect' ? 'DISCONNECT' : status.action === 'retry' ? 'RETRY' : status.action === 'connect' ? 'CONNECT' : null;
  return {
    tone,
    eyebrow: tone === 'connected' ? (demo ? 'DEMO PORTAL' : 'CONNECTED') : status.label.toUpperCase(),
    title: demo ? 'DEMO MODE' : 'RACE PORTAL',
    hint: demo ? 'Simulated cars and speeds, no portal needed' : "Auto-connects when it's switched on",
    action,
    error: status.tone === 'error',
  };
}

/** Next or previous lap target, clamped to the option list. Unknown values snap to the nearest option. */
export function stepLapOption(options: readonly number[], current: number, direction: -1 | 1): number {
  if (options.length === 0) return current;
  const nearest = options.reduce((best, n, i) => (Math.abs(n - current) < Math.abs(options[best] - current) ? i : best), 0);
  const index = options[nearest] === current ? nearest + direction : nearest;
  return options[Math.max(0, Math.min(options.length - 1, index))];
}

/** "VERSION 1.0.0 (12)", or without the build when the config has none. */
export function versionLabel(version: string | null | undefined, build: string | number | null | undefined): string {
  const v = version?.trim() || '—';
  const b = build != null && String(build).trim() ? ` (${String(build).trim()})` : '';
  return `VERSION ${v}${b}`;
}
