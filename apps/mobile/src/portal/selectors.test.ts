import { describe, expect, it } from "vitest";

import type { CatalogCar } from "../catalog/catalog";
import type { CarRecord } from "../store/persistence/carRepository";
import { carHeroModel, portalStatusPresentation } from "./selectors";

const garageCar: CarRecord = {
  uid: "AA:BB:CC:DD:EE:FF",
  name: "Blue Rocket",
  serial: "1234",
  firstSeen: 1,
  lastSeen: 2,
  detections: 1,
  bestMph: 140,
  bestLap: null,
  races: 0,
};

const catalogCar: CatalogCar = {
  id: "twin-mill",
  name: "Twin Mill",
  toyNumber: null,
  series: null,
  year: 2020,
  wave: null,
  bodyColor: null,
  image: "https://example.test/twin-mill.jpg",
  wikiPage: null,
};

describe("portalStatusPresentation", () => {
  it("makes terminal failures actionable retries", () => {
    const status = portalStatusPresentation({
      connection: "disconnected",
      controlStatus: null,
      phase: "notFound",
      mode: "live",
      manuallyDisconnected: false,
    });
    expect(status).toMatchObject({ label: "Portal not found", action: "retry", tone: "error" });
  });

  it("marks in-progress states busy and non-actionable", () => {
    const status = portalStatusPresentation({
      connection: "connecting",
      controlStatus: null,
      phase: "authenticating",
      mode: "live",
      manuallyDisconnected: false,
    });
    expect(status).toMatchObject({ label: "Authenticating…", action: "none", busy: true });
  });

  it("requires confirmed disconnect when connected", () => {
    const status = portalStatusPresentation({
      connection: "connected",
      controlStatus: "carPresent",
      phase: "connected",
      mode: "live",
      manuallyDisconnected: false,
    });
    expect(status).toMatchObject({ label: "Car on portal", action: "disconnect" });
  });
});

describe("carHeroModel", () => {
  it("prefers the current car and identified catalog presentation", () => {
    const model = carHeroModel({
      currentCar: { uid: garageCar.uid, serial: "5678" },
      lastCar: { uid: "OLD" },
      garageCars: [garageCar],
      catalogCar,
      sessionBestMph: 150,
      lastMph: 120,
    });
    expect(model).toMatchObject({
      uid: garageCar.uid,
      title: "Twin Mill",
      image: catalogCar.image,
      serial: "5678",
      isCurrent: true,
      bestMph: 150,
    });
  });

  it("falls back through last runtime car, nickname, then short uid", () => {
    const named = carHeroModel({
      currentCar: null,
      lastCar: { uid: garageCar.uid },
      garageCars: [garageCar],
      sessionBestMph: 0,
    });
    expect(named).toMatchObject({ title: "Blue Rocket", isCurrent: false });

    const unknown = carHeroModel({
      currentCar: null,
      lastCar: { uid: "11:22:33:44:55:66" },
      garageCars: [],
      sessionBestMph: 0,
    });
    expect(unknown?.title).toBe("55:66");
  });

  it("uses the most-recent Garage car after a restart", () => {
    const model = carHeroModel({
      currentCar: null,
      lastCar: null,
      garageCars: [garageCar],
      sessionBestMph: 0,
    });
    expect(model?.uid).toBe(garageCar.uid);
  });
});
