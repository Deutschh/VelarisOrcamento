import { randomUUID } from "node:crypto";
import {
  AppointmentLifecycleError,
  assertAppointmentSchedule,
  assertCanUsePlatformScheduling,
  transitionAppointmentStatus,
} from "@velaris/domain";
import type {
  CompanyAppointmentResponse,
  CompanyProposeAppointmentRequest,
  CompanyUpdateAppointmentRequest,
  CustomerAppointmentActionRequest,
} from "@velaris/shared";
import type {
  CompanyAccountRepository,
  PersistedCompanyAccountStatus,
} from "./company-account-repository.js";
import {
  CompanyAppointmentAccessDeniedError,
  CompanyAppointmentLifecycleApiError,
  CompanyAppointmentNotFoundError,
  CompanyAppointmentProposalNotFoundError,
  CompanyAppointmentValidationError,
} from "./company-appointment-errors.js";
import type {
  CompanyAppointmentRepository,
  PersistedCompanyAppointmentStatus,
} from "./company-appointment-repository.js";
import type {
  CompanyProposalRepository,
  PersistedCompanyProposal,
  PersistedCompanyProposalVersion,
} from "./company-proposal-repository.js";
import type {
  CompanyQuoteRequestRepository,
  PersistedCompanyQuoteRequest,
} from "./company-quote-request-repository.js";

interface CompanyAppointmentServiceDependencies {
  accountRepository: CompanyAccountRepository;
  quoteRequestRepository: CompanyQuoteRequestRepository;
  proposalRepository: CompanyProposalRepository;
  appointmentRepository: CompanyAppointmentRepository;
  now?: () => Date;
}

export class CompanyAppointmentService {
  constructor(private readonly dependencies: CompanyAppointmentServiceDependencies) {}

  async proposeAppointment(
    userId: string,
    quoteId: string,
    input: CompanyProposeAppointmentRequest,
  ): Promise<CompanyAppointmentResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const proposal = await this.findProposal(account.companyId, quoteId);
    const version = getLatestVersion(proposal);

    if (!version) {
      throw new CompanyAppointmentProposalNotFoundError();
    }

    const quoteRequest = await this.findQuoteRequest(
      account.companyId,
      proposal.quoteRequestId,
    );

    this.assertCanSchedule({
      schedulingMode: quoteRequest.serviceSchedulingMode,
      proposalVersionStatus: version.status,
    });

    const now = this.now();
    const schedule = this.prepareSchedule({
      input,
      quoteRequest,
      now,
    });
    const conflictWarning = await this.findConflictWarnings({
      companyId: account.companyId,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
    });
    const appointment = await this.dependencies.appointmentRepository.createAppointment({
      id: randomUUID(),
      quoteId: proposal.id,
      quoteVersionId: version.id,
      quoteRequestId: proposal.quoteRequestId,
      companyId: account.companyId,
      actorUserId: userId,
      schedulingMode: quoteRequest.serviceSchedulingMode,
      proposalVersionStatus: version.status,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      durationMinutes: schedule.durationMinutes,
      timezone: quoteRequest.companyTimezone,
      address: schedule.address,
      addressSnapshot: quoteRequest.data.address,
      notes: schedule.notes,
      conflictWarning,
      now,
    });

