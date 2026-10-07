import { describe, expect, it } from 'vitest';
import { portalStatusPresentation } from '@/portal/selectors';
import { portalCardPresentation, stepLapOption, versionLabel } from './presentation';

const status = (input: Partial<Parameters<typeof portalStatusPresentation>[0]>) =>
  portalStatusPresentation({ connection: 'disconnected', controlStatus: null, phase: null, mode: 'live', manuallyDisconnected: false, ...input });

describe('portalCardPresentation', () => {
  it('connected live portal offers disconnect', () => {
    expect(portalCardPresentation(status({ connection: 'connected', controlStatus: 'idle' }), false)).toEqual({
      tone: 'connected', eyebrow: 'CONNECTED', title: 'RACE PORTAL', hint: "Auto-connects when it's switched on", action: 'DISCONNECT', error: false,
    });
  });
  it('scanning reads as searching', () => {
    const card = portalCardPresentation(status({ phase: 'scanning' }), false);
    expect(card.tone).toBe('searching');
    expect(card.eyebrow).toBe('SCANNING…');
  });
  it('a paused portal is idle and offers connect', () => {
    const card = portalCardPresentation(status({ manuallyDisconnected: true }), false);
    expect(card.tone).toBe('idle');
    expect(card.action).toBe('CONNECT');
  });
  it('demo mode names itself', () => {
    expect(portalCardPresentation(status({ connection: 'connected', mode: 'demo' }), true)).toMatchObject({ tone: 'connected', eyebrow: 'DEMO PORTAL', title: 'DEMO MODE' });
  });
});

describe('stepLapOption', () => {
  const options = [5, 10, 15, 20];
  it('steps and clamps', () => {
    expect(stepLapOption(options, 5, 1)).toBe(10);
    expect(stepLapOption(options, 10, -1)).toBe(5);
    expect(stepLapOption(options, 5, -1)).toBe(5);
    expect(stepLapOption(options, 20, 1)).toBe(20);
  });
  it('snaps an unknown value to the nearest option', () => {
    expect(stepLapOption(options, 12, 1)).toBe(10);
    expect(stepLapOption([], 7, 1)).toBe(7);
  });
});

describe('versionLabel', () => {
  it('includes the build when known', () => {
    expect(versionLabel('1.0.0', '12')).toBe('VERSION 1.0.0 (12)');
    expect(versionLabel('1.0.0', 3)).toBe('VERSION 1.0.0 (3)');
    expect(versionLabel('1.0.0', null)).toBe('VERSION 1.0.0');
    expect(versionLabel(undefined, undefined)).toBe('VERSION —');
  });
});
