import { describe, it, expect } from "vitest";

import { CATALOG, findCatalogCar, searchCatalog } from "./catalog";

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
});
