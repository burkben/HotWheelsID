import { describe, it, expect } from "vitest";

import {
  ARTWORK,
  ARTWORK_COUNT,
  ARTWORK_UPLOADERS,
  carArtwork,
  carArtworkCredit,
} from "./artwork";
import { ARTWORK_ASSETS } from "./artworkAssets";
import { CATALOG } from "./catalog";

const CAR_IDS = new Set(CATALOG.map((c) => c.id));

describe("artwork manifest", () => {
  it("keeps the asset map and the manifest in lockstep", () => {
    // These two files are written by the same generator run. If they ever drift,
    // a car renders a "Photo by …" credit under an emoji placeholder, or Metro
    // fails to resolve an import. Neither is caught anywhere else.
    const manifestIds = Object.keys(ARTWORK.images).sort();
    const assetIds = Object.keys(ARTWORK_ASSETS).sort();
    expect(assetIds).toEqual(manifestIds);
  });

  it("resolves an asset for every credited car", () => {
    for (const carId of Object.keys(ARTWORK.images)) {
      expect(carArtwork(carId), `missing asset for ${carId}`).toBeDefined();
    }
  });

  it("ships artwork for most of the catalog", () => {
    expect(ARTWORK_COUNT).toBeGreaterThan(100);
    expect(ARTWORK_COUNT).toBeLessThanOrEqual(CATALOG.length);
    expect(ARTWORK.imageCount).toBe(ARTWORK_COUNT);
  });

  it("keys every image to a real catalog car", () => {
    for (const id of Object.keys(ARTWORK.images)) {
      expect(CAR_IDS.has(id)).toBe(true);
    }
  });

  it("carries attribution for every bundled image", () => {
    // CC BY-SA is only satisfied if we can name the author and link the source,
    // so an image without those is a licensing bug, not a cosmetic one.
    for (const [id, credit] of Object.entries(ARTWORK.images)) {
      expect(credit.uploader, `${id} has no uploader`).toBeTruthy();
      expect(credit.filePage).toContain("hotwheels.fandom.com/wiki/File:");
      expect(credit.file).toBeTruthy();
      expect(credit.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(credit.bytes).toBeGreaterThan(0);
    }
  });

  it("records a known licensing basis for every image", () => {
    for (const [id, credit] of Object.entries(ARTWORK.images)) {
      expect(
        ["uploader-self", "wiki-default"],
        `${id} has an unrecognised basis`,
      ).toContain(credit.licenseBasis);
    }
  });

  it("credits every uploader it bundles an image from", () => {
    const used = new Set(
      Object.values(ARTWORK.images)
        .map((credit) => credit.uploader)
        .filter((name): name is string => Boolean(name)),
    );
    for (const name of used) {
      expect(ARTWORK_UPLOADERS).toContain(name);
    }
  });

  it("states the license and what we changed", () => {
    expect(ARTWORK.license.abbreviation).toBe("CC BY-SA");
    expect(ARTWORK.license.url).toBeTruthy();
    // BY-SA requires indicating modifications; we resize.
    expect(ARTWORK.license.modifications).toMatch(/resiz/i);
  });

  it("does not bundle the wiki's own 'no image' placeholder", () => {
    for (const credit of Object.values(ARTWORK.images)) {
      expect(credit.wikiFile.toLowerCase()).not.toContain("not available");
    }
  });
});

describe("carArtwork", () => {
  it("resolves an asset for a car that has one", () => {
    const [id] = Object.keys(ARTWORK.images);
    expect(carArtwork(id)).toBeDefined();
    expect(carArtworkCredit(id)).toBeDefined();
  });

  it("returns undefined for unknown / empty ids", () => {
    expect(carArtwork("does-not-exist")).toBeUndefined();
    expect(carArtwork(undefined)).toBeUndefined();
    expect(carArtwork(null)).toBeUndefined();
    expect(carArtwork("")).toBeUndefined();
    expect(carArtworkCredit("does-not-exist")).toBeUndefined();
    expect(carArtworkCredit(undefined)).toBeUndefined();
  });
});
