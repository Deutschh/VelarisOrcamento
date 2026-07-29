export type CompanyLifecycleStatus = "pending" | "active" | "suspended";
export type CompanyLifecycleProfileStatus = "draft" | "published" | "unpublished";
export type CompanyLifecycleSubscriptionStatus =
  "pending_activation" | "active" | "suspended" | "cancelled";

export interface CompanyLifecycleState {
  status: CompanyLifecycleStatus;
  profileStatus: CompanyLifecycleProfileStatus;
  subscriptionStatus: CompanyLifecycleSubscriptionStatus;
  activatedAt: Date | null;
  suspendedAt: Date | null;
  profilePublishedAt: Date | null;
  profileUnpublishedAt: Date | null;
}

export interface CompanyLifecyclePatch {
  status?: CompanyLifecycleStatus;
  profileStatus?: CompanyLifecycleProfileStatus;
  subscriptionStatus?: CompanyLifecycleSubscriptionStatus;
  activatedAt?: Date;
  suspendedAt?: Date | null;
  profilePublishedAt?: Date | null;
  profileUnpublishedAt?: Date | null;
}

export class CompanyLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "CompanyLifecycleError";
  }
}

export function activateCompanyState(
  state: CompanyLifecycleState,
  now = new Date(),
): CompanyLifecyclePatch {
  if (state.status === "active") {
    return {};
  }

  return {
    status: "active",
    subscriptionStatus: "active",
    activatedAt: state.activatedAt ?? now,
    suspendedAt: null,
  };
}

export function suspendCompanyState(
  state: CompanyLifecycleState,
  now = new Date(),
): CompanyLifecyclePatch {
  if (state.status === "suspended") {
    return {};
  }

  return {
    status: "suspended",
    subscriptionStatus: "suspended",
    suspendedAt: now,
  };
}

export function setCompanyProfilePublicationState(
  state: CompanyLifecycleState,
  published: boolean,
  now = new Date(),
): CompanyLifecyclePatch {
  if (published && state.status !== "active") {
    throw new CompanyLifecycleError(
      "Only active companies can publish profiles.",
      "COMPANY_PROFILE_REQUIRES_ACTIVE_STATUS",
    );
  }

  const nextStatus = published ? "published" : "unpublished";

  if (state.profileStatus === nextStatus) {
    return {};
  }

  return {
    profileStatus: nextStatus,
    profilePublishedAt: published ? (state.profilePublishedAt ?? now) : null,
    profileUnpublishedAt: published ? null : now,
  };
}