    return {
      appointment,
      conflictWarning,
    };
  }

  async updateAppointment(
    userId: string,
    appointmentId: string,
    input: CompanyUpdateAppointmentRequest,
  ): Promise<CompanyAppointmentResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const appointment = await this.findAppointment(account.companyId, appointmentId);
    const now = this.now();

    if (input.action === "cancel") {
      const toStatus = this.transition(appointment.status, "cancel");
      const updated = await this.dependencies.appointmentRepository.updateAppointment({
        appointmentId: appointment.id,
        companyId: account.companyId,
        actorUserId: userId,
        actorType: "company",
        eventType: "appointment.cancelled",
        fromStatus: appointment.status,
        toStatus,
        metadata: {
          reason: input.reason?.trim() || null,
        },
        cancelledAt: now,
        now,
      });

      return {
        appointment: updated,
        conflictWarning: [],
      };
    }

    const quoteRequest = await this.findQuoteRequest(
      account.companyId,
      appointment.quoteRequestId,
    );
    const schedule = this.prepareSchedule({
      input,
      quoteRequest,
      now,
    });
    const conflictWarning = await this.findConflictWarnings({
      companyId: account.companyId,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      excludeAppointmentId: appointment.id,
    });
    const toStatus = this.transition(appointment.status, "propose_new_time");
    const updated = await this.dependencies.appointmentRepository.updateAppointment({
      appointmentId: appointment.id,
      companyId: account.companyId,
      actorUserId: userId,
      actorType: "company",
      eventType: "appointment.rescheduled",
      fromStatus: appointment.status,
      toStatus,
      metadata: {
        startsAt: schedule.startsAt.toISOString(),
        endsAt: schedule.endsAt.toISOString(),
        durationMinutes: schedule.durationMinutes,
        conflictCount: conflictWarning.length,
      },
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      durationMinutes: schedule.durationMinutes,
      address: schedule.address,
      addressSnapshot: quoteRequest.data.address,
      notes: schedule.notes,
      conflictWarning,
      now,
    });

    return {
      appointment: updated,
      conflictWarning,
    };
  }

  async completeAppointment(
    userId: string,
    appointmentId: string,
  ): Promise<CompanyAppointmentResponse> {
    const account = await this.getActiveCompanyAccount(userId);
    const appointment = await this.findAppointment(account.companyId, appointmentId);
    const now = this.now();
    const toStatus = this.transition(appointment.status, "complete");
    const updated = await this.dependencies.appointmentRepository.updateAppointment({
      appointmentId: appointment.id,
      companyId: account.companyId,
      actorUserId: userId,
      actorType: "company",
      eventType: "appointment.completed",
      fromStatus: appointment.status,
      toStatus,
      metadata: {},
      completedAt: now,
      now,
    });

    return {
      appointment: updated,
      conflictWarning: [],
    };
  }

  async recordCustomerAppointmentAction(input: {
    companyId: string;
    appointmentId: string;
    body: CustomerAppointmentActionRequest;
  }): Promise<CompanyAppointmentResponse> {
    const appointment = await this.findAppointment(input.companyId, input.appointmentId);
    const now = this.now();
    const action = input.body.action === "confirm" ? "confirm" : "request_reschedule";
    const toStatus = this.transition(appointment.status, action);
    const updateInput = {
      appointmentId: appointment.id,
      companyId: input.companyId,
      actorUserId: null,
      actorType: "customer" as const,
      eventType:
        input.body.action === "confirm"
          ? "appointment.confirmed_by_customer"
          : "appointment.reschedule_requested_by_customer",
      fromStatus: appointment.status,
      toStatus,
      metadata:
        input.body.action === "request_reschedule"
          ? { reason: input.body.reason?.trim() || null }
          : {},
      now,
    };
    const updated = await this.dependencies.appointmentRepository.updateAppointment(
      input.body.action === "confirm"
        ? {
            ...updateInput,
            confirmedAt: now,
          }
        : updateInput,
    );

    return {
      appointment: updated,
      conflictWarning: [],
    };
  }

  private async getActiveCompanyAccount(
    userId: string,
  ): Promise<PersistedCompanyAccountStatus> {
    const account =
      await this.dependencies.accountRepository.findCompanyAccountByUserId(userId);

    if (!account || account.status !== "active") {
      throw new CompanyAppointmentAccessDeniedError();
    }

    if (!["owner", "manager", "operator"].includes(account.memberRole)) {
      throw new CompanyAppointmentAccessDeniedError();
    }

    return account;
  }

  private async findProposal(companyId: string, quoteId: string) {
    const proposal =
      await this.dependencies.proposalRepository.findProposalByCompanyAndId({
        companyId,
        quoteId,
      });

    if (!proposal) {
      throw new CompanyAppointmentProposalNotFoundError();
    }

    return proposal;
  }

  private async findQuoteRequest(companyId: string, quoteRequestId: string) {
    const quoteRequest =
      await this.dependencies.quoteRequestRepository.findQuoteRequestByCompanyAndId({
        companyId,
        quoteRequestId,
      });

    if (!quoteRequest) {
      throw new CompanyAppointmentNotFoundError();
    }

    return quoteRequest;
  }

  private async findAppointment(companyId: string, appointmentId: string) {
    const appointment =
      await this.dependencies.appointmentRepository.findAppointmentByCompanyAndId({
        companyId,
        appointmentId,
      });

    if (!appointment) {
      throw new CompanyAppointmentNotFoundError();
    }

    return appointment;
  }

  private assertCanSchedule(input: {
    schedulingMode: PersistedCompanyQuoteRequest["serviceSchedulingMode"];
    proposalVersionStatus: PersistedCompanyProposalVersion["status"];
  }) {
    try {
      assertCanUsePlatformScheduling(input);
    } catch (error) {
      throw this.toLifecycleError(error);
    }
  }

  private transition(
    status: PersistedCompanyAppointmentStatus,
    action: Parameters<typeof transitionAppointmentStatus>[1],
  ): PersistedCompanyAppointmentStatus {
    try {
      const toStatus = transitionAppointmentStatus(status, action);

      if (toStatus === "none") {
        throw new CompanyAppointmentLifecycleApiError(
          "Appointment cannot return to none after it exists.",
          "COMPANY_APPOINTMENT_TRANSITION_NOT_ALLOWED",
        );
      }

      return toStatus;
    } catch (error) {
      throw this.toLifecycleError(error);
    }
  }

  private prepareSchedule(input: {
    input:
      | CompanyProposeAppointmentRequest
      | Extract<CompanyUpdateAppointmentRequest, { action: "propose_new_time" }>;
    quoteRequest: PersistedCompanyQuoteRequest;
    now: Date;
  }) {
    const startsAt = new Date(input.input.startsAt);
    const durationMinutes =
      input.input.durationMinutes ??
      input.quoteRequest.serviceEstimatedDurationMinutes ??
      120;
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    if (Number.isNaN(startsAt.getTime())) {
      throw new CompanyAppointmentValidationError(
        "Appointment start time is invalid.",
        "COMPANY_APPOINTMENT_START_INVALID",
      );
    }

    try {
      assertAppointmentSchedule({
        now: input.now,
        startsAt,
        durationMinutes,
      });
    } catch (error) {
      throw this.toLifecycleError(error);
    }

    return {
      startsAt,
      endsAt,
      durationMinutes,
      address:
        input.input.address?.trim() || formatQuoteRequestAddress(input.quoteRequest),
      notes: input.input.notes?.trim() || null,
    };
  }

  private async findConflictWarnings(input: {
    companyId: string;
    startsAt: Date;
    endsAt: Date;
    excludeAppointmentId?: string;
  }) {
    const candidates =
      await this.dependencies.appointmentRepository.listPotentialConflicts({
        companyId: input.companyId,
      });

    return candidates.filter((candidate) => {
      if (candidate.appointmentId === input.excludeAppointmentId) {
        return false;
      }

      const candidateStartsAt = new Date(candidate.startsAt);
      const candidateEndsAt = candidate.endsAt
        ? new Date(candidate.endsAt)
        : candidateStartsAt;

      return candidateStartsAt < input.endsAt && candidateEndsAt > input.startsAt;
    });
  }

  private toLifecycleError(error: unknown) {
    if (error instanceof AppointmentLifecycleError) {
      return new CompanyAppointmentLifecycleApiError(
        error.message,
        `COMPANY_${error.code}`,
      );
    }

    return error;
  }

  private now() {
    return this.dependencies.now?.() ?? new Date();
  }
}

function getLatestVersion(proposal: PersistedCompanyProposal) {
  return proposal.versions
    .slice()
    .sort((left, right) => right.versionNumber - left.versionNumber)[0];
}

function formatQuoteRequestAddress(quoteRequest: PersistedCompanyQuoteRequest) {
  const address = quoteRequest.data.address;

  return (
    address.fullAddress.trim() ||
    [address.street, address.number, address.neighborhood, address.city, address.state]
      .filter(Boolean)
      .join(", ") ||
    null
  );
}
