import { describe, expect, it } from "vitest";

import {
  createTournament,
  currentMatch,
  isComplete,
  reportTimes,
  reportWinner,
  type Tournament,
} from "./tournament";

/** Play the whole bracket out, always advancing the current match's A slot. */
function winAllByA(t: Tournament): Tournament {
  let cur = t;
  for (let guard = 0; guard < 64; guard++) {
    const m = currentMatch(cur);
    if (!m || !m.a) break;
    cur = reportWinner(cur, m.id, m.a);
  }
  return cur;
}

describe("tournament", () => {
  it("treats a single racer as the champion with no matches", () => {
    const t = createTournament(["racer-1"]);
    expect(t.matches).toHaveLength(0);
    expect(t.championId).toBe("racer-1");
    expect(isComplete(t)).toBe(true);
    expect(currentMatch(t)).toBeNull();
  });

  it("builds one match for two racers and crowns the winner", () => {
    const t = createTournament(["a", "b"]);
    expect(t.rounds).toBe(1);
    expect(t.matches).toHaveLength(1);

    const m = currentMatch(t)!;
    expect([m.a, m.b].sort()).toEqual(["a", "b"]);

    const done = reportWinner(t, m.id, "b");
    expect(done.championId).toBe("b");
    expect(isComplete(done)).toBe(true);
    expect(currentMatch(done)).toBeNull();
  });

  it("builds a clean 4-racer, 3-match, 2-round bracket", () => {
    const t = createTournament(["a", "b", "c", "d"]);
    expect(t.rounds).toBe(2);
    // 2 semis + 1 final.
    expect(t.matches).toHaveLength(3);
    expect(t.matches.filter((m) => m.round === 1)).toHaveLength(2);
    expect(t.matches.filter((m) => m.round === 2)).toHaveLength(1);
    // No byes: every round-1 slot is filled and undecided.
    for (const m of t.matches.filter((m) => m.round === 1)) {
      expect(m.a).not.toBeNull();
      expect(m.b).not.toBeNull();
      expect(m.winner).toBeNull();
    }
  });

  it("auto-advances byes for 3 racers and never pairs two byes", () => {
    const t = createTournament(["a", "b", "c"]);
    expect(t.rounds).toBe(2);
    // The top seed gets a bye: exactly one round-1 match is already decided.
    const round1 = t.matches.filter((m) => m.round === 1);
    const decided = round1.filter((m) => m.winner);
    expect(decided).toHaveLength(1);
    expect(decided[0].b).toBeNull(); // bye slot is empty
    expect(decided[0].winner).toBe(decided[0].a);
    // No match has both slots empty.
    expect(t.matches.every((m) => m.a !== null || m.b !== null || m.round > 1)).toBe(true);

    // The only runnable match is the real round-1 pairing.
    const cur = currentMatch(t)!;
    expect(cur.round).toBe(1);
    expect(cur.a).not.toBeNull();
    expect(cur.b).not.toBeNull();
  });

  it("plays a full 3-racer bracket to a champion", () => {
    const t = createTournament(["a", "b", "c"]);
    const champ = winAllByA(t);
    expect(champ.championId).not.toBeNull();
    expect(isComplete(champ)).toBe(true);
  });

  it("handles 5 racers (padded to 8) with three byes and one live opener", () => {
    const t = createTournament(["a", "b", "c", "d", "e"]);
    expect(t.rounds).toBe(3);
    expect(t.matches.filter((m) => m.round === 1)).toHaveLength(4);
    const round1Decided = t.matches.filter((m) => m.round === 1 && m.winner);
    expect(round1Decided).toHaveLength(3); // three byes auto-resolved
    const champ = winAllByA(t);
    expect(isComplete(champ)).toBe(true);
  });

  it("advances a winner into the next round's correct slot", () => {
    const t = createTournament(["a", "b", "c", "d"]);
    const semis = t.matches.filter((m) => m.round === 1);
    const afterFirst = reportWinner(t, semis[0].id, semis[0].a!);
    const final = afterFirst.matches.find((m) => m.round === 2)!;
    // First semi feeds the final's A slot; the second semi is still pending.
    expect(final.a).toBe(semis[0].a);
    expect(final.b).toBeNull();
  });

  it("decides a match by heat time, lower wins", () => {
    const t = createTournament(["a", "b"]);
    const m = currentMatch(t)!;
    const byA = reportTimes(t, m.id, 11.2, 12.9);
    expect(byA.championId).toBe(m.a);

    const byB = reportTimes(t, m.id, 13.0, 12.9);
    expect(byB.championId).toBe(m.b);
  });

  it("breaks a time tie in favor of the A-slot racer", () => {
    const t = createTournament(["a", "b"]);
    const m = currentMatch(t)!;
    const tie = reportTimes(t, m.id, 12.5, 12.5);
    expect(tie.championId).toBe(m.a);
  });

  it("ignores an unknown winner or a second result for a settled match", () => {
    const t = createTournament(["a", "b"]);
    const m = currentMatch(t)!;
    expect(reportWinner(t, m.id, "zzz")).toBe(t); // not a participant
    const done = reportWinner(t, m.id, "a");
    expect(reportWinner(done, m.id, "b")).toBe(done); // already decided
  });
});
