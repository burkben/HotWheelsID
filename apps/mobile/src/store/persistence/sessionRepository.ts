/**
 * Persistence seam for **History** — durable race-portal sessions and the passes
 * recorded during them (ADR-0006, Phase 3).
 *
 * A *session* spans one BLE connection (open on connect, close on disconnect). A
 * *pass* is one car crossing recorded while a session is open — the durable mirror
 * of `portalStore`'s in-memory `Pass[]` (already filtered to ≥1 mph, one row per
 * crossing, so volume stays modest).
 *
 * Like the other repositories, the contract + a pure {@link InMemorySessionRepository}
 * live here so the History screens and unit tests stay free of native modules. The
 * `expo-sqlite` implementation is in `sqliteSessionRepository.ts`, imported solely
 * by the app bootstrap.
 */

/** A session row for the History list. */
export interface SessionSummary {
  readonly id: number;
  readonly startedAt: number;
  /** `null` while the session is still open (portal connected). */
  readonly endedAt: number | null;
  readonly passCount: number;
  readonly bestMph: number;
}

/** One recorded pass within a session. */
export interface SessionPass {
  readonly id: number;
  readonly sessionId: number;
  readonly carUid: string | null;
  readonly serial: string | null;
  readonly raw: number;
  readonly scaleMph: number;
  readonly at: number;
}

export interface PassInput {
  readonly carUid?: string | null;
  readonly serial?: string | null;
  readonly raw: number;
  readonly scaleMph: number;
  readonly at: number;
}

export interface SessionRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Begin a session; resolves with its new id. */
  startSession(startedAt: number): Promise<number>;
  /** Mark a session finished. */
  endSession(id: number, endedAt: number): Promise<void>;
  /** Append a pass and bump the session's `passCount` / `bestMph`. */
  addPass(sessionId: number, pass: PassInput): Promise<void>;
  /** All sessions, most-recently-started first. */
  listSessions(): Promise<SessionSummary[]>;
  /** A session's passes, most-recent first. */
  passesForSession(sessionId: number): Promise<SessionPass[]>;
  /** Forget all history. */
  clear(): Promise<void>;
}

/**
 * Zero-dependency repository used by tests/CI and whenever the native SQLite
 * module is unavailable. Holds sessions + passes in plain arrays.
 */
export class InMemorySessionRepository implements SessionRepository {
  private sessions: SessionSummary[] = [];
  private passes: SessionPass[] = [];
  private sessionSeq = 0;
  private passSeq = 0;

  async init(): Promise<void> {}

  async startSession(startedAt: number): Promise<number> {
    const id = ++this.sessionSeq;
    this.sessions.push({ id, startedAt, endedAt: null, passCount: 0, bestMph: 0 });
    return id;
  }

  async endSession(id: number, endedAt: number): Promise<void> {
    this.sessions = this.sessions.map((s) => (s.id === id ? { ...s, endedAt } : s));
  }

  async addPass(sessionId: number, pass: PassInput): Promise<void> {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error(`addPass: session ${sessionId} not found`);
    const id = ++this.passSeq;
    this.passes.push({
      id,
      sessionId,
      carUid: pass.carUid ?? null,
      serial: pass.serial ?? null,
      raw: pass.raw,
      scaleMph: pass.scaleMph,
      at: pass.at,
    });
    this.sessions = this.sessions.map((s) =>
      s.id === sessionId
        ? { ...s, passCount: s.passCount + 1, bestMph: Math.max(s.bestMph, pass.scaleMph) }
        : s,
    );
  }

  async listSessions(): Promise<SessionSummary[]> {
    return [...this.sessions]
      .sort((a, b) => b.startedAt - a.startedAt || b.id - a.id)
      .map((s) => ({ ...s }));
  }

  async passesForSession(sessionId: number): Promise<SessionPass[]> {
    return this.passes
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => b.at - a.at || b.id - a.id)
      .map((p) => ({ ...p }));
  }

  async clear(): Promise<void> {
    this.sessions = [];
    this.passes = [];
  }
}
