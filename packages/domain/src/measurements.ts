export type LengthUnit = "mm" | "cm" | "m";

export interface NormalizedLength {
  originalValue: number;
  originalUnit: LengthUnit;
  normalizedValueInMeters: number;
  normalizedUnit: "m";
}

export function normalizeLength(value: number, unit: LengthUnit): NormalizedLength {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Measurement value must be a finite non-negative number.");
  }

  const multiplierByUnit: Record<LengthUnit, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
  };

  return {
    originalValue: value,
    originalUnit: unit,
    normalizedValueInMeters: value * multiplierByUnit[unit],
    normalizedUnit: "m",
  };
}
