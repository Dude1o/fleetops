import { IsEnum } from 'class-validator';
import { JobStatus } from '../../../generated/prisma/client';

export class UpdateJobStatusDto {
  @IsEnum(JobStatus)
  status: JobStatus;
}
