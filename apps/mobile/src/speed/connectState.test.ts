import { describe, expect, it } from 'vitest';
import { shouldShowFindPortal } from './connectState';

const fresh = { connection: 'disconnected', car: null, passCount: 0, mode: 'live' } as const;
describe('Find your portal state', () => {
  it('shows for an empty disconnected live session', () => expect(shouldShowFindPortal(fresh)).toBe(true));
  it('remains visible while searching/connecting', () => expect(shouldShowFindPortal({ ...fresh, connection: 'connecting' })).toBe(true));
  it('hides once connected even before a car or pass arrives', () => expect(shouldShowFindPortal({ ...fresh, connection: 'connected' })).toBe(false));
  it('hides for a current car', () => expect(shouldShowFindPortal({ ...fresh, car: { uid: 'car' } })).toBe(false));
  it('hides if this session already has a pass', () => expect(shouldShowFindPortal({ ...fresh, passCount: 1 })).toBe(false));
  it('hides in demo mode, including its initial connection', () => expect(shouldShowFindPortal({ ...fresh, mode: 'demo' })).toBe(false));
});
