import { IsEnum } from 'class-validator';
import { DriverStatus } from '../../../generated/prisma/client';

export class UpdateDriverStatusDto {
  @IsEnum(DriverStatus)
  status: DriverStatus;
}
