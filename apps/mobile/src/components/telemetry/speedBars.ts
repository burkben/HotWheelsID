import { colorsR } from '@/theme/tokens';

/** Canonical scale mph, independent of the selected display unit/calibration. */
export function recentPassBarColor(mph: number, latest: boolean, newBest: boolean): string {
  if (latest) return newBest ? colorsR.caution : colorsR.flame;
  return mph >= 220 ? colorsR.flame : colorsR.barMuted;
}

/** Match the existing pass haptic/source treatment: a tied session best qualifies. */
export function isSessionBest(mph: number, bestMph: number): boolean {
  return mph > 0 && bestMph > 0 && mph >= bestMph;
}

/** The protected portal store retains at most 20 passes, not a lifetime counter. */
export function sessionPassCaption(retainedCount: number): string {
  return retainedCount >= 20 ? 'RECENT' : 'SESSION';
}
