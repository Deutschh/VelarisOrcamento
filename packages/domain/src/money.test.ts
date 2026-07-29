import { describe, expect, it } from "vitest";
import { formatCentsAsDecimal, parseDecimalMoneyToCents } from "./money.js";

describe("money helpers", () => {
  it("parses decimal money values without floating point arithmetic", () => {
    expect(parseDecimalMoneyToCents("102.50")).toBe(10250);
    expect(parseDecimalMoneyToCents("102,50")).toBe(10250);
  });

  it("formats cents as a decimal string", () => {
    expect(formatCentsAsDecimal(parseDecimalMoneyToCents("95"))).toBe("95.00");
  });
});
