/**
 * Lazy, memoised sparkline points per session (SPEC §4.9 "optional sparkline").
 * Keyed by id and pass count so a live session refreshes as passes arrive. Reads
 * the existing `passesForSession` query only; no schema or repository change.
 */
import { useEffect, useState } from 'react';

import { getSessionRepository } from '@/store/persistence/historyAccess';
import { sparkPoints } from './heat';

const cache = new Map<string, string | null>();
const MAX_ENTRIES = 200;

export function clearSparkCache(): void {
  cache.clear();
}

export function useSessionSpark(id: number, passCount: number): string | null {
  const key = `${id}:${passCount}`;
  // The cache is the source of truth; state only re-renders once a load lands.
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (cache.has(key)) return;
    const repo = getSessionRepository();
    if (!repo || passCount < 2) return;
    let active = true;
    repo
      .passesForSession(id)
      .then((passes) => {
        // The repository returns newest first; the line reads oldest → newest.
        const next = sparkPoints(passes.map((p) => p.scaleMph).reverse());
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
        cache.set(key, next);
        if (active) setLoaded((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id, key, passCount]);
  return cache.get(key) ?? null;
}
