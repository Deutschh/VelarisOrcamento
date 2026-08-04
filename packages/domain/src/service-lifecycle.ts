export type ServiceStatus =
  "not_started" | "scheduled" | "in_progress" | "service_realized" | "closed";

export type ServiceAction = "schedule" | "start" | "mark_realized" | "close";

export class ServiceLifecycleError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ServiceLifecycleError";
  }
}

export function transitionServiceStatus(
  status: ServiceStatus,
  action: ServiceAction,
): ServiceStatus {
  const nextStatus = serviceTransitions[status]?.[action];

  if (!nextStatus) {
    throw new ServiceLifecycleError(
      `Action ${action} is not allowed from service status ${status}.`,
      "SERVICE_TRANSITION_NOT_ALLOWED",
    );
  }

  return nextStatus;
}

export function assertCanCreateReview(input: {
  proposalAccepted: boolean;
  appointmentConfirmed: boolean;
  serviceStatus: ServiceStatus;
  alreadyReviewed: boolean;
}) {
  if (!input.proposalAccepted) {
    throw new ServiceLifecycleError(
      "Review requires an accepted proposal.",
      "REVIEW_REQUIRES_ACCEPTED_PROPOSAL",
    );
  }

  if (!input.appointmentConfirmed) {
    throw new ServiceLifecycleError(
      "Review requires a confirmed appointment.",
      "REVIEW_REQUIRES_CONFIRMED_APPOINTMENT",
    );
  }

  if (input.serviceStatus !== "service_realized") {
    throw new ServiceLifecycleError(
      "Review requires a realized service.",
      "REVIEW_REQUIRES_REALIZED_SERVICE",
    );
  }

  if (input.alreadyReviewed) {
    throw new ServiceLifecycleError(
      "Review already exists for this service.",
      "REVIEW_ALREADY_EXISTS",
    );
  }
}

const serviceTransitions: Partial<
  Record<ServiceStatus, Partial<Record<ServiceAction, ServiceStatus>>>
> = {
  not_started: {
    schedule: "scheduled",
  },
  scheduled: {
    start: "in_progress",
    mark_realized: "service_realized",
  },
  in_progress: {
    mark_realized: "service_realized",
  },
  service_realized: {
    close: "closed",
  },
};
