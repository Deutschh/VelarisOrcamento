import { randomUUID } from "node:crypto";
import type {
  CompanyQuoteRequestEvent,
  CompanyQuoteRequestRevision,
} from "@velaris/shared";

import type {
  CompanyQuoteRequestRepository,
  PersistedCompanyQuoteRequest,
  SaveCompanyQuoteRequestReviewInput,
  TransitionCompanyQuoteRequestInput,
} from "../company/company-quote-request-repository.js";

export class InMemoryCompanyQuoteRequestRepository implements CompanyQuoteRequestRepository {
  readonly requests = new Map<string, PersistedCompanyQuoteRequest>();
  readonly answers = new Map<string, SaveCompanyQuoteRequestReviewInput["answers"]>();

  async listQuoteRequests(input: {
    companyId: string;
  }): Promise<PersistedCompanyQuoteRequest[]> {
    return Array.from(this.requests.values())
      .filter(
        (request) => request.companyId === input.companyId && request.status !== "draft",
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
      );
  }

  async findQuoteRequestByCompanyAndId(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<PersistedCompanyQuoteRequest | null> {
    const request = this.requests.get(input.quoteRequestId);

    if (!request || request.companyId !== input.companyId || request.status === "draft") {
      return null;
    }

    return request;
  }

  async findStoredFile(_input: {
    companyId: string;
    quoteRequestId: string;
    fileId: string;
  }) {
    return null;
  }

  async saveReview(
    input: SaveCompanyQuoteRequestReviewInput,
  ): Promise<PersistedCompanyQuoteRequest> {
    const current = this.mustFind(input.quoteRequestId);

    if (current.companyId !== input.companyId || current.status !== "under_review") {
      throw new Error("Quote request review could not be persisted.");
    }

    this.answers.set(input.quoteRequestId, input.answers);

    const next: PersistedCompanyQuoteRequest = {
      ...current,
      data: input.data,
      revisions: [...input.revisions.map(toRevision), ...current.revisions],
      events: [
        toEvent({
          quoteRequestId: input.quoteRequestId,
          actorUserId: input.actorUserId,
          eventType: "quote_request.review_saved",
          fromStatus: "under_review",
          toStatus: "under_review",
          metadata: input.eventMetadata,
          now: input.now,
        }),
        ...current.events,
      ],
      calculationSnapshot: input.calculationSnapshot,
      internalTotalCents: input.internalTotalCents,
      estimateMinCents: input.estimateMinCents,
      estimateMaxCents: input.estimateMaxCents,
      proposals: current.proposals,
      appointments: current.appointments,
      updatedAt: input.now.toISOString(),
    };

    this.requests.set(next.id, next);
    return next;
  }

  async transitionStatus(
    input: TransitionCompanyQuoteRequestInput,
  ): Promise<PersistedCompanyQuoteRequest> {
    const current = this.mustFind(input.quoteRequestId);

    if (current.companyId !== input.companyId || current.status !== input.fromStatus) {
      throw new Error("Quote request status could not be transitioned.");
    }

    const next: PersistedCompanyQuoteRequest = {
      ...current,
      status: input.toStatus,
      events: [
        toEvent({
          quoteRequestId: input.quoteRequestId,
          actorUserId: input.actorUserId,
          eventType: input.eventType,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          metadata: input.metadata,
          now: input.now,
        }),
        ...current.events,
      ],
      proposals: current.proposals,
      appointments: current.appointments,
      updatedAt: input.now.toISOString(),
    };

    this.requests.set(next.id, next);
    return next;
  }

  private mustFind(id: string) {
    const request = this.requests.get(id);

    if (!request) {
      throw new Error(`Missing company quote request ${id}.`);
    }

    return request;
  }
}

function toRevision(
  input: SaveCompanyQuoteRequestReviewInput["revisions"][number],
): CompanyQuoteRequestRevision {
  return {
    ...input,
    actorUserId: input.actorUserId,
    createdAt: new Date("2026-07-29T13:00:00.000Z").toISOString(),
  };
}

function toEvent(input: {
  quoteRequestId: string;
  actorUserId: string;
  eventType: string;
  fromStatus: CompanyQuoteRequestEvent["fromStatus"];
  toStatus: CompanyQuoteRequestEvent["toStatus"];
  metadata: Record<string, unknown>;
  now: Date;
}): CompanyQuoteRequestEvent {
  return {
    id: randomUUID(),
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorUserId: input.actorUserId,
    metadata: input.metadata,
    createdAt: input.now.toISOString(),
  };
}
