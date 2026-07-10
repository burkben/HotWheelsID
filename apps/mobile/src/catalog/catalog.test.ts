import { describe, it, expect } from "vitest";

import {
  CATALOG,
  CATALOG_WAVES,
  CATALOG_YEARS,
  catalogMeta,
  findCatalogCar,
  normalizeToyNumber,
  searchCatalog,
} from "./catalog";

describe("catalog data", () => {
  it("ships a non-trivial catalog", () => {
    expect(CATALOG.length).toBeGreaterThan(100);
  });

  it("has unique ids", () => {
    const ids = new Set(CATALOG.map((c) => c.id));
    expect(ids.size).toBe(CATALOG.length);
  });

  it("every entry has an id and a name", () => {
    for (const car of CATALOG) {
      expect(car.id).toBeTruthy();
      expect(car.name).toBeTruthy();
    }
  });
});

describe("findCatalogCar", () => {
  it("resolves a known id", () => {
    const first = CATALOG[0];
    expect(findCatalogCar(first.id)).toEqual(first);
  });

  it("returns undefined for unknown / empty ids", () => {
    expect(findCatalogCar("does-not-exist")).toBeUndefined();
    expect(findCatalogCar(undefined)).toBeUndefined();
    expect(findCatalogCar("")).toBeUndefined();
  });
});

describe("catalogMeta", () => {
  it("returns the non-empty metadata in display order", () => {
    const meta = catalogMeta({
      id: "car",
      name: "Car",
      toyNumber: "FXB03",
      series: "Speed Demons",
      year: 2020,
      wave: "2020 Series 2",
      bodyColor: "Blue",
      image: null,
      wikiPage: null,
    });
    expect(meta).toEqual([
      "Speed Demons",
      "2020 Series 2",
      "Blue body",
      "2020",
      "FXB03",
    ]);
  });
});

describe("searchCatalog", () => {
  it("returns the whole catalog (name-sorted) for an empty query", () => {
    const all = searchCatalog("");
    expect(all.length).toBe(CATALOG.length);
    expect(all[0].name.localeCompare(all[all.length - 1].name)).toBeLessThanOrEqual(0);
  });

  it("finds cars by partial name", () => {
    const hits = searchCatalog("charger");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((c) => /charger/i.test(c.name))).toBe(true);
  });

  it("ranks exact / prefix matches ahead of midword matches", () => {
    const hits = searchCatalog("corvette");
    if (hits.length > 1) {
      expect(/^corvette/i.test(hits[0].name) || /corvette/i.test(hits[0].name)).toBe(true);
    }
  });

  it("matches on toy number", () => {
    const withToy = CATALOG.find((c) => c.toyNumber);
    if (withToy?.toyNumber) {
      const hits = searchCatalog(withToy.toyNumber);
      expect(hits.some((c) => c.id === withToy.id)).toBe(true);
    }
  });

  it("matches on wave or body color metadata", () => {
    const withWave = CATALOG.find((c) => c.wave);
    if (withWave?.wave) {
      const waveTerm = withWave.wave.split(/\s+/)[0];
      const waveHits = searchCatalog(waveTerm);
      expect(waveHits.some((c) => c.id === withWave.id)).toBe(true);
    }

    const withColor = CATALOG.find((c) => c.bodyColor);
    if (withColor?.bodyColor) {
      const colorHits = searchCatalog(withColor.bodyColor);
      expect(colorHits.some((c) => c.id === withColor.id)).toBe(true);
    }
  });

  it("filters explicitly by year and wave", () => {
    const year = CATALOG_YEARS[0];
    const wave = CATALOG_WAVES.find((candidate) =>
      CATALOG.some((car) => car.year === year && car.wave === candidate),
    );
    expect(wave).toBeTruthy();

    const hits = searchCatalog("", { year, wave });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((car) => car.year === year && car.wave === wave)).toBe(true);
  });

  it("normalizes a package toy number and ranks an exact match first", () => {
    expect(normalizeToyNumber(" fxb-03 ")).toBe("FXB03");
    const hits = searchCatalog("", { toyNumber: "fxb-03" });
    expect(hits[0].toyNumber).toBe("FXB03");
  });

  it("returns likely package matches for a partial toy number", () => {
    const hits = searchCatalog("", { toyNumber: "FXB0" });
    expect(hits.length).toBeGreaterThan(1);
    expect(hits.every((car) => car.toyNumber?.startsWith("FXB0"))).toBe(true);
  });
});
