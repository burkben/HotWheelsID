import { describe, expect, it } from 'vitest';
import { statusChipPresentation } from './statusChipPresentation';

const base = { connection: 'connected', controlStatus: null, phase: null, mode: 'live', manuallyDisconnected: false } as const;
describe('statusChipPresentation', () => {
  it('shows the connected and on-portal tones', () => {
    expect(statusChipPresentation(base)).toMatchObject({ label: 'PORTAL LIVE', tone: 'connected', error: false });
    expect(statusChipPresentation({ ...base, controlStatus: 'carPresent' })).toMatchObject({ label: 'ON PORTAL', tone: 'onPortal' });
  });
  it('keeps a reading state visible', () => expect(statusChipPresentation({ ...base, controlStatus: 'transitional' }).label).toBe('READING…'));
  it('identifies demo even with a car on its pad', () => expect(statusChipPresentation({ ...base, mode: 'demo', controlStatus: 'carPresent' })).toMatchObject({ label: 'DEMO MODE', tone: 'demo' }));
  it('uses a hollow searching indicator', () => expect(statusChipPresentation({ ...base, connection: 'connecting', phase: 'scanning' })).toMatchObject({ label: 'SEARCHING', tone: 'searching', hollow: true }));
  it('retains connection errors and reconnect progress', () => {
    expect(statusChipPresentation({ ...base, connection: 'disconnected', phase: 'poweredOff' })).toMatchObject({ label: 'BLUETOOTH OFF', error: true });
    expect(statusChipPresentation({ ...base, connection: 'connecting', phase: 'reconnecting' })).toMatchObject({ label: 'RETRYING…', tone: 'searching' });
  });
  it('keeps a manually paused connection distinct', () => expect(statusChipPresentation({ ...base, connection: 'disconnected', manuallyDisconnected: true }).label).toBe('DISCONNECTED'));
});
