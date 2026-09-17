import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

import { JobPriority } from '../../../generated/prisma/client';

export class FindAvailableJobsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @IsEnum(JobPriority)
  @IsOptional()
  priority?: JobPriority;
}
