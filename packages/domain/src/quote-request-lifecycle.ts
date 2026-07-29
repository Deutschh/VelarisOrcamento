export type QuoteRequestLifecycleStatus = "draft" | "submitted";

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
