import type { JobPriority, JobStatus } from '../../../generated/prisma/client';

export class JobResponseDto {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
