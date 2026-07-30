import { describe, expect, it } from "vitest";
import {
  AppointmentLifecycleError,
  assertAppointmentSchedule,
  assertCanUsePlatformScheduling,
  isActiveAppointmentStatus,
  requiresAppointmentBeforeProposalSend,
  transitionAppointmentStatus,
} from "./appointment-lifecycle.js";

describe("appointment lifecycle", () => {
  it("follows the V1 appointment transition matrix", () => {
    expect(transitionAppointmentStatus("none", "propose")).toBe("proposed");
    expect(transitionAppointmentStatus("proposed", "confirm")).toBe("confirmed");
    expect(transitionAppointmentStatus("proposed", "request_reschedule")).toBe(
      "reschedule_requested",
    );
    expect(transitionAppointmentStatus("reschedule_requested", "propose_new_time")).toBe(
      "rescheduled",
    );
    expect(transitionAppointmentStatus("rescheduled", "confirm")).toBe("confirmed");
    expect(transitionAppointmentStatus("confirmed", "complete")).toBe("completed");
  });

  it("blocks invalid appointment transitions", () => {
    expect(() => transitionAppointmentStatus("cancelled", "complete")).toThrow(
      AppointmentLifecycleError,
    );
    expect(() => transitionAppointmentStatus("completed", "cancel")).toThrow(
      "Action cancel is not allowed",
    );
  });

  it("validates scheduling time and duration", () => {
    const now = new Date("2026-07-30T12:00:00.000Z");

    expect(() =>
      assertAppointmentSchedule({
        now,
        startsAt: new Date("2026-07-30T13:00:00.000Z"),
        durationMinutes: 120,
      }),
    ).not.toThrow();
    expect(() =>
      assertAppointmentSchedule({
        now,
        startsAt: new Date("2026-07-30T11:00:00.000Z"),
        durationMinutes: 120,
      }),
    ).toThrow("Appointment start time must be in the future.");
    expect(() =>
      assertAppointmentSchedule({
        now,
        startsAt: new Date("2026-07-30T13:00:00.000Z"),
        durationMinutes: 0,
      }),
    ).toThrow("Appointment duration must be a positive integer.");
  });

  it("enforces scheduling mode restrictions", () => {
    expect(() =>
      assertCanUsePlatformScheduling({
        schedulingMode: "external_only",
        proposalVersionStatus: "draft",
      }),
    ).toThrow("external scheduling");
    expect(() =>
      assertCanUsePlatformScheduling({
        schedulingMode: "after_proposal_acceptance",
        proposalVersionStatus: "sent",
      }),
    ).toThrow("after proposal acceptance");
    expect(() =>
      assertCanUsePlatformScheduling({
        schedulingMode: "after_proposal_acceptance",
        proposalVersionStatus: "accepted",
      }),
    ).not.toThrow();
  });

  it("identifies active appointments and required schedule before sending", () => {
    expect(requiresAppointmentBeforeProposalSend("required_with_proposal")).toBe(true);
    expect(requiresAppointmentBeforeProposalSend("optional_with_proposal")).toBe(false);
    expect(isActiveAppointmentStatus("proposed")).toBe(true);
    expect(isActiveAppointmentStatus("reschedule_requested")).toBe(false);
  });
});
