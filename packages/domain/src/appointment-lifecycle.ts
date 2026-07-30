export type AppointmentStatus =
  | "none"
  | "proposed"
  | "confirmed"
  | "reschedule_requested"
  | "rescheduled"
  | "completed"
  | "cancelled";

export type AppointmentAction =
  | "propose"
  | "confirm"
  | "request_reschedule"
  | "propose_new_time"
  | "cancel"
  | "complete";

export type AppointmentSchedulingMode =
  | "required_with_proposal"
  | "optional_with_proposal"
  | "after_proposal_acceptance"
  | "external_only";

export type AppointmentProposalStatus =
  "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "superseded";

export class AppointmentLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AppointmentLifecycleError";
  }
}

export function transitionAppointmentStatus(
  status: AppointmentStatus,
  action: AppointmentAction,
): AppointmentStatus {
  const nextStatus = appointmentTransitions[status]?.[action];

  if (!nextStatus) {
    throw new AppointmentLifecycleError(
      `Action ${action} is not allowed from appointment status ${status}.`,
      "APPOINTMENT_TRANSITION_NOT_ALLOWED",
    );
  }

  return nextStatus;
}

export function assertAppointmentSchedule(input: {
  now: Date;
  startsAt: Date;
  durationMinutes: number;
}) {
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new AppointmentLifecycleError(
      "Appointment duration must be a positive integer.",
      "APPOINTMENT_DURATION_INVALID",
    );
  }

  if (input.startsAt.getTime() <= input.now.getTime()) {
    throw new AppointmentLifecycleError(
      "Appointment start time must be in the future.",
      "APPOINTMENT_START_NOT_IN_FUTURE",
    );
  }
}

export function assertCanUsePlatformScheduling(input: {
  schedulingMode: AppointmentSchedulingMode;
  proposalVersionStatus: AppointmentProposalStatus;
}) {
  if (input.schedulingMode === "external_only") {
    throw new AppointmentLifecycleError(
      "This service uses external scheduling only.",
      "APPOINTMENT_EXTERNAL_ONLY",
    );
  }

  if (
    input.schedulingMode === "after_proposal_acceptance" &&
    input.proposalVersionStatus !== "accepted"
  ) {
    throw new AppointmentLifecycleError(
      "This service can be scheduled only after proposal acceptance.",
      "APPOINTMENT_REQUIRES_ACCEPTED_PROPOSAL",
    );
  }
}

export function requiresAppointmentBeforeProposalSend(
  schedulingMode: AppointmentSchedulingMode,
) {
  return schedulingMode === "required_with_proposal";
}

export function isActiveAppointmentStatus(status: AppointmentStatus) {
  return ["proposed", "confirmed", "rescheduled"].includes(status);
}

const appointmentTransitions: Partial<
  Record<AppointmentStatus, Partial<Record<AppointmentAction, AppointmentStatus>>>
> = {
  none: {
    propose: "proposed",
  },
  proposed: {
    confirm: "confirmed",
    request_reschedule: "reschedule_requested",
    cancel: "cancelled",
  },
  reschedule_requested: {
    propose_new_time: "rescheduled",
    cancel: "cancelled",
  },
  rescheduled: {
    confirm: "confirmed",
    request_reschedule: "reschedule_requested",
    cancel: "cancelled",
  },
  confirmed: {
    complete: "completed",
    cancel: "cancelled",
  },
};
