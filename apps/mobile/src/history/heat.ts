/**
 * History derivations (SPEC §4.9): the 14-day heat strip, TODAY / THIS WEEK /
 * EARLIER grouping, the all-time-best session and sparkline points. Pure and
 * computed client-side from `listSessions()` / `passesForSession()`.
 *
 * Days are local calendar days built from date components, never by adding
 * 24 h, so DST transitions and time zones keep sessions on the right day.
 */
export interface SessionLike {
  readonly id: number;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly passCount: number;
  readonly bestMph: number;
}

export interface HeatDay {
  /** Local midnight of the day. */
  readonly date: number;
  readonly sessions: number;
  readonly passes: number;
  /** Heat ramp index 0–3 (3 = three or more sessions). */
  readonly level: 0 | 1 | 2 | 3;
  /** Weekday initial, M T W T F S S. */
  readonly letter: string;
  readonly isToday: boolean;
}

export interface HeatStrip {
  readonly days: readonly HeatDay[];
  readonly sessions: number;
  readonly passes: number;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Local midnight `offset` calendar days from the day containing `at`. */
export function localDay(at: number, offset = 0): number {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime();
}

/** Oldest → today, one cell per local day. */
export function heatStrip(sessions: readonly SessionLike[], now: number, days = 14): HeatStrip {
  const start = localDay(now, -(days - 1));
  const cells = Array.from({ length: days }, (_, i) => ({ date: localDay(now, i - (days - 1)), sessions: 0, passes: 0 }));
  const index = new Map(cells.map((c, i) => [c.date, i]));
  let sessionsTotal = 0;
  let passesTotal = 0;
  for (const s of sessions) {
    if (s.startedAt < start) continue;
    const i = index.get(localDay(s.startedAt));
    if (i == null) continue; // a future-dated session (clock change) is not drawn
    cells[i].sessions += 1;
    cells[i].passes += s.passCount;
    sessionsTotal += 1;
    passesTotal += s.passCount;
  }
  return {
    days: cells.map((c, i) => ({
      ...c,
      level: Math.min(3, c.sessions) as HeatDay['level'],
      letter: LETTERS[new Date(c.date).getDay()],
      isToday: i === cells.length - 1,
    })),
    sessions: sessionsTotal,
    passes: passesTotal,
  };
}

/** One spoken summary for the whole strip. */
export function heatStripLabel(strip: HeatStrip): string {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const head = `Last ${strip.days.length} days: ${plural(strip.sessions, 'session')}, ${plural(strip.passes, 'pass')}`.replace('passs', 'passes');
  // On a tie the most recent day wins.
  const busiest = strip.days.reduce<HeatDay | null>((best, d) => (d.sessions > 0 && d.sessions >= (best?.sessions ?? 0) ? d : best), null);
  if (!busiest) return `${head}.`;
  const day = busiest.isToday ? 'today' : WEEKDAYS[new Date(busiest.date).getDay()];
  return `${head}. Busiest: ${day}, ${plural(busiest.sessions, 'session')}.`;
}

export type SessionGroupKey = 'TODAY' | 'THIS WEEK' | 'EARLIER';
export interface SessionGroup<T> {
  readonly key: SessionGroupKey;
  readonly sessions: readonly T[];
}

/**
 * TODAY is the current local day; THIS WEEK the six days before it (a rolling
 * week, independent of the locale's first weekday); EARLIER everything older.
 * Input order (newest first from the repository) is preserved; empty groups drop.
 */
export function groupSessions<T extends Pick<SessionLike, 'startedAt'>>(sessions: readonly T[], now: number): SessionGroup<T>[] {
  const today = localDay(now);
  const weekStart = localDay(now, -6);
  const groups: Record<SessionGroupKey, T[]> = { TODAY: [], 'THIS WEEK': [], EARLIER: [] };
  for (const s of sessions) {
    const day = localDay(s.startedAt);
    groups[day >= today ? 'TODAY' : day >= weekStart ? 'THIS WEEK' : 'EARLIER'].push(s);
  }
  return (['TODAY', 'THIS WEEK', 'EARLIER'] as const).filter((k) => groups[k].length > 0).map((key) => ({ key, sessions: groups[key] }));
}

/** Sessions holding the all-time best speed (caution sparkline and value). */
export function recordSessionIds(sessions: readonly SessionLike[]): ReadonlySet<number> {
  const top = sessions.reduce((max, s) => (Number.isFinite(s.bestMph) && s.bestMph > max ? s.bestMph : max), 0);
  return new Set(top > 0 ? sessions.filter((s) => s.bestMph === top).map((s) => s.id) : []);
}

/** Date tab parts: two-digit day and upper-case month. */
export function dateTab(at: number): { day: string; month: string } {
  const d = new Date(at);
  return { day: String(d.getDate()).padStart(2, '0'), month: MONTHS[d.getMonth()] };
}

/** "7:42 PM" in local time. */
export function formatStartTime(at: number): string {
  const d = new Date(at);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

/** "18 min", "45s", or "12 min so far" for a live session. */
export function sessionLength(startedAt: number, endedAt: number | null, now: number): string {
  const end = endedAt ?? now;
  const sec = Math.max(0, Math.round((end - startedAt) / 1000));
  const length = sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`;
  return endedAt == null ? `${length} so far` : length;
}

/**
 * Polyline points for a session sparkline, from speeds in time order (oldest first), in a `width × height` box (source:
 * 54 × 24 with 2 pt padding). At most `maxPoints`, evenly sampled, always keeping
 * the last pass. Higher speed draws higher. Fewer than two passes: no line.
 */
export function sparkPoints(speeds: readonly number[], width = 54, height = 24, maxPoints = 12): string | null {
  const values = speeds.filter((v) => Number.isFinite(v));
  if (values.length < 2) return null;
  const count = Math.min(maxPoints, values.length);
  const sampled = Array.from({ length: count }, (_, i) => values[Math.round((i * (values.length - 1)) / (count - 1))]);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const pad = 2;
  return sampled
    .map((v, i) => {
      const x = (i * width) / (count - 1);
      const y = max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

const round = (n: number) => Math.round(n * 10) / 10;
