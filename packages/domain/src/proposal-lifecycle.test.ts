import { describe, expect, it } from "vitest";
import {
  assertCanCreateProposalVersion,
  assertProposalValidityDate,
  prepareProposalFinalTotal,
  transitionProposalVersionStatus,
} from "./proposal-lifecycle.js";

describe("proposal lifecycle", () => {
  it("suggests the internal total as the final total", () => {
    const result = prepareProposalFinalTotal({
      internalTotalCents: 10000,
      estimateMinCents: 9500,
      estimateMaxCents: 10500,
    });

    expect(result.finalTotalCents).toBe(10000);
    expect(result.isOutOfRange).toBe(false);
    expect(result.outOfRangeReason).toBeNull();
  });

  it("requires a reason when the final total is outside the estimate range", () => {
    expect(() =>
      prepareProposalFinalTotal({
        internalTotalCents: 10000,
        estimateMinCents: 9500,
        estimateMaxCents: 10500,
        finalTotalCents: 12000,
      }),
    ).toThrow("outside estimate range");

    const result = prepareProposalFinalTotal({
      internalTotalCents: 10000,
      estimateMinCents: 9500,
      estimateMaxCents: 10500,
      finalTotalCents: 12000,
      outOfRangeReason: "Sujeira intensa confirmada nas fotos.",
    });

    expect(result.isOutOfRange).toBe(true);
    expect(result.outOfRangeReason).toBe("Sujeira intensa confirmada nas fotos.");
  });

  it("blocks negative totals and zero totals unless the service is free", () => {
    expect(() =>
      prepareProposalFinalTotal({
        internalTotalCents: 10000,
        estimateMinCents: 9500,
        estimateMaxCents: 10500,
        finalTotalCents: -1,
      }),
    ).toThrow("cannot be negative");

    expect(() =>
      prepareProposalFinalTotal({
        internalTotalCents: 10000,
        estimateMinCents: 9500,
        estimateMaxCents: 10500,
        finalTotalCents: 0,
      }),
    ).toThrow("zero only");
  });

  it("blocks new commercial versions after acceptance", () => {
    expect(() =>
      assertCanCreateProposalVersion({ existingAcceptedVersion: true }),
    ).toThrow("Accepted proposal versions");
  });

  it("transitions draft proposal versions to sent and locks accepted versions", () => {
    expect(transitionProposalVersionStatus("draft", "send")).toBe("sent");
    expect(transitionProposalVersionStatus("sent", "view")).toBe("viewed");
    expect(transitionProposalVersionStatus("viewed", "accept")).toBe("accepted");

    expect(() => transitionProposalVersionStatus("accepted", "supersede")).toThrow(
      "not allowed",
    );
  });

  it("requires proposal validity dates in the future", () => {
    expect(() =>
      assertProposalValidityDate({
        now: new Date("2026-07-29T12:00:00.000Z"),
        validUntil: new Date("2026-07-29T12:00:00.000Z"),
      }),
    ).toThrow("future");
  });
});
