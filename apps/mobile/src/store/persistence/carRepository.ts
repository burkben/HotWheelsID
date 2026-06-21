/**
 * Persistence seam for the **Garage** — the durable collection of every car the
 * portal has ever seen (ADR-0006, Phase 3).
 *
 * Like {@link RaceRepository}, the contract + a pure {@link InMemoryCarRepository}
 * live here so the store and unit tests stay free of native modules. The native
 * `expo-sqlite` implementation lives in `sqliteCarRepository.ts`, imported solely
 * by the app bootstrap.
 *
 * A car is identified by its 6-byte NFC `uid` (e.g. `6C:C4:5A:2B:64:81`). We keep
 * **detection-derived** facts here (nickname, last serial, first/last seen,
 * placement count, fastest speed). Per-car *race* stats (laps, race count) are
 * derived from `race_results` by the SQLite adapter at read time, so finishing a
 * race needs no write into the Garage — the two tables stay decoupled.
 */

/** One car in the collection. Detection facts are authoritative here; `bestLap` /
 *  `races` are derived from `race_results` (null/0 when unraced or in-memory). */
export interface CarRecord {
  readonly uid: string;
  readonly name: string | null;
  readonly serial: string | null;
  readonly firstSeen: number;
  readonly lastSeen: number;
  readonly detections: number;
  readonly bestMph: number;
  /** Fastest lap across all races with this car (derived from race_results). */
  readonly bestLap: number | null;
  /** Number of finished races with this car (derived from race_results). */
  readonly races: number;
  /** Full Mattel casting id (base64url) last broadcast by this car, if any. */
  readonly mattelId: string | null;
  /** Casting/model key (hex) shared by every physical copy of the same model. */
  readonly modelId: string | null;
}

export interface DetectionInput {
  readonly uid: string;
  readonly serial?: string | null;
  /** Timestamp (ms) of the placement. */
  readonly at: number;
}

export interface SpeedInput {
  readonly uid: string;
  readonly mph: number;
  readonly at: number;
}

/** A car broadcast its Mattel casting identity (full id + derived model key). */
export interface IdentityInput {
  readonly uid: string;
  readonly mattelId: string;
  readonly modelId: string;
  /** Timestamp (ms) of the identifying detection. */
  readonly at: number;
}

export interface CarRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** The whole collection, most-recently-seen first. */
  getCars(): Promise<CarRecord[]>;
  /** A car was placed on the portal: create it or bump its detection count. */
  recordDetection(input: DetectionInput): Promise<void>;
  /** A late serial arrived for an already-detected car (no detection bump). */
  recordSerial(uid: string, serial: string): Promise<void>;
  /** A speed pass; raises `bestMph` when faster. */
  recordSpeed(input: SpeedInput): Promise<void>;
  /** Set or clear the user-assigned nickname. */
  setName(uid: string, name: string | null): Promise<void>;
  /** A car broadcast its Mattel casting id; store it for grouping duplicates. */
  recordIdentity(input: IdentityInput): Promise<void>;
  /** Forget the whole garage. */
  clear(): Promise<void>;
}

function blankCar(uid: string, at: number): CarRecord {
  return {
    uid,
    name: null,
    serial: null,
    firstSeen: at,
    lastSeen: at,
    detections: 0,
    bestMph: 0,
    bestLap: null,
    races: 0,
    mattelId: null,
    modelId: null,
  };
}

/**
 * Pure reducers shared by the Garage store (render mirror) and the in-memory
 * repository, so both apply *identical* transformations to a `CarRecord[]`. The
 * SQLite adapter performs the equivalent upserts in SQL.
 */
export function applyDetection(cars: readonly CarRecord[], input: DetectionInput): CarRecord[] {
  const next = cars.map((c) => ({ ...c }));
  const existing = next.find((c) => c.uid === input.uid);
  if (existing) {
    existing.detections += 1;
    existing.lastSeen = Math.max(existing.lastSeen, input.at);
    if (input.serial != null) existing.serial = input.serial;
  } else {
    next.push({
      ...blankCar(input.uid, input.at),
      detections: 1,
      serial: input.serial ?? null,
    });
  }
  return next;
}

