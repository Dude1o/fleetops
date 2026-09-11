import { DriverStatus } from '../../../generated/prisma/client';

export class DriverResponseDto {
  id: string;
  userId: String;
  status: DriverStatus;
  licenseNumber: string;
  createdAt: Date;
  updatedAt: Date;
}
