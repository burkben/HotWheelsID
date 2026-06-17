/**
 * Module-level accessor for the durable {@link SessionRepository} (History).
 *
 * Per the Phase 3 plan, History has **no render store** — the list/detail screens
 * read on focus straight from the repository (cold list reads, not a hot path). The
 * bootstrap publishes the live repo here once persistence is up; screens pull it
 * lazily. When SQLite is absent (no rebuild yet) this stays `null` and the screens
 * show an empty state.
 */
import type { SessionRepository } from "./sessionRepository";

let sessionRepository: SessionRepository | null = null;

export function setSessionRepository(repo: SessionRepository | null): void {
  sessionRepository = repo;
}

export function getSessionRepository(): SessionRepository | null {
  return sessionRepository;
}
