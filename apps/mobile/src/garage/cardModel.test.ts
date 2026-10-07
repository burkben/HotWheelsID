import { describe, expect, it } from 'vitest';
import type { CatalogCar } from '@/catalog/catalog';
import type { CarRecord } from '@/store/persistence/carRepository';
import { colorsR } from '@/theme/tokens';
import { garageCardModel, padGrid } from './cardModel';
import { seriesFilters } from './series';

const record = (uid: string, firstSeen: number, extra: Partial<CarRecord> = {}): CarRecord => ({
  uid, name: null, serial: null, firstSeen, lastSeen: firstSeen, detections: 1, bestMph: 0, bestLap: null, races: 0, ...extra,
});
const catalog = (id: string, series: string | null): CatalogCar => ({
  id, name: `Car ${id}`, toyNumber: null, series, year: null, wave: null, bodyColor: null, image: null, wikiPage: null,
});

const cars = [record('b', 20, { name: 'Blue', races: 3 }), record('a', 10)];
const identity = catalog('x', 'Speed Demons');
const filters = seriesFilters([identity], (c) => c.series);
const base = { cars, filters, onPortal: false, record: false, best: '—', unit: 'MPH', hasArtwork: () => false };

describe('garageCardModel', () => {
  it('derives the plate from firstSeen, not store order', () => {
    expect(garageCardModel(cars[0], { ...base, identity: undefined }).plate).toBe('02');
    expect(garageCardModel(cars[1], { ...base, identity: undefined }).plate).toBe('01');
  });

  it('prefers the catalog name and carries series colour', () => {
    const card = garageCardModel(cars[0], { ...base, identity });
    expect(card).toMatchObject({ name: 'Car x', identified: true, series: 'Speed Demons', seriesColor: colorsR.flame, races: 3 });
  });

  it('keeps a nickname on an unidentified card, else null for the mystery label', () => {
    expect(garageCardModel(cars[0], { ...base, identity: undefined })).toMatchObject({ name: 'Blue', identified: false, series: null, seriesColor: null });
    expect(garageCardModel(cars[1], { ...base, identity: undefined }).name).toBeNull();
  });

  it('only uses a photo when bundled artwork exists', () => {
    expect(garageCardModel(cars[0], { ...base, identity }).photoId).toBeNull();
    expect(garageCardModel(cars[0], { ...base, identity, hasArtwork: (id) => id === 'x' }).photoId).toBe('x');
  });
});

describe('padGrid', () => {
  it('pads a short last row with spacers', () => {
    expect(padGrid([1, 2, 3], 2)).toEqual([1, 2, 3, null]);
    expect(padGrid([1, 2, 3, 4, 5], 4)).toEqual([1, 2, 3, 4, 5, null, null, null]);
  });
  it('leaves full rows, empty lists and single columns alone', () => {
    expect(padGrid([1, 2], 2)).toEqual([1, 2]);
    expect(padGrid([], 2)).toEqual([]);
    expect(padGrid([1], 1)).toEqual([1]);
  });
});
