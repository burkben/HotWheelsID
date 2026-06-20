/**
 * Pure builders for the human-shareable race & session summaries handed to the
 * native Share sheet. Framework-free so they unit test under Node and stay
 * consistent with what each screen renders (lap times mirror race.tsx's clock;
 * speeds run through the same speed/format converter as every readout, so a
 * shared number matches what the user sees for their chosen unit + calibration).
 */
import type { RaceResult } from '../race/raceEngine';
import type { SessionPass, SessionSummary } from '../store/persistence/sessionRepository';
import { shortUid } from '../garage/format';
import { formatDuration, formatSessionDate } from '../history/format';
import {
  formatBestSpeed,
  formatSpeedValue,
  speedUnitLabel,
  type SpeedDisplay,
} from '../speed/format';

const SIGNATURE = 'via RedlineID';

/** Lap/total time as `SS.ss`s, rolling over to `M:SS.ss` past a minute (mirrors race.tsx). */
export function formatLapTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '\u2014';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}:${(seconds - m * 60).toFixed(2).padStart(5, '0')}`;
  }
  return `${seconds.toFixed(2)}s`;
}

export interface RaceShareOpts {
  /** The car's nickname, when known; falls back to the shortened UID. */
  readonly carName?: string | null;
}

/** Celebratory recap of a finished race: total time, splits, and lap-by-lap. */
export function raceShareText(result: RaceResult, opts: RaceShareOpts = {}): string {
  const car = opts.carName?.trim() ? opts.carName.trim() : shortUid(result.carUid);
  const laps = result.lapCount === 1 ? '1 lap' : `${result.lapCount} laps`;

  const lines: string[] = [
    `\u{1F3C1} ${result.player} finished ${laps} in ${formatLapTime(result.totalTime)}`,
    `Car: ${car}`,
    '',
    `Best lap ${formatLapTime(result.bestLap)} (lap ${result.bestLapNum})`,
    `Average ${formatLapTime(result.avgLap)}`,
    `Worst lap ${formatLapTime(result.worstLap)} (lap ${result.worstLapNum})`,
  ];

  if (result.lapTimes.length > 0) {
    lines.push('', 'Laps:');
    result.lapTimes.forEach((t, i) => {
      const flash = i + 1 === result.bestLapNum ? ' \u26A1' : '';
      lines.push(`  ${i + 1}. ${formatLapTime(t)}${flash}`);
    });
  }

  lines.push('', SIGNATURE);
  return lines.join('\n');
}

export interface SessionShareOpts {
  /** Unit + calibration so shared speeds match the on-screen readouts. */
  readonly display?: SpeedDisplay;
  /** Optional car nicknames keyed by UID, used to label the top passes. */
  readonly carNames?: ReadonlyMap<string, string>;
  /** How many of the fastest passes to list (default 3). */
  readonly topN?: number;
}

/** Recap of a saved session: date, pass count, duration, best, and the fastest passes. */
export function sessionShareText(
  session: SessionSummary,
  passes: readonly SessionPass[],
  opts: SessionShareOpts = {},
): string {
  const { display, carNames, topN = 3 } = opts;
  const unit = speedUnitLabel(display?.unit ?? 'mph');
  const passLabel = session.passCount === 1 ? '1 pass' : `${session.passCount} passes`;

  const lines: string[] = [
    `\u{1F3CE}\uFE0F Race session \u2014 ${formatSessionDate(session.startedAt)}`,
    `${passLabel} \u00b7 ${formatDuration(session.startedAt, session.endedAt)}`,
    `Best ${formatBestSpeed(session.bestMph, display)} ${unit}`,
  ];

  const top = [...passes].sort((a, b) => b.scaleMph - a.scaleMph).slice(0, Math.max(0, topN));
  if (top.length > 0) {
    lines.push('', top.length === 1 ? 'Top pass:' : `Top ${top.length} passes:`);
    top.forEach((p, i) => {
      const name = p.carUid
        ? carNames?.get(p.carUid)?.trim() || shortUid(p.carUid)
        : 'Unknown car';
      lines.push(`  ${i + 1}. ${formatSpeedValue(p.scaleMph, display)} ${unit} \u2014 ${name}`);
    });
  }

  lines.push('', SIGNATURE);
  return lines.join('\n');
}
