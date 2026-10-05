import { describe, expect, it } from 'vitest';
import type { RaceResult } from './raceEngine';
import { countdownBestLap, countdownLights } from './countdownPresentation';

describe('countdown lights', () => {
  it.each([[3, '3', 1, false], [2, '2', 2, false], [1, '1', 3, false], [0, 'GO', 3, true]] as const)('maps count %s', (count, digit, lit, go) => {
    expect(countdownLights(count)).toEqual({ digit, lit, go });
  });
  it('clamps out-of-range input and handles invalid counts', () => {
    expect(countdownLights(-1).go).toBe(true);
    expect(countdownLights(9).digit).toBe('3');
    expect(countdownLights(Number.NaN).digit).toBe('3');
  });
});
const result = (player: string, carUid: string, bestLap: number): RaceResult => ({ player, carUid, bestLap, bestLapNum: 1, lapTimes: [bestLap], lapCount: 1, totalTime: bestLap, worstLap: bestLap, worstLapNum: 1, avgLap: bestLap, finishedAt: 1 });
describe('countdown best', () => {
  it('matches the player and car and takes the fastest known lap', () => {
    const history = [result('A', 'car', 3.1), result('B', 'car', 1), result('A', 'other', 1), result('A', 'car', 2.8)];
    expect(countdownBestLap(history, 'A', 'car')).toBe(2.8);
    expect(history[0].bestLap).toBe(3.1);
  });
  it('leaves missing or invalid times unavailable', () => {
    expect(countdownBestLap([], 'A', 'car')).toBeNull();
    expect(countdownBestLap([result('A', 'car', 3)], 'A', null)).toBeNull();
    expect(countdownBestLap([result('A', 'car', 0), result('A', 'car', NaN)], 'A', 'car')).toBeNull();
  });
});
