import type { MoneyCents } from "./money.js";
import { createMoneyCents } from "./money.js";

export type ProposalStatus =
  "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "cancelled";

export type ProposalVersionStatus =
  "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "superseded";

export type ProposalVersionAction =
  "send" | "view" | "accept" | "reject" | "expire" | "supersede";

export type ProposalCustomerDecisionAction = Extract<
  ProposalVersionAction,
  "accept" | "reject"
>;

export class ProposalLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ProposalLifecycleError";
  }
}

export function transitionProposalVersionStatus(
  status: ProposalVersionStatus,
  action: ProposalVersionAction,
): ProposalVersionStatus {
  const nextStatus = proposalVersionTransitions[status]?.[action];

  if (!nextStatus) {
    throw new ProposalLifecycleError(
      `Action ${action} is not allowed from proposal version status ${status}.`,
      "PROPOSAL_VERSION_TRANSITION_NOT_ALLOWED",
    );
  }

  return nextStatus;
}

export function assertCanCreateProposalVersion(input: {
  existingAcceptedVersion: boolean;
}) {
  if (input.existingAcceptedVersion) {
    throw new ProposalLifecycleError(
      "Accepted proposal versions cannot be changed or replaced.",
      "ACCEPTED_PROPOSAL_VERSION_LOCKED",
    );
  }
}

export interface ProposalFinalTotalInput {
  internalTotalCents: number;
  estimateMinCents: number;
  estimateMaxCents: number;
  finalTotalCents?: number;
  outOfRangeReason?: string | null;
  allowZeroFinalTotal?: boolean;
}

export interface ProposalFinalTotalResult {
  finalTotalCents: MoneyCents;
  isOutOfRange: boolean;
  outOfRangeReason: string | null;
}

export function prepareProposalFinalTotal(
  input: ProposalFinalTotalInput,
): ProposalFinalTotalResult {
  const internalTotalCents = createNonNegativeMoney(input.internalTotalCents);
  const estimateMinCents = createNonNegativeMoney(input.estimateMinCents);
  const estimateMaxCents = createNonNegativeMoney(input.estimateMaxCents);

  if (estimateMinCents > estimateMaxCents) {
    throw new ProposalLifecycleError(
      "Proposal estimate range is invalid.",
      "PROPOSAL_ESTIMATE_RANGE_INVALID",
    );
  }

  const finalTotalCents = createMoneyCents(input.finalTotalCents ?? internalTotalCents);

  if (finalTotalCents < 0) {
    throw new ProposalLifecycleError(
      "Proposal final total cannot be negative.",
      "NEGATIVE_PROPOSAL_FINAL_TOTAL",
    );
  }

  if (finalTotalCents === 0 && input.allowZeroFinalTotal !== true) {
    throw new ProposalLifecycleError(
      "Proposal final total can be zero only for explicitly free services.",
      "ZERO_PROPOSAL_FINAL_TOTAL_NOT_ALLOWED",
    );
  }

  const isOutOfRange =
    finalTotalCents < estimateMinCents || finalTotalCents > estimateMaxCents;
  const outOfRangeReason = input.outOfRangeReason?.trim() || null;

  if (isOutOfRange && !outOfRangeReason) {
    throw new ProposalLifecycleError(
      "Proposal final total outside estimate range requires a reason.",
      "PROPOSAL_OUT_OF_RANGE_REASON_REQUIRED",
    );
  }

  return {
    finalTotalCents,
    isOutOfRange,
    outOfRangeReason: isOutOfRange ? outOfRangeReason : null,
  };
}

export function assertProposalValidityDate(input: { now: Date; validUntil: Date }) {
  if (input.validUntil.getTime() <= input.now.getTime()) {
    throw new ProposalLifecycleError(
      "Proposal validity must be in the future.",
      "PROPOSAL_VALIDITY_NOT_IN_FUTURE",
    );
  }
}

export function isProposalExpired(input: { now: Date; validUntil: Date }) {
  return input.validUntil.getTime() <= input.now.getTime();
}

export function assertCanAcceptProposalVersion(input: {
  status: ProposalVersionStatus;
  now: Date;
  validUntil: Date;
}): ProposalVersionStatus {
  if (isProposalExpired({ now: input.now, validUntil: input.validUntil })) {
    throw new ProposalLifecycleError(
      "Expired proposal versions cannot be accepted.",
      "PROPOSAL_VERSION_EXPIRED",
    );
  }

  return transitionProposalVersionStatus(input.status, "accept");
}

export function assertCanRejectProposalVersion(input: {
  status: ProposalVersionStatus;
}): ProposalVersionStatus {
  return transitionProposalVersionStatus(input.status, "reject");
}

const proposalVersionTransitions: Partial<
  Record<
    ProposalVersionStatus,
    Partial<Record<ProposalVersionAction, ProposalVersionStatus>>
  >
> = {
  draft: {
    send: "sent",
    supersede: "superseded",
  },
  sent: {
    view: "viewed",
    accept: "accepted",
    reject: "rejected",
    expire: "expired",
    supersede: "superseded",
  },
  viewed: {
    accept: "accepted",
    reject: "rejected",
    expire: "expired",
    supersede: "superseded",
  },
  rejected: {
    supersede: "superseded",
  },
  expired: {
    supersede: "superseded",
  },
};

function createNonNegativeMoney(value: number) {
  const cents = createMoneyCents(value);

  if (cents < 0) {
    throw new ProposalLifecycleError(
      "Proposal monetary values must be non-negative.",
      "NEGATIVE_PROPOSAL_MONEY_VALUE",
    );
  }

  return cents;
}
