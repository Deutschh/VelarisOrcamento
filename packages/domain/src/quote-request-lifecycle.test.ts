import { describe, expect, it } from "vitest";

import {
  QuoteRequestLifecycleError,
  transitionQuoteRequestStatus,
} from "./quote-request-lifecycle.js";

describe("quote request lifecycle", () => {
  it("follows the V1 request review transition matrix", () => {
    expect(transitionQuoteRequestStatus("draft", "confirm_submit")).toBe("submitted");
    expect(transitionQuoteRequestStatus("submitted", "open_review")).toBe("under_review");
    expect(transitionQuoteRequestStatus("under_review", "request_information")).toBe(
      "awaiting_information",
    );
    expect(
      transitionQuoteRequestStatus("awaiting_information", "provide_information"),
    ).toBe("under_review");
    expect(transitionQuoteRequestStatus("under_review", "accept_for_proposal")).toBe(
      "accepted_for_proposal",
    );
    expect(transitionQuoteRequestStatus("under_review", "decline")).toBe(
      "declined_by_company",
    );
  });

  it("rejects transitions outside the V1 matrix", () => {
    expect(() =>
      transitionQuoteRequestStatus("submitted", "accept_for_proposal"),
    ).toThrow(QuoteRequestLifecycleError);
  });
});
