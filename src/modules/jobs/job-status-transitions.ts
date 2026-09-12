import { BadRequestException } from '@nestjs/common';
import { JobStatus } from '../../generated/prisma/client';

export const allowedTransitions: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]: [JobStatus.AVAILABLE, JobStatus.CANCELLED],

  [JobStatus.AVAILABLE]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],

  [JobStatus.ASSIGNED]: [JobStatus.PICKED_UP, JobStatus.CANCELLED],

  [JobStatus.PICKED_UP]: [JobStatus.IN_TRANSIT, JobStatus.CANCELLED],

  [JobStatus.IN_TRANSIT]: [JobStatus.DELIVERED],

  [JobStatus.DELIVERED]: [],

  [JobStatus.CANCELLED]: [],
};

export function validateJobStatusTransition(
  currentStatus: JobStatus,
  nextStatus: JobStatus,
): void {
  if (currentStatus === nextStatus) return;

  const allowedStatuses = allowedTransitions[currentStatus];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new BadRequestException(
      `Job cannot transition from ${currentStatus} to ${nextStatus}`,
    );
  }
}
