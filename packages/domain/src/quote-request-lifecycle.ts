export type QuoteRequestLifecycleStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "awaiting_information"
  | "accepted_for_proposal"
  | "declined_by_company"
  | "cancelled"
  | "archived";

export type QuoteRequestLifecycleAction =
  | "confirm_submit"
  | "open_review"
  | "request_information"
  | "provide_information"
  | "accept_for_proposal"
  | "decline";

export class QuoteRequestLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "QuoteRequestLifecycleError";
  }
}

export function assertDraftQuoteRequest(status: QuoteRequestLifecycleStatus) {
  if (status !== "draft") {
    throw new QuoteRequestLifecycleError(
      "Only draft quote requests can be edited or submitted.",
      "QUOTE_REQUEST_NOT_DRAFT",
    );
  }
}

export function transitionQuoteRequestStatus(
  status: QuoteRequestLifecycleStatus,
  action: QuoteRequestLifecycleAction,
): QuoteRequestLifecycleStatus {
  const nextStatus = quoteRequestTransitions[status]?.[action];

  if (!nextStatus) {
    throw new QuoteRequestLifecycleError(
      `Action ${action} is not allowed from quote request status ${status}.`,
      "QUOTE_REQUEST_TRANSITION_NOT_ALLOWED",
    );
  }

  return nextStatus;
}

const quoteRequestTransitions: Partial<
  Record<
    QuoteRequestLifecycleStatus,
    Partial<Record<QuoteRequestLifecycleAction, QuoteRequestLifecycleStatus>>
  >
> = {
  draft: {
    confirm_submit: "submitted",
  },
  submitted: {
    open_review: "under_review",
  },
  under_review: {
    request_information: "awaiting_information",
    accept_for_proposal: "accepted_for_proposal",
    decline: "declined_by_company",
  },
  awaiting_information: {
    provide_information: "under_review",
  },
};
