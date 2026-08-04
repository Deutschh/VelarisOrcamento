import { describe, expect, it } from "vitest";
import { assertCanCreateReview, transitionServiceStatus } from "./service-lifecycle.js";

describe("service lifecycle", () => {
  it("transitions service status through the V1 matrix", () => {
    expect(transitionServiceStatus("not_started", "schedule")).toBe("scheduled");
    expect(transitionServiceStatus("scheduled", "start")).toBe("in_progress");
    expect(transitionServiceStatus("scheduled", "mark_realized")).toBe(
      "service_realized",
    );
    expect(transitionServiceStatus("in_progress", "mark_realized")).toBe(
      "service_realized",
    );
    expect(transitionServiceStatus("service_realized", "close")).toBe("closed");
  });

  it("blocks invalid service transitions", () => {
    expect(() => transitionServiceStatus("not_started", "mark_realized")).toThrow(
      "not allowed",
    );
    expect(() => transitionServiceStatus("closed", "start")).toThrow("not allowed");
  });

  it("requires accepted proposal, confirmed appointment and realized service for review", () => {
    expect(() =>
      assertCanCreateReview({
        proposalAccepted: true,
        appointmentConfirmed: true,
        serviceStatus: "service_realized",
        alreadyReviewed: false,
      }),
    ).not.toThrow();

    expect(() =>
      assertCanCreateReview({
        proposalAccepted: false,
        appointmentConfirmed: true,
        serviceStatus: "service_realized",
        alreadyReviewed: false,
      }),
    ).toThrow("accepted proposal");

    expect(() =>
      assertCanCreateReview({
        proposalAccepted: true,
        appointmentConfirmed: true,
        serviceStatus: "scheduled",
        alreadyReviewed: false,
      }),
    ).toThrow("realized service");

    expect(() =>
      assertCanCreateReview({
        proposalAccepted: true,
        appointmentConfirmed: true,
        serviceStatus: "service_realized",
        alreadyReviewed: true,
      }),
    ).toThrow("already exists");
  });
});