export function applySerial(cars: readonly CarRecord[], uid: string, serial: string): CarRecord[] {
  return cars.map((c) => (c.uid === uid ? { ...c, serial } : { ...c }));
}

export function applySpeed(cars: readonly CarRecord[], input: SpeedInput): CarRecord[] {
  const next = cars.map((c) => ({ ...c }));
  const existing = next.find((c) => c.uid === input.uid);
  if (existing) {
    existing.bestMph = Math.max(existing.bestMph, input.mph);
    existing.lastSeen = Math.max(existing.lastSeen, input.at);
  } else {
    next.push({ ...blankCar(input.uid, input.at), bestMph: input.mph });
  }
  return next;
}

export function applyName(cars: readonly CarRecord[], uid: string, name: string | null): CarRecord[] {
  return cars.map((c) => (c.uid === uid ? { ...c, name } : { ...c }));
}

/**
 * Record the Mattel casting identity for a car (full id + derived model key),
 * creating the car if this identity arrives before any detection. The `modelId`
 * is what makes duplicate castings groupable; the full `mattelId` is retained for
 * provenance/debugging.
 */
export function applyIdentity(cars: readonly CarRecord[], input: IdentityInput): CarRecord[] {
  const next = cars.map((c) => ({ ...c }));
  const existing = next.find((c) => c.uid === input.uid);
  if (existing) {
    existing.mattelId = input.mattelId;
    existing.modelId = input.modelId;
    existing.lastSeen = Math.max(existing.lastSeen, input.at);
  } else {
    next.push({
      ...blankCar(input.uid, input.at),
      mattelId: input.mattelId,
      modelId: input.modelId,
    });
  }
  return next;
}

/**
 * Group cars by their casting `modelId`. Cars whose casting is unknown (`null`
 * modelId) are omitted — an unidentified car can't be proven to share a casting
 * with any other. Insertion order within each group follows `cars`.
 */
export function groupByCasting(cars: readonly CarRecord[]): Map<string, CarRecord[]> {
  const groups = new Map<string, CarRecord[]>();
  for (const car of cars) {
    if (!car.modelId) continue;
    const group = groups.get(car.modelId);
    if (group) group.push(car);
    else groups.set(car.modelId, [car]);
  }
  return groups;
}

/**
 * How many cars in the collection share this car's casting, counting the car
 * itself (≥1). Returns 1 when the casting is unknown, since it can't be grouped.
 */
export function castingCount(cars: readonly CarRecord[], car: Pick<CarRecord, "modelId">): number {
  if (!car.modelId) return 1;
  return cars.reduce((n, c) => (c.modelId === car.modelId ? n + 1 : n), 0);
}

/** Most-recently-seen first; a stable, sensible default for the Garage list. */
export function sortCars(cars: readonly CarRecord[]): CarRecord[] {
  return [...cars].sort((a, b) => b.lastSeen - a.lastSeen);
}

/**
 * Zero-dependency repository used by tests/CI and whenever the native SQLite
 * module is unavailable. Holds the collection in a plain array via the same pure
 * reducers the store uses.
 */
export class InMemoryCarRepository implements CarRepository {
  private cars: CarRecord[] = [];

  async init(): Promise<void> {}

  async getCars(): Promise<CarRecord[]> {
    return sortCars(this.cars).map((c) => ({ ...c }));
  }

  async recordDetection(input: DetectionInput): Promise<void> {
    this.cars = applyDetection(this.cars, input);
  }

  async recordSerial(uid: string, serial: string): Promise<void> {
    this.cars = applySerial(this.cars, uid, serial);
  }

  async recordSpeed(input: SpeedInput): Promise<void> {
    this.cars = applySpeed(this.cars, input);
  }

  async setName(uid: string, name: string | null): Promise<void> {
    this.cars = applyName(this.cars, uid, name);
  }

  async recordIdentity(input: IdentityInput): Promise<void> {
    this.cars = applyIdentity(this.cars, input);
  }

  async clear(): Promise<void> {
    this.cars = [];
  }
}
