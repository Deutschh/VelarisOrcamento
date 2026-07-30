import { randomUUID } from "node:crypto";
import type {
  CompanyProposalDetail,
  CompanyProposalEvent,
  CompanyProposalVersion,
} from "@velaris/shared";
import type {
  CompanyProposalRepository,
  CreateProposalVersionInput,
  ProposalSendIdempotencyRecord,
  SendProposalVersionInput,
} from "../company/company-proposal-repository.js";

export class InMemoryCompanyProposalRepository implements CompanyProposalRepository {
  readonly proposals = new Map<string, CompanyProposalDetail>();
  readonly idempotencyRecords = new Map<string, ProposalSendIdempotencyRecord>();

  async findProposalByQuoteRequest(input: {
    companyId: string;
    quoteRequestId: string;
  }): Promise<CompanyProposalDetail | null> {
    return (
      Array.from(this.proposals.values()).find(
        (proposal) =>
          proposal.companyId === input.companyId &&
          proposal.quoteRequestId === input.quoteRequestId,
      ) ?? null
    );
  }

  async findProposalByCompanyAndId(input: {
    companyId: string;
    quoteId: string;
  }): Promise<CompanyProposalDetail | null> {
    const proposal = this.proposals.get(input.quoteId);

    return proposal?.companyId === input.companyId ? proposal : null;
  }

  async createVersion(input: CreateProposalVersionInput): Promise<CompanyProposalDetail> {
    const current = input.hasExistingQuote
      ? this.mustFind(input.quoteId)
      : createEmptyProposal(input);
    const version: CompanyProposalVersion = {
      id: input.versionId,
      quoteId: input.quoteId,
      quoteRequestId: input.quoteRequestId,
      companyId: input.companyId,
      versionNumber: input.versionNumber,
      proposalCode: input.proposalCode,
      status: "draft",
      internalTotalCents: input.internalTotalCents,
      estimateMinCents: input.estimateMinCents,
      estimateMaxCents: input.estimateMaxCents,
      finalTotalCents: input.finalTotalCents,
      outOfRangeReason: input.outOfRangeReason,
      validUntil: input.validUntil.toISOString(),
      terms: input.terms,
      termsVersion: input.termsVersion,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiredAt: null,
      snapshot: input.snapshot,
      items: input.items.map((item) => ({
        ...item,
        quoteVersionId: input.versionId,
        createdAt: input.now.toISOString(),
        updatedAt: input.now.toISOString(),
      })),
      events: [
        createEvent({
          quoteVersionId: input.versionId,
          actorUserId: input.actorUserId,
          eventType: "proposal.version_created",
          fromStatus: null,
          toStatus: "draft",
          metadata: {
            quoteRequestId: input.quoteRequestId,
            proposalCode: input.proposalCode,
            versionNumber: input.versionNumber,
            finalTotalCents: input.finalTotalCents,
            outOfRangeReason: input.outOfRangeReason,
          },
          now: input.now,
        }),
      ],
      createdAt: input.now.toISOString(),
      updatedAt: input.now.toISOString(),
    };
    const proposal = withSummary({
      ...current,
      status: "draft",
      versions: [
        version,
        ...current.versions.map((candidate) =>
          candidate.status === "draft"
            ? { ...candidate, status: "superseded" as const }
            : candidate,
        ),
      ],
      updatedAt: input.now.toISOString(),
    });

    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  async findSendIdempotencyRecord(input: {
    scope: string;
    key: string;
  }): Promise<ProposalSendIdempotencyRecord | null> {
    return (
      this.idempotencyRecords.get(idempotencyRecordKey(input.scope, input.key)) ?? null
    );
  }

  async sendVersion(input: SendProposalVersionInput): Promise<CompanyProposalDetail> {
    const current = this.mustFind(input.quoteId);
    const versions = current.versions.map((version) => {
      if (version.id === input.quoteVersionId) {
        if (version.status !== input.fromStatus) {
          throw new Error("Proposal version could not be sent.");
        }

        return {
          ...version,
          status: input.toStatus,
          sentAt: input.now.toISOString(),
          events: [
            createEvent({
              quoteVersionId: input.quoteVersionId,
              actorUserId: input.actorUserId,
              eventType: "proposal.sent",
              fromStatus: input.fromStatus,
              toStatus: input.toStatus,
              metadata: {
                quoteId: input.quoteId,
              },
              now: input.now,
            }),
            ...version.events,
          ],
          updatedAt: input.now.toISOString(),
        };
      }

      return version.status === "accepted"
        ? version
        : {
            ...version,
            status: "superseded" as const,
            updatedAt: input.now.toISOString(),
          };
    });
    const proposal = withSummary({
      ...current,
      status: input.quoteStatus,
      versions,
      updatedAt: input.now.toISOString(),
    });

    this.idempotencyRecords.set(
      idempotencyRecordKey(input.idempotency.scope, input.idempotency.key),
      {
        ...input.idempotency,
        expiresAt: input.idempotency.expiresAt.toISOString(),
      },
    );
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  private mustFind(id: string) {
    const proposal = this.proposals.get(id);

    if (!proposal) {
      throw new Error(`Missing proposal ${id}.`);
    }

    return proposal;
  }
}

function createEmptyProposal(input: CreateProposalVersionInput): CompanyProposalDetail {
  return withSummary({
    id: input.quoteId,
    quoteRequestId: input.quoteRequestId,
    companyId: input.companyId,
    status: "draft",
    latestVersionId: null,
    latestVersionNumber: null,
    latestProposalCode: null,
    latestVersionStatus: null,
    finalTotalCents: null,
    validUntil: null,
    sentAt: null,
    acceptedQuoteVersionId: null,
    versions: [],
    createdAt: input.now.toISOString(),
    updatedAt: input.now.toISOString(),
  });
}

function withSummary(proposal: CompanyProposalDetail): CompanyProposalDetail {
  const latestVersion = proposal.versions
    .slice()
    .sort((left, right) => right.versionNumber - left.versionNumber)[0];

  return {
    ...proposal,
    latestVersionId: latestVersion?.id ?? null,
    latestVersionNumber: latestVersion?.versionNumber ?? null,
    latestProposalCode: latestVersion?.proposalCode ?? null,
    latestVersionStatus: latestVersion?.status ?? null,
    finalTotalCents: latestVersion?.finalTotalCents ?? null,
    validUntil: latestVersion?.validUntil ?? null,
    sentAt: latestVersion?.sentAt ?? null,
  };
}

function createEvent(input: {
  quoteVersionId: string;
  actorUserId: string;
  eventType: string;
  fromStatus: CompanyProposalEvent["fromStatus"];
  toStatus: CompanyProposalEvent["toStatus"];
  metadata: Record<string, unknown>;
  now: Date;
}): CompanyProposalEvent {
  return {
    id: randomUUID(),
    quoteVersionId: input.quoteVersionId,
    eventType: input.eventType,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    actorUserId: input.actorUserId,
    metadata: input.metadata,
    createdAt: input.now.toISOString(),
  };
}

function idempotencyRecordKey(scope: string, key: string) {
  return `${scope}:${key}`;
}
