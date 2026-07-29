export type MoneyCents = number & { readonly __brand: "MoneyCents" };

export function createMoneyCents(value: number): MoneyCents {
  if (!Number.isSafeInteger(value)) {
    throw new Error("Money cents must be a safe integer.");
  }

  return value as MoneyCents;
}

export function parseDecimalMoneyToCents(value: string): MoneyCents {
  const normalized = value.trim().replace(",", ".");

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Money value must have at most two decimal places.");
  }

  const [wholePart = "0", decimalPart = ""] = normalized.split(".");
  const centsText = `${wholePart}${decimalPart.padEnd(2, "0")}`;

  return createMoneyCents(Number(centsText));
}

export function formatCentsAsDecimal(value: MoneyCents): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const whole = Math.floor(absoluteValue / 100);
  const cents = String(absoluteValue % 100).padStart(2, "0");

  return `${sign}${whole}.${cents}`;
}
