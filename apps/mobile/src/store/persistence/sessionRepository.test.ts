import { describe, expect, it } from "vitest";

import { InMemorySessionRepository } from "./sessionRepository";

describe("InMemorySessionRepository", () => {
  it("opens sessions with increasing ids", async () => {
    const repo = new InMemorySessionRepository();
    expect(await repo.startSession(100)).toBe(1);
    expect(await repo.startSession(200)).toBe(2);
  });

  it("bumps pass count and best mph as passes are added", async () => {
    const repo = new InMemorySessionRepository();
    const id = await repo.startSession(0);
    await repo.addPass(id, { raw: 1, scaleMph: 12, at: 10 });
    await repo.addPass(id, { raw: 2, scaleMph: 19, at: 20, carUid: "AA", serial: "S" });
    await repo.addPass(id, { raw: 3, scaleMph: 8, at: 30 }); // slower, best unchanged

    const [s] = await repo.listSessions();
    expect(s.passCount).toBe(3);
    expect(s.bestMph).toBe(19);
  });

  it("marks a session ended without touching its passes", async () => {
    const repo = new InMemorySessionRepository();
    const id = await repo.startSession(0);
    await repo.addPass(id, { raw: 1, scaleMph: 5, at: 1 });
    await repo.endSession(id, 999);

    const [s] = await repo.listSessions();
    expect(s.endedAt).toBe(999);
    expect(s.passCount).toBe(1);
  });

  it("lists sessions most-recently-started first", async () => {
    const repo = new InMemorySessionRepository();
    await repo.startSession(100);
    await repo.startSession(500);
    expect((await repo.listSessions()).map((s) => s.startedAt)).toEqual([500, 100]);
  });

  it("returns only a session's passes, most-recent first", async () => {
    const repo = new InMemorySessionRepository();
    const a = await repo.startSession(0);
    const b = await repo.startSession(0);
    await repo.addPass(a, { raw: 1, scaleMph: 5, at: 10 });
    await repo.addPass(b, { raw: 2, scaleMph: 6, at: 20 });
    await repo.addPass(a, { raw: 3, scaleMph: 7, at: 30 });

    const passesA = await repo.passesForSession(a);
    expect(passesA.map((p) => p.at)).toEqual([30, 10]);
    expect(passesA.every((p) => p.sessionId === a)).toBe(true);
  });

  it("clear() forgets all history", async () => {
    const repo = new InMemorySessionRepository();
    const id = await repo.startSession(0);
    await repo.addPass(id, { raw: 1, scaleMph: 5, at: 1 });
    await repo.clear();
    expect(await repo.listSessions()).toHaveLength(0);
    expect(await repo.passesForSession(id)).toHaveLength(0);
  });

  it("addPass rejects a pass for an unknown session", async () => {
    const repo = new InMemorySessionRepository();
    await expect(repo.addPass(999, { raw: 1, scaleMph: 5, at: 1 })).rejects.toThrow();
    expect(await repo.passesForSession(999)).toHaveLength(0);
  });

  it("returns copies, not internal references", async () => {
    const repo = new InMemorySessionRepository();
    const id = await repo.startSession(0);
    const sessions = await repo.listSessions();
    (sessions[0] as { passCount: number }).passCount = 999;
    expect((await repo.listSessions())[0].passCount).toBe(0);
    expect(id).toBe(1);
  });
});
