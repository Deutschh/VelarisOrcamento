import { describe, expect, it } from "vitest";
import { calculateDistanceKm, isWithinServiceRadius } from "./geo.js";

describe("geo", () => {
  it("calculates distance between two coordinates", () => {
    const distance = calculateDistanceKm(
      { latitude: -23.55052, longitude: -46.633308 },
      { latitude: -23.68216, longitude: -46.87549 },
    );

    expect(distance).toBeGreaterThan(28);
    expect(distance).toBeLessThan(30);
  });

  it("checks service radius", () => {
    expect(
      isWithinServiceRadius({
        origin: { latitude: -23.55052, longitude: -46.633308 },
        destination: { latitude: -23.68216, longitude: -46.87549 },
        radiusKm: 35,
      }),
    ).toBe(true);
  });
});
