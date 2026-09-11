import { JobStatus } from '../../../generated/prisma/client';

export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.PENDING]: [JobStatus.AVAILABLE, JobStatus.CANCELLED],

  [JobStatus.AVAILABLE]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],

  [JobStatus.ASSIGNED]: [
    JobStatus.PICKED_UP,
    JobStatus.AVAILABLE,
    JobStatus.CANCELLED,
  ],

  [JobStatus.PICKED_UP]: [JobStatus.IN_TRANSIT, JobStatus.CANCELLED],

  [JobStatus.IN_TRANSIT]: [JobStatus.DELIVERED],

  [JobStatus.DELIVERED]: [],

  [JobStatus.CANCELLED]: [],
};
