/** Expanded units for screen-reader labels; callers may supply domain-specific labels. */
export function spokenUnit(unit = ''): string {
  const units: Record<string, string> = { mph: 'miles per hour', 'km/h': 'kilometers per hour', kmh: 'kilometers per hour', s: 'seconds', ms: 'milliseconds' };
  return units[unit.toLowerCase()] ?? unit;
}

export function timingPresentation(seconds?: number, deltaSeconds?: number, timeFormat: 'clock' | 'seconds' = 'clock') {
  const known = seconds != null && Number.isFinite(seconds) && seconds >= 0;
  const deltaKnown = deltaSeconds != null && Number.isFinite(deltaSeconds);
  const milliseconds = known ? Math.round(seconds * 1000) : 0;
  const time = known ? timeFormat === 'seconds' ? seconds.toFixed(3) : `${String(Math.floor(milliseconds / 60000)).padStart(2, '0')}:${((milliseconds % 60000) / 1000).toFixed(3).padStart(6, '0')}` : '—';
  const delta = deltaKnown ? `${deltaSeconds > 0 ? '+' : ''}${deltaSeconds.toFixed(3)}` : undefined;
  return { time, delta, slower: deltaKnown && deltaSeconds > 0, spoken: known ? `${seconds.toFixed(3)} seconds` : 'Time unavailable' };
}

export function spokenLapDelta(delta: number): string {
  if (!Number.isFinite(delta)) return 'Comparison unavailable';
  const comparison = delta === 0 ? 'equal to' : delta > 0 ? 'slower than' : 'faster than';
  return `${Math.abs(delta).toFixed(3)} seconds, ${comparison} fastest lap`;
}
