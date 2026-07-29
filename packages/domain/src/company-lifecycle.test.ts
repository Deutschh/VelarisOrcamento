import { describe, expect, it } from "vitest";

import {
  activateCompanyState,
  setCompanyProfilePublicationState,
  suspendCompanyState,
} from "./company-lifecycle.js";
import type { CompanyLifecycleState } from "./company-lifecycle.js";

const baseState: CompanyLifecycleState = {
  status: "pending",
  profileStatus: "draft",
  subscriptionStatus: "pending_activation",
  activatedAt: null,
  suspendedAt: null,
  profilePublishedAt: null,
  profileUnpublishedAt: null,
};

describe("company lifecycle", () => {
  it("activates pending companies", () => {
    const now = new Date("2026-01-01T10:00:00.000Z");

    expect(activateCompanyState(baseState, now)).toEqual({
      status: "active",
      subscriptionStatus: "active",
      activatedAt: now,
      suspendedAt: null,
    });
  });

  it("suspends active companies", () => {
    const now = new Date("2026-01-01T10:00:00.000Z");

    expect(suspendCompanyState({ ...baseState, status: "active" }, now)).toEqual({
      status: "suspended",
      subscriptionStatus: "suspended",
      suspendedAt: now,
    });
  });

  it("blocks profile publication before activation", () => {
    expect(() => setCompanyProfilePublicationState(baseState, true)).toThrow(
      "Only active companies can publish profiles.",
    );
  });

  it("publishes active company profiles", () => {
    const now = new Date("2026-01-01T10:00:00.000Z");

    expect(
      setCompanyProfilePublicationState({ ...baseState, status: "active" }, true, now),
    ).toEqual({
      profileStatus: "published",
      profilePublishedAt: now,
      profileUnpublishedAt: null,
    });
  });
});
